import path from "node:path";
import { lstat, readFile, realpath } from "node:fs/promises";
import { CANONICAL_SOURCE } from "../core/constants.js";
import { integrity, stableStringify } from "../core/json.js";
import { assertNoSecretValues } from "../core/safety.js";
import { validateRelativeTarget } from "../core/paths.js";
import { satisfiesRange } from "../core/semver.js";
import { assertContractPath, assertKitContent, validateModuleContracts } from "./contracts.js";
import { validateSelectionDeclaration } from './selection.js';

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const INTEGRITY_PATTERN = /^sha256-[a-f0-9]{64}$/;

function portableRoots(name) {
  return [
    `.kontextstack/modules/${name}/`,
    `docs/kontextstack/modules/${name}/`
  ];
}

function assertManifestShape(manifest) {
  if (manifest?.schemaVersion !== "1.0.0") throw new Error("Module manifest schemaVersion must be 1.0.0.");
  if (!NAME_PATTERN.test(manifest.name ?? "")) throw new Error("Module name is invalid.");
  if (!VERSION_PATTERN.test(manifest.version ?? "")) throw new Error("Module version is invalid.");
  if (manifest.source?.repository !== CANONICAL_SOURCE) throw new Error("Module source must be the canonical KontextStack repository.");
  if (typeof manifest.source?.ref !== "string" || !manifest.source.ref) throw new Error("Module source ref is required.");
  if (manifest.source?.path !== `modules/${manifest.name}`) throw new Error("Module source path must match its module name.");
  if (!INTEGRITY_PATTERN.test(manifest.source?.integrity ?? "")) throw new Error("Module integrity must be an exact sha256 identity.");
  if (manifest.permissions?.network !== false) throw new Error("Portable modules may not request network access.");
  if (!Array.isArray(manifest.permissions?.commands) || manifest.permissions.commands.length) {
    throw new Error("Portable modules may not execute commands.");
  }
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error("Portable modules must declare at least one file.");
  if (!Array.isArray(manifest.permissions?.writePatterns)) throw new Error("Module writePatterns are required.");
  if (
    !Array.isArray(manifest.dependencies) ||
    !Array.isArray(manifest.optionalDependencies) ||
    !Array.isArray(manifest.conflicts)
  ) throw new Error("Module dependency and conflict lists are required.");
  if (!Array.isArray(manifest.projectTypes) || !manifest.projectTypes.length) throw new Error("Module projectTypes are required.");
  if (typeof manifest.coreCompatibility !== "string" || !manifest.coreCompatibility.trim()) throw new Error("Module coreCompatibility is required.");
  try {
    satisfiesRange("0.1.0-alpha.1", manifest.coreCompatibility);
  } catch {
    throw new Error("Module coreCompatibility is not a supported semantic version range.");
  }
  if (!manifest.upgrade || !Array.isArray(manifest.upgrade.from) || manifest.upgrade.strategy !== "preview-required") {
    throw new Error("Portable modules require an explicit preview-required upgrade contract.");
  }
}

function validatePortableEntry(manifest, entry) {
  if (!entry || typeof entry.path !== "string" || typeof entry.source !== "string") {
    throw new Error("Portable module files require path and source fields.");
  }
  const target = validateRelativeTarget(entry.path);
  const source = validateRelativeTarget(entry.source);
  assertContractPath(entry.path);
  assertContractPath(entry.source);
  for (const segment of target.split("/")) {
    if ((/^\.env(?:\.|$)/i.test(segment) && segment !== ".env.example") ||
        /^(?:uploads|dumps|id_rsa)$|\.(?:pem|key)$/i.test(segment)) {
      throw new Error("Module target uses a protected filename.");
    }
  }
  if (!portableRoots(manifest.name).some((root) => target.startsWith(root))) {
    throw new Error(`Portable module target is outside its owned namespace: ${target}.`);
  }
  if (!source.startsWith("files/")) throw new Error(`Portable module source must stay inside files/: ${source}.`);
  if (!manifest.permissions.writePatterns.includes(target)) {
    throw new Error(`Module target is missing from writePatterns: ${target}.`);
  }
  return { target, source };
}

