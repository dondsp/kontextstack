import path from "node:path";
import { lstat, readFile } from "node:fs/promises";
import { CANONICAL_SOURCE } from "../core/constants.js";
import { integrity } from "../core/json.js";
import { safeTargetPath, validateRelativeTarget } from "../core/paths.js";

export const MODULE_LOCK_PATH = ".kontextstack/modules.lock.json";
const INTEGRITY_PATTERN = /^sha256-[a-f0-9]{64}$/;

export async function loadModuleLock(projectRoot) {
  const lockPath = await safeTargetPath(projectRoot, MODULE_LOCK_PATH);
  const details = await lstat(lockPath).catch((error) => {
    if (error.code === "ENOENT") throw new Error("Project is not initialized: run the handoff-core flow before adding modules.");
    throw error;
  });
  if (!details.isFile() || details.isSymbolicLink()) throw new Error("Project module lock must be a regular file.");
  let lock;
  let raw;
  try {
    raw = await readFile(lockPath, "utf8");
    lock = JSON.parse(raw);
  } catch {
    throw new Error("Project module lock is invalid or unreadable.");
  }
  if (lock.schemaVersion !== "1.0.0" || lock.core?.source !== CANONICAL_SOURCE || !Array.isArray(lock.modules)) {
    throw new Error("Project module lock does not match the KontextStack v1 contract.");
  }
  return { path: lockPath, raw, value: lock, integrity: integrity(raw) };
}

export function normalizeLockedFiles(record) {
  if (!Array.isArray(record.files)) return [];
  return record.files.map((file) => {
    if (typeof file === "string") return { path: validateRelativeTarget(file), integrity: null, legacy: true };
    if (!file || typeof file.path !== "string") throw new Error(`Invalid locked file record for ${record.name}.`);
    return {
      path: validateRelativeTarget(file.path),
      integrity: typeof file.integrity === "string" ? file.integrity : null,
      legacy: false
    };
  });
}

export function installedModules(lock) {
  return lock.modules.map((record) => {
    const files = normalizeLockedFiles(record);
    return {
      name: record.name,
      version: record.version,
      source: record.source,
      integrity: record.integrity,
      sourceCommit: record.sourceCommit ?? null,
      history: record.history ?? [],
      appliedFromPreview: record.appliedFromPreview ?? null,
      files,
      exactFileIntegrity: files.length > 0 && files.every((file) => Boolean(file.integrity))
    };
  });
}

export function fileOwnership(lock) {
  const ownership = new Map();
  for (const record of lock.modules) {
    for (const file of normalizeLockedFiles(record)) {
      if (!ownership.has(file.path)) ownership.set(file.path, []);
      ownership.get(file.path).push({ module: record.name, version: record.version, integrity: file.integrity });
    }
  }
  return ownership;
}

export async function verifyLockedModules(projectRoot, lock) {
  const checks = [];
  for (const record of lock.modules) {
    const provenanceOk = (
      record.source === CANONICAL_SOURCE &&
      typeof record.version === "string" &&
      INTEGRITY_PATTERN.test(record.integrity ?? "")
    );
    checks.push({
      module: record.name,
      path: null,
      ok: provenanceOk,
      reason: provenanceOk ? null : "Module provenance is invalid."
    });

    for (const file of normalizeLockedFiles(record)) {
      try {
        const destination = await safeTargetPath(projectRoot, file.path);
        const details = await lstat(destination);
        if (!details.isFile() || details.isSymbolicLink()) throw new Error("not a regular file");
        const content = await readFile(destination, "utf8");
        const ok = file.integrity ? integrity(content) === file.integrity : content.includes(CANONICAL_SOURCE);
        checks.push({
          module: record.name,
          path: file.path,
          ok,
          reason: ok ? null : file.integrity ? "File differs from its locked integrity." : "Legacy file is missing canonical provenance."
        });
      } catch {
        checks.push({ module: record.name, path: file.path, ok: false, reason: "File is missing, unreadable, or unsafe." });
      }
    }
  }
  return { valid: checks.every((entry) => entry.ok), checks };
}
