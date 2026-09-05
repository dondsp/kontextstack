import path from "node:path";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { CANONICAL_SOURCE } from "../core/constants.js";
import { integrity, stableStringify } from "../core/json.js";
import { safeTargetPath } from "../core/paths.js";
import { satisfiesRange } from "../core/semver.js";
import { inspectProject } from "../inspection/inspect-project.js";
import { loadMetadata } from "../core/metadata.js";
import { DEFAULT_MODULE_CACHE } from "./cache.js";
import { resolveModule } from "./registry.js";
import {
  MODULE_LOCK_PATH,
  fileOwnership,
  installedModules,
  loadModuleLock,
  normalizeLockedFiles,
  verifyLockedModules
} from "./lock.js";

async function classifyModuleTarget({ projectRoot, file, owner, installedRecord }) {
  const destination = await safeTargetPath(projectRoot, file.target);
  if (owner?.some((entry) => entry.module !== installedRecord?.name)) {
    return { target: file.target, action: "conflict", reason: "Target is owned by another installed module." };
  }
  try {
    const details = await lstat(destination);
    if (!details.isFile() || details.isSymbolicLink()) {
      return { target: file.target, action: "block", reason: "Target exists but is not a regular file." };
    }
    const existing = await readFile(destination, "utf8");
    if (existing === file.content) return { target: file.target, action: "preserve", integrity: file.integrity };
    const previous = installedRecord
      ? normalizeLockedFiles(installedRecord).find((entry) => entry.path === file.target)
      : null;
    if (previous?.integrity && integrity(existing) === previous.integrity) {
      return { target: file.target, action: "update", fromIntegrity: previous.integrity, integrity: file.integrity };
    }
    return {
      target: file.target,
      action: "conflict",
      reason: previous ? "Installed module file was customized after apply." : "Target already exists and is not owned by this module."
    };
  } catch (error) {
    if (error.code === "ENOENT") return { target: file.target, action: "add", integrity: file.integrity };
    throw error;
  }
}

function dependencyName(value) {
  return String(value).split("@")[0];
}

function moduleSummary(bundle, coreVersion, projectType = null) {
  const manifest = bundle.manifest;
  return {
    name: manifest.name,
    displayName: manifest.displayName,
    version: manifest.version,
    description: manifest.description,
    category: manifest.category,
    portable: bundle.portable,
    source: manifest.source.repository,
    integrity: bundle.computedIntegrity,
    coreCompatibility: manifest.coreCompatibility,
    coreCompatible: satisfiesRange(coreVersion, manifest.coreCompatibility),
    projectTypes: manifest.projectTypes,
    projectCompatible: projectType ? manifest.projectTypes.includes(projectType) : null,
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    conflicts: manifest.conflicts,
    implementationKit: bundle.contracts ? {
      schemaVersion: bundle.contracts.implementation.schemaVersion,
      path: manifest.contracts.implementation,
      sources: bundle.contracts.implementation.sources,
      projectChanges: bundle.contracts.implementation.projectChanges,
      externalActions: bundle.contracts.implementation.externalActions,
      approvalGates: bundle.contracts.implementation.approvalGates,
      acceptance: bundle.contracts.implementation.acceptance
    } : null,
    guide: bundle.contracts?.guide ?? null,
    permissions: manifest.permissions,
    files: manifest.files.map((file) => ({ path: file.path, source: file.source ?? null, template: file.template ?? null }))
  };
}

export async function inspectModule({ name, version = null, cacheDir = DEFAULT_MODULE_CACHE, projectPath = null }) {
  const metadata = await loadMetadata();
  const bundle = await resolveModule({ name, version, cacheDir });
  const snapshot = projectPath ? await inspectProject(projectPath) : null;
  return {
    module: moduleSummary(bundle, metadata.version, snapshot?.projectType ?? null),
    project: snapshot ? {
      root: snapshot.root,
      type: snapshot.projectType,
      repository: snapshot.git.remoteRepository,
      branch: snapshot.git.branch,
      commit: snapshot.git.commit,
      dirty: snapshot.git.dirty
    } : null
  };
}

export async function listInstalledModules(projectPath) {
  const snapshot = await inspectProject(projectPath);
  const lock = await loadModuleLock(snapshot.root);
  return {
    schemaVersion: lock.value.schemaVersion,
    project: {
      root: snapshot.root,
      repository: snapshot.git.remoteRepository,
      branch: snapshot.git.branch,
      commit: snapshot.git.commit,
      dirty: snapshot.git.dirty
    },
    core: lock.value.core,
    modules: installedModules(lock.value)
  };
}