async function readPortableFile(bundleRoot, source) {
  const absolute = path.resolve(bundleRoot, source);
  const relative = path.relative(bundleRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Module source escapes its bundle root.");
  let cursor = path.resolve(bundleRoot);
  for (const segment of source.split(path.sep).slice(0, -1)) {
    cursor = path.join(cursor, segment);
    const ancestor = await lstat(cursor);
    if (ancestor.isSymbolicLink()) throw new Error(`Module source ancestor is a symbolic link: ${source}.`);
  }
  const realRoot = await realpath(bundleRoot);
  const realSource = await realpath(absolute);
  const realRelative = path.relative(realRoot, realSource);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new Error("Module source resolves outside its bundle root.");
  const details = await lstat(absolute);
  if (!details.isFile() || details.isSymbolicLink()) throw new Error(`Module source is not a regular file: ${source}.`);
  if (details.size > 1_000_000) throw new Error(`Module source exceeds the 1 MB limit: ${source}.`);
  const content = await readFile(absolute, "utf8");
  if (content.includes("\0")) throw new Error(`Binary module sources are not supported: ${source}.`);
  try {
    assertNoSecretValues({ moduleFile: content });
    assertKitContent(content);
  } catch {
    throw new Error(`Module source contains a protected secret-like value: ${source}.`);
  }
  return content;
}

export async function loadPortableBundle(bundleRoot, { verifyIntegrity = true } = {}) {
  let manifest;
  try { manifest = JSON.parse(await readPortableFile(bundleRoot, "module.json")); }
  catch { throw new Error("Module manifest is unreadable, unsafe, or contains a protected value."); }
  assertNoSecretValues(manifest);
  assertManifestShape(manifest);
  validateSelectionDeclaration(manifest);

  const seenTargets = new Set();
  const files = [];
  for (const entry of manifest.files) {
    const normalized = validatePortableEntry(manifest, entry);
    if (seenTargets.has(normalized.target)) throw new Error(`Duplicate module target: ${normalized.target}.`);
    seenTargets.add(normalized.target);
    const content = await readPortableFile(bundleRoot, normalized.source);
    files.push({ ...normalized, content, integrity: integrity(content) });
  }

  if (manifest.permissions.writePatterns.length !== files.length) {
    throw new Error("Every writePattern must correspond to exactly one portable module file.");
  }

  let guideContent = null;
  try { guideContent = await readPortableFile(bundleRoot, "guide.json"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const contracts = validateModuleContracts({ manifest, files, guideContent });
  const metadataFiles = guideContent === null ? [] : [{ source: "guide.json", content: guideContent, integrity: integrity(guideContent) }];

  const manifestForHash = structuredClone(manifest);
  delete manifestForHash.source.integrity;
  const computedIntegrity = integrity(stableStringify({
    manifest: manifestForHash,
    files: files.map((file) => ({ source: file.source, target: file.target, integrity: file.integrity })),
    ...(contracts ? { contracts: metadataFiles.map(({ source, integrity }) => ({ source, integrity })) } : {})
  }));
  if (verifyIntegrity && manifest.source.integrity !== computedIntegrity) {
    throw new Error(`Module integrity mismatch for ${manifest.name}@${manifest.version}.`);
  }

  return { root: bundleRoot, manifest, files, metadataFiles, contracts, computedIntegrity, portable: true };
}

export async function fingerprintPortableBundle(bundleRoot) {
  const bundle = await loadPortableBundle(bundleRoot, { verifyIntegrity: false });
  return {
    name: bundle.manifest.name,
    version: bundle.manifest.version,
    integrity: bundle.computedIntegrity
  };
}
