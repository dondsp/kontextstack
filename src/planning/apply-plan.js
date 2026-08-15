import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { safeTargetPath } from "../core/paths.js";
import { createPlan } from "./create-plan.js";

export async function applyApprovedPlan({ projectPath, handoff, approval }) {
  const plan = await createPlan({ projectPath, handoff });
  if (!approval || approval !== plan.previewId) {
    throw new Error("Apply refused: --approve must exactly match the current preview ID.");
  }
  if (plan.status !== "ready") {
    throw new Error(`Apply refused: preview is blocked.\n- ${plan.conflicts.join("\n- ")}`);
  }

  const added = [];
  for (const action of plan.actions) {
    if (action.action !== "add") continue;
    const destination = await safeTargetPath(plan.project.root, action.target);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, plan.rendered.get(action.target), { encoding: "utf8", flag: "wx", mode: 0o644 });
    added.push(action.target);
  }

  return {
    previewId: plan.previewId,
    added,
    preserved: plan.actions.filter((action) => action.action === "preserve").map((action) => action.target),
    suggestedGitCommands: [
      "git status --short",
      `git add ${added.map((target) => JSON.stringify(target)).join(" ")}`,
      "git commit -m \"docs: record KontextStack handoff\""
    ]
  };
}
