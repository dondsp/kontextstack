import path from "node:path";
import { readFile } from "node:fs/promises";
import { resolveProjectRoot } from "../core/paths.js";
import { CANONICAL_SOURCE, GENERATED_PATHS } from "../core/constants.js";

export async function verifyProject(projectPath) {
  const root = await resolveProjectRoot(projectPath);
  const checks = [];

  for (const relativePath of GENERATED_PATHS) {
    try {
      const content = await readFile(path.join(root, relativePath), "utf8");
      checks.push({
        path: relativePath,
        ok: content.includes(CANONICAL_SOURCE),
        reason: content.includes(CANONICAL_SOURCE) ? null : "Canonical source is missing."
      });
    } catch {
      checks.push({ path: relativePath, ok: false, reason: "File is missing or unreadable." });
    }
  }

  for (const jsonPath of [".kontextstack/project.json", ".kontextstack/modules.lock.json"]) {
    const check = checks.find((entry) => entry.path === jsonPath);
    try {
      JSON.parse(await readFile(path.join(root, jsonPath), "utf8"));
    } catch {
      check.ok = false;
      check.reason = "JSON is invalid or unreadable.";
    }
  }

  return {
    valid: checks.every((check) => check.ok),
    checks
  };
}
