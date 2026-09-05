import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { handoffContentHash } from "../../src/core/json.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(root, "test", "fixtures", "handoffs", "valid.json");
const chatgptSitesFixturePath = path.join(root, "test", "fixtures", "handoffs", "chatgpt-sites-v2.json");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

export async function makeCleanProject() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "kontextstack-test-"));
  await writeFile(path.join(projectRoot, "index.html"), "<!doctype html><title>Fixture</title>\n", "utf8");
  await writeFile(path.join(projectRoot, "README.md"), "# Fixture project\n", "utf8");
  git(projectRoot, ["init", "-b", "main"]);
  git(projectRoot, ["config", "user.name", "KontextStack Test"]);
  git(projectRoot, ["config", "user.email", "test@example.invalid"]);
  // A disposable fixture must not start Git maintenance that races cleanup.
  git(projectRoot, ["config", "gc.auto", "0"]);
  git(projectRoot, ["config", "maintenance.auto", "false"]);
  git(projectRoot, ["add", "index.html", "README.md"]);
  git(projectRoot, ["commit", "-m", "test: initialize fixture"]);
  git(projectRoot, ["remote", "add", "origin", "https://github.com/example/example-project.git"]);
  return projectRoot;
}

export function projectCommit(projectRoot) {
  return git(projectRoot, ["rev-parse", "HEAD"]);
}

export function commitAll(projectRoot, message = "test: update fixture") {
  git(projectRoot, ["add", "."]);
  git(projectRoot, ["commit", "-m", message]);
  return projectCommit(projectRoot);
}

export async function buildHandoff(overrides = {}) {
  const value = JSON.parse(await readFile(fixturePath, "utf8"));
  Object.assign(value, overrides);
  value.contentHash = handoffContentHash(value);
  return value;
}

export async function buildChatgptSitesHandoff(overrides = {}) {
  const value = JSON.parse(await readFile(chatgptSitesFixturePath, "utf8"));
  Object.assign(value, overrides);
  value.contentHash = handoffContentHash(value);
  return value;
}
