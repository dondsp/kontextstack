// Maintainer-only smoke harness for an already installed local candidate.
// This script is not shipped in the npm artifact and never contacts a provider.
import assert from "node:assert/strict";
import { mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { makeCleanProject, commitAll } from "../test/support/project.js";
import { writeJson } from "../test/support/kit.js";

const bin = path.resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "Pass the installed candidate CLI file path.");
function cli(args) {
  const result = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, "Candidate CLI failed: " + result.stderr);
  return JSON.parse(result.stdout);
}
const about = cli(["about"]);
assert.equal(about.version, JSON.parse(await readFile(new URL('../package.json', import.meta.url))).version);
assert.equal(cli(["doctor"]).healthy, true);
assert.ok(cli(["modules", "available"]).modules.length >= 9);
const project = await makeCleanProject();
try {
  await mkdir(path.join(project, ".kontextstack"));
  await writeJson(path.join(project, "package.json"), { name: "package-smoke-fixture", private: true, type: "module" });
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), {
    schemaVersion: "1.0.0",
    core: { version: about.version, source: "https://github.com/dondsp/kontextstack", commit: null },
    modules: []
  });
  commitAll(project);
  for (const name of ["domain-cpanel", "static-site-cpanel", "node-cpanel", "mysql-storage", "auth-local", "auth-google"]) {
    const args = ["--module", name, "--project", project];
    const inspected = cli(["modules", "inspect", ...args]).module;
    assert.equal(inspected.coreCompatible, true);
    assert.equal(inspected.guide.module.version, inspected.version);
    const preview = cli(["modules", "preview", ...args]);
    assert.equal(preview.status, "ready");
    cli(["modules", "apply", ...args, "--approve", preview.previewId]);
    assert.equal(cli(["modules", "verify", "--project", project]).valid, true);
    commitAll(project);
  }
  process.stdout.write("Candidate package smoke passed: about, doctor, available, inspect, preview, exact apply, verify. No provider work.\n");
} finally {
  await rm(project, { recursive: true, force: true });
}
