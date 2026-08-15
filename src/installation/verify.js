import path from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { parseGitHubRepository, runGit } from "../core/git.js";
import { readJson } from "../core/json.js";
import {
  CANONICAL_SOURCE,
  INSTALLATION_CONTRACT_PATH,
  MODULE_MANIFEST_PATH,
  PACKAGE_PATH,
  REGISTRY_PATH,
  ROOT_DIR,
  SOURCE_MANIFEST_PATH
} from "../core/constants.js";
import { loadInstallationContract, normalizeInstallationMode } from "./contract.js";

const CANONICAL_REPOSITORY = "dondsp/kontextstack";

function check(id, label, ok, { required = true, actual = null, reason = null } = {}) {
  return { id, label, ok, required, actual, reason: ok ? null : reason };
}

async function readable(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function allReadable(rootDir, relativePaths) {
  const results = await Promise.all(relativePaths.map((entry) => readable(path.join(rootDir, entry))));
  return results.every(Boolean);
}

export function parseGitRemotes(output = "") {
  const remotes = [];
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    remotes.push({
      name: match[1],
      url: match[2],
      direction: match[3],
      repository: parseGitHubRepository(match[2])
    });
  }
  return remotes;
}

export function canonicalRemoteTrace(remotes) {
  const match = remotes.find((remote) => remote.repository?.toLowerCase() === CANONICAL_REPOSITORY);
  return match ? { traceable: true, remote: match.name, url: match.url } : { traceable: false, remote: null, url: null };
}

async function loadJsonCheck(filePath, predicate) {
  try {
    const value = await readJson(filePath);
    return { ok: predicate(value), value };
  } catch {
    return { ok: false, value: null };
  }
}