export async function createModulePlan({ projectPath, name, version = null, cacheDir = DEFAULT_MODULE_CACHE }) {
  const [snapshot, metadata] = await Promise.all([inspectProject(projectPath), loadMetadata()]);
  const bundle = await resolveModule({
    name,
    version,
    cacheDir,
    coreVersion: version ? null : metadata.version
  });
  const lock = await loadModuleLock(snapshot.root);
  const manifest = bundle.manifest;
  const conflicts = [];

  if (!bundle.portable) conflicts.push("This bundled module uses a specialized flow; use the handoff preview/apply commands.");
  if (!snapshot.git.repository) conflicts.push("Target is not a Git repository.");
  if (!snapshot.git.remoteRepository) conflicts.push("Target origin is not an identifiable GitHub repository.");
  if (snapshot.git.dirty) conflicts.push("Target Git working tree is dirty; commit or otherwise resolve it before module apply.");
  if (!satisfiesRange(metadata.version, manifest.coreCompatibility)) conflicts.push("Module is not compatible with this KontextStack core version.");
  if (!manifest.projectTypes.includes(snapshot.projectType)) conflicts.push(`Module does not support project type ${snapshot.projectType}.`);

  const installed = lock.value.modules;
  const installedRecord = installed.find((record) => record.name === manifest.name) ?? null;
  const installedNames = new Set(installed.map((record) => record.name));
  for (const dependency of manifest.dependencies) {
    if (!installedNames.has(dependencyName(dependency))) conflicts.push(`Required module is not installed: ${dependency}.`);
    else {
      const range = dependency.slice(dependencyName(dependency).length + 1);
      const record = installed.find((entry) => entry.name === dependencyName(dependency));
      if (range && !satisfiesRange(record.version, range)) conflicts.push(`Required module version is incompatible: ${dependency}.`);
    }
  }
  for (const conflictName of manifest.conflicts) {
    if (installedNames.has(dependencyName(conflictName))) conflicts.push(`Conflicting module is installed: ${conflictName}.`);
  }
  if (installedRecord && installedRecord.version !== manifest.version) {
    const allowed = manifest.upgrade?.from ?? [];
    if (!allowed.includes("*") && !allowed.includes(installedRecord.version)) {
      conflicts.push(`Upgrade from ${installedRecord.version} is not declared by ${manifest.name}@${manifest.version}.`);
    }
  }

  const ownership = fileOwnership(lock.value);
  const actions = [];
  if (bundle.portable) {
    for (const file of bundle.files) {
      actions.push(await classifyModuleTarget({
        projectRoot: snapshot.root,
        file,
        owner: ownership.get(file.target),
        installedRecord
      }));
    }
  }
  for (const action of actions) {
    if (["conflict", "block"].includes(action.action)) conflicts.push(`${action.target}: ${action.reason}`);
  }

  const previewId = integrity(stableStringify({
    contract: "kontextstack-module-preview-v1",
    project: {
      repository: snapshot.git.remoteRepository,
      branch: snapshot.git.branch,
      commit: snapshot.git.commit,
      dirty: snapshot.git.dirty
    },
    core: { version: metadata.version, commit: metadata.commit },
    currentLock: lock.integrity,
    module: {
      name: manifest.name,
      version: manifest.version,
      integrity: bundle.computedIntegrity,
      files: bundle.files.map((file) => ({ path: file.target, integrity: file.integrity }))
    }
  }));

  const desiredRecord = {
    name: manifest.name,
    version: manifest.version,
    source: manifest.source.repository,
    integrity: bundle.computedIntegrity,
    appliedFromPreview: previewId,
    files: bundle.files.map((file) => ({ path: file.target, integrity: file.integrity }))
  };
  if (installedRecord?.history) desiredRecord.history = structuredClone(installedRecord.history);
  if (installedRecord && (installedRecord.version !== manifest.version || installedRecord.integrity !== bundle.computedIntegrity)) {
    const { history, ...previous } = installedRecord;
    desiredRecord.history = [...(history ?? []), previous];
  }
  if (bundle.contracts) desiredRecord.sourceCommit = bundle.contracts.guide.source.commit;
  const recordAlreadyExact = installedRecord && stableStringify({
    ...installedRecord,
    appliedFromPreview: previewId
  }) === stableStringify(desiredRecord);
  const desiredLock = structuredClone(lock.value);
  if (bundle.portable) {
    desiredLock.core = {
      version: metadata.version,
      source: CANONICAL_SOURCE,
      commit: metadata.commit
    };
    if (!recordAlreadyExact) {
      desiredLock.modules = installedRecord
        ? installed.map((record) => record.name === manifest.name ? desiredRecord : record)
        : [...installed, desiredRecord];
    }
    desiredLock.modules.sort((left, right) => left.name.localeCompare(right.name));
  }
  const lockContent = `${stableStringify(desiredLock, 2)}\n`;
  const lockAction = lock.raw === lockContent ? "preserve" : "update";

  return {
    schemaVersion: "1.0.0",
    previewId,
    writePerformed: false,
    status: conflicts.length ? "blocked" : "ready",
    project: {
      root: snapshot.root,
      repository: snapshot.git.remoteRepository,
      branch: snapshot.git.branch,
      commit: snapshot.git.commit,
      dirty: snapshot.git.dirty,
      type: snapshot.projectType
    },
    module: moduleSummary(bundle, metadata.version, snapshot.projectType),
    actions,
    lock: { path: MODULE_LOCK_PATH, action: lockAction, integrity: integrity(lockContent) },
    conflicts,
    rendered: new Map(bundle.files.map((file) => [file.target, file.content])),
    lockContent
  };
}

