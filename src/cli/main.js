import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { loadAndValidateHandoff } from "../handoff/validate.js";
import { publicInspection, inspectProject } from "../inspection/inspect-project.js";
import { createPlan, publicPlan } from "../planning/create-plan.js";
import { applyApprovedPlan } from "../planning/apply-plan.js";
import { verifyProject } from "../verification/verify-project.js";
import { listAvailableModules } from "../modules/registry.js";
import { fingerprintPortableBundle } from "../modules/bundle.js";
import { DEFAULT_MODULE_CACHE, importPortableModule } from "../modules/cache.js";
import {
  applyModulePlan,
  createModulePlan,
  inspectModule,
  listInstalledModules,
  publicModulePlan,
  verifyProjectModules
} from "../modules/lifecycle.js";
import { coreUpdateGuide } from "../updates/core-update.js";
import { loadInstallationContract } from "../installation/contract.js";
import { verifyInstallation } from "../installation/verify.js";
import { loadMetadata } from "../core/metadata.js";
import {
  INSTALLATION_CONTRACT_PATH,
  MODULE_MANIFEST_PATH,
  PACKAGE_PATH,
  REGISTRY_PATH,
  ROOT_DIR,
  SOURCE_MANIFEST_PATH
} from "../core/constants.js";

const HELP = `KontextStack — local-first ContextKraft handoff toolkit

Usage:
  kontextstack about
  kontextstack doctor
  kontextstack install contract --mode <simple|mature>
  kontextstack install verify --mode <simple|mature>
  kontextstack validate --handoff <file>
  kontextstack inspect --project <directory>
  kontextstack preview --project <directory> --handoff <file>
  kontextstack apply --project <directory> --handoff <file> --approve <preview-id>
  kontextstack verify --project <directory>
  kontextstack modules available [--cache <directory>]
  kontextstack modules installed --project <directory>
  kontextstack modules inspect --module <name> [--version <version>] [--project <directory>] [--cache <directory>]
  kontextstack modules fingerprint --from <directory>
  kontextstack modules import --from <directory> [--cache <directory>]
  kontextstack modules preview --project <directory> --module <name> [--version <version>] [--cache <directory>]
  kontextstack modules apply --project <directory> --module <name> --approve <preview-id> [--version <version>] [--cache <directory>]
  kontextstack modules verify --project <directory>
  kontextstack update guide --mode <simple|mature>

Preview is read-only. Apply writes only the exact project-owned handoff files
listed in the approved preview. KontextStack does not commit, push, or deploy.
Installation verification is also read-only and never changes Git remotes.
`;

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}.`);
    flags[key] = value;
    index += 1;
  }
  return { positionals, flags };
}

function requireFlag(flags, name) {
  if (!flags[name]) throw new Error(`--${name} is required.`);
  return flags[name];
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function pathCheck(label, filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return { label, ok: true };
  } catch {
    return { label, ok: false, reason: "missing or unreadable" };
  }
}

async function doctor() {
  const major = Number(process.versions.node.split(".")[0]);
  const checks = [
    { label: "Node.js 20 or newer", ok: major >= 20, actual: process.versions.node },
    await pathCheck("package metadata", PACKAGE_PATH),
    await pathCheck("source manifest", SOURCE_MANIFEST_PATH),
    await pathCheck("installation contract", INSTALLATION_CONTRACT_PATH),
    await pathCheck("module registry", REGISTRY_PATH),
    await pathCheck("handoff-core manifest", MODULE_MANIFEST_PATH),
    await pathCheck("legacy handoff schema", path.join(ROOT_DIR, "schemas", "handoff", "v1.json")),
    await pathCheck("current handoff schema", path.join(ROOT_DIR, "schemas", "handoff", "v2.json")),
    await pathCheck("installation schema", path.join(ROOT_DIR, "schemas", "installation", "v1.json")),
    await pathCheck("module lock schema", path.join(ROOT_DIR, "schemas", "module", "lock-v1.json"))
  ];
  const registry = await listAvailableModules();
  checks.push({
    label: "bundled module integrity",
    ok: registry.modules.every((module) => /^sha256-[a-f0-9]{64}$/.test(module.integrity) && !module.integrity.endsWith("0".repeat(64)))
  });
  return { healthy: checks.every((check) => check.ok), checks };
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const [command, subcommand] = positionals;

  if (!command || command === "help" || command === "--help") {
    process.stdout.write(HELP);
    return;
  }

  if (command === "about") {
    output(await loadMetadata());
    return;
  }

  if (command === "doctor") {
    const result = await doctor();
    output(result);
    if (!result.healthy) process.exitCode = 1;
    return;
  }

  if (command === "install" && subcommand === "contract") {
    output(await loadInstallationContract(flags.mode ?? "simple"));
    return;
  }

  if (command === "install" && subcommand === "verify") {
    const result = await verifyInstallation({ mode: flags.mode ?? "simple" });
    output(result);
    if (!result.valid) process.exitCode = 1;
    return;
  }

  if (command === "validate") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output({ valid: true, artifactId: handoff.artifactId, contentHash: handoff.contentHash, schemaVersion: handoff.schemaVersion });
    return;
  }

  if (command === "inspect") {
    output(publicInspection(await inspectProject(requireFlag(flags, "project"))));
    return;
  }

  if (command === "preview") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output(publicPlan(await createPlan({ projectPath: requireFlag(flags, "project"), handoff })));
    return;
  }

  if (command === "apply") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output(await applyApprovedPlan({
      projectPath: requireFlag(flags, "project"),
      handoff,
      approval: requireFlag(flags, "approve")
    }));
    return;
  }

  if (command === "verify") {
    const result = await verifyProject(requireFlag(flags, "project"));
    output(result);
    if (!result.valid) process.exitCode = 1;
    return;
  }

  if (command === "modules" && subcommand === "available") {
    output(await listAvailableModules({ cacheDir: flags.cache ?? DEFAULT_MODULE_CACHE }));
    return;
  }

  if (command === "modules" && subcommand === "installed") {
    output(await listInstalledModules(requireFlag(flags, "project")));
    return;
  }

  if (command === "modules" && subcommand === "inspect") {
    output(await inspectModule({
      name: requireFlag(flags, "module"),
      version: flags.version ?? null,
      projectPath: flags.project ?? null,
      cacheDir: flags.cache ?? DEFAULT_MODULE_CACHE
    }));
    return;
  }

  if (command === "modules" && subcommand === "fingerprint") {
    output(await fingerprintPortableBundle(requireFlag(flags, "from")));
    return;
  }

  if (command === "modules" && subcommand === "import") {
    output(await importPortableModule({
      sourcePath: requireFlag(flags, "from"),
      cacheDir: flags.cache ?? DEFAULT_MODULE_CACHE
    }));
    return;
  }

  if (command === "modules" && subcommand === "preview") {
    output(publicModulePlan(await createModulePlan({
      projectPath: requireFlag(flags, "project"),
      name: requireFlag(flags, "module"),
      version: flags.version ?? null,
      cacheDir: flags.cache ?? DEFAULT_MODULE_CACHE
    })));
    return;
  }

  if (command === "modules" && subcommand === "apply") {
    output(await applyModulePlan({
      projectPath: requireFlag(flags, "project"),
      name: requireFlag(flags, "module"),
      approval: requireFlag(flags, "approve"),
      version: flags.version ?? null,
      cacheDir: flags.cache ?? DEFAULT_MODULE_CACHE
    }));
    return;
  }

  if (command === "modules" && subcommand === "verify") {
    const result = await verifyProjectModules(requireFlag(flags, "project"));
    output(result);
    if (!result.valid) process.exitCode = 1;
    return;
  }

  if (command === "modules" && subcommand === "refresh") {
    throw new Error("Remote registry refresh is not available in 0.1.0-alpha.1; the bundled registry remains active.");
  }

  if (command === "update" && subcommand === "guide") {
    output(coreUpdateGuide(flags.mode ?? "simple"));
    return;
  }

  throw new Error(`Unknown command: ${positionals.join(" ")}. Run kontextstack help.`);
}
