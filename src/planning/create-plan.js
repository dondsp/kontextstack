import { lstat, readFile } from "node:fs/promises";
import { integrity, stableStringify } from "../core/json.js";
import { safeTargetPath } from "../core/paths.js";
import { inspectProject } from "../inspection/inspect-project.js";
import { loadMetadata } from "../core/metadata.js";
import { renderHandoffCore, renderedIntegrity } from "../modules/handoff-core.js";

async function classifyTarget(projectRoot, target, desiredContent) {
  const destination = await safeTargetPath(projectRoot, target);
  try {
    const details = await lstat(destination);
    if (details.isSymbolicLink() || !details.isFile()) {
      return { target, action: "block", reason: "Target exists but is not a regular file." };
    }
    const existing = await readFile(destination, "utf8");
    if (existing === desiredContent) {
      return { target, action: "preserve", integrity: integrity(desiredContent) };
    }
    return { target, action: "conflict", reason: "Target exists with different content." };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { target, action: "add", integrity: integrity(desiredContent) };
    }
    throw error;
  }
}

function baselineConflicts(handoff, snapshot) {
  const conflicts = [];
  if (!snapshot.git.repository) conflicts.push("Target is not a Git repository.");
  if (!snapshot.git.remoteRepository) conflicts.push("Target origin is not an identifiable GitHub repository.");
  if (snapshot.git.remoteRepository && snapshot.git.remoteRepository.toLowerCase() !== handoff.project.repository.toLowerCase()) {
    conflicts.push("Target GitHub repository does not match the Handoff Pack.");
  }
  if (snapshot.git.branch !== handoff.project.expectedBranch) conflicts.push("Target branch does not match the Handoff Pack.");
  if (handoff.project.expectedCommit && !snapshot.git.commit?.startsWith(handoff.project.expectedCommit)) {
    conflicts.push("Target commit does not match the Handoff Pack baseline.");
  }
  if (snapshot.git.dirty) conflicts.push("Target Git working tree is dirty; commit or otherwise resolve it before apply.");
  return conflicts;
}

export async function createPlan({ projectPath, handoff }) {
  const [snapshot, metadata] = await Promise.all([
    inspectProject(projectPath),
    loadMetadata()
  ]);

  const previewId = integrity(stableStringify({
    contract: "kontextstack-preview-v1",
    handoff: handoff.contentHash,
    baseline: {
      repository: snapshot.git.remoteRepository,
      branch: snapshot.git.branch,
      commit: snapshot.git.commit,
      dirty: snapshot.git.dirty
    },
    core: {
      version: metadata.version,
      commit: metadata.commit
    },
    module: metadata.module
  }));

  const rendered = renderHandoffCore({ handoff, snapshot, metadata, previewId });
  const actions = [];
  for (const [target, content] of rendered) {
    actions.push(await classifyTarget(snapshot.root, target, content));
  }

  const conflicts = baselineConflicts(handoff, snapshot);
  for (const action of actions) {
    if (action.action === "conflict" || action.action === "block") {
      conflicts.push(`${action.target}: ${action.reason}`);
    }
  }

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
    handoff: {
      artifactId: handoff.artifactId,
      contentHash: handoff.contentHash
    },
    module: metadata.module,
    actions,
    renderedIntegrity: renderedIntegrity(rendered),
    conflicts,
    rendered
  };
}

export function publicPlan(plan) {
  const { rendered, ...output } = plan;
  return output;
}