export function publicModulePlan(plan) {
  const { rendered, lockContent, ...output } = plan;
  return output;
}

async function rollbackWrites(projectRoot, written, originalLock, lockPath) {
  for (const entry of [...written].reverse()) {
    const destination = await safeTargetPath(projectRoot, entry.target);
    if (entry.action === "add") await rm(destination, { force: true });
    else await writeFile(destination, entry.previous, "utf8");
  }
  await writeFile(lockPath, originalLock, "utf8");
}

export async function applyModulePlan({ projectPath, name, version = null, cacheDir = DEFAULT_MODULE_CACHE, approval }) {
  const plan = await createModulePlan({ projectPath, name, version, cacheDir });
  if (!approval || approval !== plan.previewId) {
    throw new Error("Module apply refused: --approve must exactly match the current preview ID.");
  }
  if (plan.status !== "ready") throw new Error(`Module apply refused: preview is blocked.\n- ${plan.conflicts.join("\n- ")}`);

  const lock = await loadModuleLock(plan.project.root);
  const written = [];
  try {
    for (const action of plan.actions) {
      if (!["add", "update"].includes(action.action)) continue;
      const destination = await safeTargetPath(plan.project.root, action.target);
      await mkdir(path.dirname(destination), { recursive: true });
      const previous = action.action === "update" ? await readFile(destination, "utf8") : null;
      await writeFile(destination, plan.rendered.get(action.target), {
        encoding: "utf8",
        flag: action.action === "add" ? "wx" : "w",
        mode: 0o644
      });
      written.push({ target: action.target, action: action.action, previous });
    }
    if (plan.lock.action === "update") await writeFile(lock.path, plan.lockContent, "utf8");
  } catch (error) {
    await rollbackWrites(plan.project.root, written, lock.raw, lock.path);
    throw error;
  }

  const changed = written.map((entry) => entry.target);
  if (plan.lock.action === "update") changed.push(MODULE_LOCK_PATH);
  const suggestedGitCommands = ["git status --short"];
  if (changed.length) {
    suggestedGitCommands.push(
      `git add ${changed.map((target) => JSON.stringify(target)).join(" ")}`,
      `git commit -m "chore: apply ${plan.module.name}@${plan.module.version}"`
    );
  }
  return {
    previewId: plan.previewId,
    module: { name: plan.module.name, version: plan.module.version, integrity: plan.module.integrity },
    added: written.filter((entry) => entry.action === "add").map((entry) => entry.target),
    updated: written.filter((entry) => entry.action === "update").map((entry) => entry.target),
    preserved: plan.actions.filter((entry) => entry.action === "preserve").map((entry) => entry.target),
    lockUpdated: plan.lock.action === "update",
    suggestedGitCommands
  };
}

export async function verifyProjectModules(projectPath) {
  const snapshot = await inspectProject(projectPath);
  const lock = await loadModuleLock(snapshot.root);
  const verification = await verifyLockedModules(snapshot.root, lock.value);
  return {
    valid: verification.valid,
    project: { root: snapshot.root, repository: snapshot.git.remoteRepository },
    core: lock.value.core,
    checks: verification.checks
  };
}
