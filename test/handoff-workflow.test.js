import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPlan, publicPlan } from "../src/planning/create-plan.js";
import { applyApprovedPlan } from "../src/planning/apply-plan.js";
import { verifyProject } from "../src/verification/verify-project.js";
import { GENERATED_PATHS } from "../src/core/constants.js";
import { buildHandoff, commitAll, makeCleanProject, projectCommit } from "./support/project.js";

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("preview is deterministic and does not write target files", async (t) => {
  const projectRoot = await makeCleanProject();
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const handoff = await buildHandoff({
    project: {
      name: "Example Project",
      repository: "example/example-project",
      expectedBranch: "main",
      expectedCommit: projectCommit(projectRoot),
      localPath: ""
    }
  });

  const first = await createPlan({ projectPath: projectRoot, handoff });
  const second = await createPlan({ projectPath: projectRoot, handoff });
  assert.equal(first.status, "ready");
  assert.equal(first.writePerformed, false);
  assert.equal(first.previewId, second.previewId);
  assert.deepEqual(publicPlan(first), publicPlan(second));
  assert.ok(first.actions.every((action) => action.action === "add"));
  for (const relativePath of GENERATED_PATHS) {
    assert.equal(await pathExists(path.join(projectRoot, relativePath)), false);
  }
});

test("apply requires the exact preview and writes only declared records", async (t) => {
  const projectRoot = await makeCleanProject();
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  const handoff = await buildHandoff({
    project: {
      name: "Example Project",
      repository: "example/example-project",
      expectedBranch: "main",
      expectedCommit: projectCommit(projectRoot),
      localPath: ""
    }
  });
  const plan = await createPlan({ projectPath: projectRoot, handoff });

  await assert.rejects(
    applyApprovedPlan({ projectPath: projectRoot, handoff, approval: "sha256-wrong" }),
    /exactly match/
  );
  const result = await applyApprovedPlan({ projectPath: projectRoot, handoff, approval: plan.previewId });
  assert.deepEqual([...result.added].sort(), [...GENERATED_PATHS].sort());

  const verification = await verifyProject(projectRoot);
  assert.equal(verification.valid, true);
  const original = await readFile(path.join(projectRoot, "index.html"), "utf8");
  assert.equal(original, "<!doctype html><title>Fixture</title>\n");
});

test("dirty targets and existing differing output block apply", async (t) => {
  const projectRoot = await makeCleanProject();
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  await writeFile(path.join(projectRoot, "KONTEXTSTACK-NOTICE.txt"), "project-owned existing notice\n", "utf8");
  const commit = commitAll(projectRoot);
  const handoff = await buildHandoff({
    project: {
      name: "Example Project",
      repository: "example/example-project",
      expectedBranch: "main",
      expectedCommit: commit,
      localPath: ""
    }
  });

  const conflictPlan = await createPlan({ projectPath: projectRoot, handoff });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.actions.some((action) => action.target === "KONTEXTSTACK-NOTICE.txt" && action.action === "conflict"));

  await writeFile(path.join(projectRoot, "uncommitted.txt"), "dirty\n", "utf8");
  const dirtyPlan = await createPlan({ projectPath: projectRoot, handoff });
  assert.ok(dirtyPlan.conflicts.some((conflict) => conflict.includes("working tree is dirty")));
});