async function bundledModuleIntegrity(rootDir) {
  try {
    const registry = await readJson(path.join(rootDir, "registry", "index.json"));
    if (registry.canonicalSource !== CANONICAL_SOURCE || !registry.modules?.length) return false;

    for (const entry of registry.modules) {
      if (!entry.versions?.length) return false;
      for (const version of entry.versions) {
        if (!/^sha256-[a-f0-9]{64}$/.test(version.integrity)) return false;
        const manifest = await readJson(path.join(rootDir, version.manifestPath));
        if (
          manifest.name !== entry.name ||
          manifest.version !== version.version ||
          manifest.source?.repository !== CANONICAL_SOURCE ||
          manifest.source?.integrity !== version.integrity
        ) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function verifyInstallation({ mode = "simple", rootDir = ROOT_DIR } = {}) {
  const selectedMode = normalizeInstallationMode(mode);
  const contract = await loadInstallationContract(selectedMode);
  const checks = [];
  const minimumNodeMajor = contract.minimumNodeMajor;
  const nodeMajor = Number(process.versions.node.split(".")[0]);

  checks.push(check(
    "node-version",
    `Node.js ${minimumNodeMajor} or newer`,
    Number.isInteger(nodeMajor) && nodeMajor >= minimumNodeMajor,
    { actual: process.versions.node, reason: `Install Node.js ${minimumNodeMajor} or newer.` }
  ));

  const packageResult = await loadJsonCheck(path.join(rootDir, path.relative(ROOT_DIR, PACKAGE_PATH)), (value) => (
    value.name === "@dondsp/kontextstack" &&
    parseGitHubRepository(value.repository?.url) === CANONICAL_REPOSITORY
  ));
  checks.push(check(
    "package-source",
    "Package metadata points to the canonical source",
    packageResult.ok,
    { reason: "package.json is missing, invalid, or does not point to dondsp/kontextstack." }
  ));

  const sourceResult = await loadJsonCheck(path.join(rootDir, path.relative(ROOT_DIR, SOURCE_MANIFEST_PATH)), (value) => (
    value.canonicalRepository === CANONICAL_SOURCE &&
    value.maintainer?.github === "dondsp" &&
    value.license === "Apache-2.0"
  ));
  checks.push(check(
    "source-manifest",
    "Machine-readable source and maintainer identity",
    sourceResult.ok,
    { reason: "kontextstack.source.json is missing, invalid, or no longer identifies the canonical source." }
  ));

  const attributionFiles = sourceResult.value?.attributionFiles ?? [];
  const attributionOk = attributionFiles.length >= 4 && await allReadable(rootDir, attributionFiles);
  checks.push(check(
    "attribution-files",
    "License, notice, citation and source attribution are readable",
    attributionOk,
    { reason: "One or more required attribution files are missing or unreadable." }
  ));

  const requiredCoreFiles = [
    path.relative(ROOT_DIR, INSTALLATION_CONTRACT_PATH),
    path.relative(ROOT_DIR, REGISTRY_PATH),
    path.relative(ROOT_DIR, MODULE_MANIFEST_PATH),
    "schemas/handoff/v1.json",
    "schemas/installation/v1.json",
    "schemas/module/lock-v1.json",
    "bin/kontextstack.js",
    "package-lock.json"
  ];
  checks.push(check(
    "core-files",
    "Installation contract, CLI, lockfile, registry, module and schemas are readable",
    await allReadable(rootDir, requiredCoreFiles),
    { reason: "The clone is incomplete. Restore it from the canonical repository." }
  ));

  checks.push(check(
    "module-integrity",
    "Bundled modules retain canonical source and integrity identities",
    await bundledModuleIntegrity(rootDir),
    { reason: "The bundled registry or module provenance is invalid." }
  ));

  const gitRoot = runGit(rootDir, ["rev-parse", "--show-toplevel"]);
  const isRepositoryClone = gitRoot ? path.resolve(gitRoot) === path.resolve(rootDir) : false;
  checks.push(check(
    "git-clone",
    "KontextStack is running from its own Git clone",
    isRepositoryClone,
    { reason: "Use the official git clone command instead of an untraceable copied folder or archive." }
  ));

  const remotes = parseGitRemotes(runGit(rootDir, ["remote", "-v"]) ?? "");
  const sourceTrace = canonicalRemoteTrace(remotes);
  checks.push(check(
    "canonical-remote",
    "A Git remote traces back to dondsp/kontextstack",
    sourceTrace.traceable,
    { actual: sourceTrace.remote, reason: "Add the canonical repository as origin or upstream." }
  ));

  const commit = runGit(rootDir, ["rev-parse", "HEAD"]);
  const branch = runGit(rootDir, ["branch", "--show-current"]);
  const dirty = runGit(rootDir, ["status", "--porcelain"]);
  checks.push(check(
    "exact-checkout",
    "The installed core has an exact Git commit identity",
    Boolean(commit),
    { actual: commit, reason: "The current KontextStack commit could not be identified." }
  ));

  if (selectedMode === "mature") {
    const operationalFiles = [
      "CONTRIBUTING.md",
      "SECURITY.md",
      ".github/CODEOWNERS",
      ".github/workflows/ci.yml",
      ".github/workflows/release-check.yml",
      "docs/module-authoring/README.md",
      "scripts/audit-source.js"
    ];
    checks.push(check(
      "extended-operations",
      "Maintainer, security, CI, release and module-authoring records are readable",
      await allReadable(rootDir, operationalFiles),
      { reason: "The mature installation profile requires the complete operational record set." }
    ));
    checks.push(check(
      "clean-checkout",
      "The KontextStack checkout is clean and ready for controlled updates",
      dirty === "",
      {
        required: false,
        actual: dirty === "" ? "clean" : "modified",
        reason: "Local changes are allowed, but review or commit them before fetching KontextStack updates."
      }
    ));
  }

  const requiredChecks = checks.filter((entry) => entry.required);
  const suggestions = [];
  if (!sourceTrace.traceable) {
    const upstreamExists = remotes.some((remote) => remote.name === "upstream");
    suggestions.push(upstreamExists
      ? `git remote set-url upstream ${contract.cloneUrl}`
      : `git remote add upstream ${contract.cloneUrl}`);
  }
  if (!isRepositoryClone) suggestions.push(...contract.commands.slice(0, 3));

  return {
    schemaVersion: contract.schemaVersion,
    valid: requiredChecks.every((entry) => entry.ok),
    mode: selectedMode,
    profile: contract.profile.verificationProfile,
    source: {
      canonical: contract.canonicalSource,
      traceable: sourceTrace.traceable,
      remote: sourceTrace.remote,
      commit,
      branch: branch || null,
      dirty: dirty === null ? null : dirty !== ""
    },
    checks,
    suggestions
  };
}
