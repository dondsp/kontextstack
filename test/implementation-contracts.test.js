import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadPortableBundle, fingerprintPortableBundle } from "../src/modules/bundle.js";
import { guideContentIntegrity } from "../src/modules/contracts.js";
import { importPortableModule } from "../src/modules/cache.js";
import { applyModulePlan, createModulePlan, inspectModule, verifyProjectModules } from "../src/modules/lifecycle.js";
import { integrity } from "../src/core/json.js";
import { makeKit, updateImplementation, writeJson } from "./support/kit.js";
import { makeCleanProject, commitAll } from "./support/project.js";

async function fixture(t) {
  const kit = await makeKit();
  t.after(() => rm(kit.root, { recursive: true, force: true }));
  return kit;
}

test("contracts are source-traced and survive exact import with unchanged fingerprint", async (t) => {
  const kit = await fixture(t);
  const before = await loadPortableBundle(kit.root);
  const cacheDir = path.join(kit.root, "cache");
  const imported = await importPortableModule({ sourcePath: kit.root, cacheDir });
  const after = await loadPortableBundle(imported.cachePath);
  assert.equal(after.computedIntegrity, before.computedIntegrity);
  assert.deepEqual(after.contracts, before.contracts);
  const inspection = await inspectModule({ name: "fixture-kit", cacheDir });
  assert.equal(inspection.module.implementationKit.schemaVersion, "kontextstack-implementation/v1");
  assert.equal(inspection.module.guide.commands[0].execution, "copy-only");
  assert.equal(inspection.module.permissions.network, false);
  assert.deepEqual(inspection.module.permissions.commands, []);
});

const invalid = [
  ["unsupported implementation", (k) => updateImplementation(k, (v) => { v.schemaVersion = "kontextstack-implementation/v99"; }), /Invalid implementation/],
  ["missing implementation field", (k) => updateImplementation(k, (v) => { delete v.acceptance; }), /missing acceptance/],
  ["unsupported implementation field", (k) => updateImplementation(k, (v) => { v.execute = true; }), /unsupported field/],
  ["template traversal", (k) => updateImplementation(k, (v) => { v.projectChanges[0].templates = ["../outside"]; }), /path/],
  ["foreign module template", (k) => updateImplementation(k, (v) => { v.projectChanges[0].templates = [".kontextstack/modules/other/kit/template"]; }), /Referenced template/],
  ["missing template", (k) => updateImplementation(k, (v) => { v.projectChanges[0].templates = [".kontextstack/modules/fixture-kit/kit/missing"]; }), /Referenced template/],
  ["project path traversal", (k) => updateImplementation(k, (v) => { v.projectChanges[0].projectPath = "../app.js"; }), /path/],
  ["Windows absolute path", (k) => updateImplementation(k, (v) => { v.projectChanges[0].projectPath = "C:/outside/app.js"; }), /path/],
  ["missing approval gate", (k) => updateImplementation(k, (v) => { v.approvalGates = []; }), /approval gate/],
  ["unknown acceptance evidence", (k) => updateImplementation(k, (v) => { v.acceptance[0].evidence = ["missing"]; }), /unknown check/],
  ["duplicate ids", (k) => updateImplementation(k, (v) => { v.checks.push({ ...v.checks[0], expected: "Other" }); }), /Duplicate/],
  ["dependency mismatch", (k) => updateImplementation(k, (v) => { v.requires = ["other@>=1.0.0"]; }), /dependency/],
  ["module identity mismatch", (k) => updateImplementation(k, (v) => { v.module.version = "9.0.0"; }), /identity/],
  ["invalid source revision", (k) => updateImplementation(k, (v) => { v.sources[0].revision = "main"; }), /string shape/],
  ["missing guide", (k) => rm(path.join(k.root, "guide.json")), /missing a declared contract/],
  ["invalid guide JSON", (k) => writeFile(path.join(k.root, "guide.json"), "{broken"), /readable JSON/],
  ["unsupported guide", async (k) => { k.guide.schemaVersion = "kontextstack-guide/v2"; await writeJson(path.join(k.root, "guide.json"), k.guide); }, /Invalid guide/],
  ["unsafe guide approval", async (k) => { k.guide.stages[1].approval = "none"; await writeJson(path.join(k.root, "guide.json"), k.guide); }, /explicit approval/],
  ["guide document escape", async (k) => { k.guide.documents.codex = "../CODEX_PROMPT.md"; await writeJson(path.join(k.root, "guide.json"), k.guide); }, /Guide document/],
  ["stale guide integrity", async (k) => { k.guide.title = "Changed"; await writeJson(path.join(k.root, "guide.json"), k.guide); }, /integrity mismatch/],
  ["secret-bearing JSON", (k) => updateImplementation(k, (v) => { v.password = "synthetic-value"; }), /protected value/],
  ["missing implementation", (k) => rm(path.join(k.root, "files", k.manifest.contracts.implementation)), /ENOENT/],
  ["unsupported kit declaration", async (k) => { k.manifest.contracts.schemaVersion = "kontextstack-kit/v2"; await writeJson(path.join(k.root, "module.json"), k.manifest); }, /Unsupported/],
  ["undeclared contracts", async (k) => { delete k.manifest.contracts; await writeJson(path.join(k.root, "module.json"), k.manifest); }, /explicit manifest declaration/],
  ["legacy core compatibility", async (k) => { k.manifest.coreCompatibility = ">=0.5.1"; await writeJson(path.join(k.root, "module.json"), k.manifest); }, /exclude legacy/],
  ["network authority", async (k) => { k.manifest.permissions.network = true; await writeJson(path.join(k.root, "module.json"), k.manifest); }, /network/],
  ["command authority", async (k) => { k.manifest.permissions.commands = ["node"]; await writeJson(path.join(k.root, "module.json"), k.manifest); }, /execute commands/]
];
for (const [label, mutate, pattern] of invalid) {
  test(`contract refuses ${label} before fingerprint or import`, async (t) => {
    const kit = await fixture(t);
    await mutate(kit);
    await assert.rejects(fingerprintPortableBundle(kit.root), pattern);
    await assert.rejects(importPortableModule({ sourcePath: kit.root, cacheDir: path.join(kit.root, "cache") }), pattern);
    assert.equal((await readdir(kit.root)).includes("cache"), false);
  });
}

test("guide metadata is bound into the bundle integrity even when re-signed internally", async (t) => {
  const kit = await fixture(t);
  kit.guide.title = "Reviewed guide change";
  kit.guide.source.integrity = guideContentIntegrity(kit.guide);
  await writeJson(path.join(kit.root, "guide.json"), kit.guide);
  await assert.rejects(loadPortableBundle(kit.root), /Module integrity mismatch/);
  assert.notEqual((await fingerprintPortableBundle(kit.root)).integrity, kit.manifest.source.integrity);
});

test("contract metadata refuses symlinks and source ancestors", async (t) => {
  const kit = await fixture(t);
  await rm(path.join(kit.root, "guide.json"));
  await symlink(path.join(kit.root, "module.json"), path.join(kit.root, "guide.json"));
  await assert.rejects(loadPortableBundle(kit.root), /regular file/);
});

test("declared dependency versions are enforced before apply", async (t) => {
  const kit = await fixture(t);
  const project = await makeCleanProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  kit.manifest.dependencies = ["required-kit@>=2.0.0"];
  kit.implementation.requires = kit.manifest.dependencies;
  kit.guide.prerequisites = kit.manifest.dependencies;
  const implementationPath = path.join(kit.root, "files", kit.manifest.contracts.implementation);
  await writeJson(implementationPath, kit.implementation);
  kit.guide.source.implementationIntegrity = integrity(await readFile(implementationPath, "utf8"));
  kit.guide.source.integrity = guideContentIntegrity(kit.guide);
  await writeJson(path.join(kit.root, "guide.json"), kit.guide);
  await writeJson(path.join(kit.root, "module.json"), kit.manifest);
  kit.manifest.source.integrity = (await fingerprintPortableBundle(kit.root)).integrity;
  await writeJson(path.join(kit.root, "module.json"), kit.manifest);
  const cacheDir = path.join(kit.root, "cache");
  await importPortableModule({ sourcePath: kit.root, cacheDir });
  await mkdir(path.join(project, ".kontextstack"));
  const lock = { schemaVersion: "1.0.0", core: { version: "0.5.1", source: kit.manifest.source.repository, commit: null }, modules: [{
    name: "required-kit", version: "1.0.0", source: kit.manifest.source.repository,
    integrity: "sha256-" + "2".repeat(64), files: []
  }] };
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), lock);
  commitAll(project);
  const args = { projectPath: project, name: "fixture-kit", cacheDir };
  assert.ok((await createModulePlan(args)).conflicts.some((value) => value.includes("version is incompatible")));
  lock.modules[0].version = "2.0.0";
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), lock);
  commitAll(project);
  assert.equal((await createModulePlan(args)).status, "ready");
});

test("secret-like code literals and tokens are rejected without echoing values", async (t) => {
  const kit = await fixture(t);
  const template = path.join(kit.root, "files", kit.implementation.projectChanges[0].templates[0]);
  for (const value of ["sk-" + "x".repeat(24), 'const API_TOKEN = "synthetic-private-value";']) {
    await writeFile(template, value);
    await assert.rejects(fingerprintPortableBundle(kit.root), (error) => /protected/.test(error.message) && !error.message.includes(value));
  }
});

test("legacy installation upgrades add contracts, preserve decisions, retain history, and refuse customization", async (t) => {
  const kit = await fixture(t);
  const project = await makeCleanProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  const decisionPath = ".kontextstack/modules/fixture-kit/decision.json";
  const old = { name: "fixture-kit", version: "1.0.0", source: kit.manifest.source.repository, integrity: "sha256-" + "2".repeat(64), appliedFromPreview: "sha256-" + "3".repeat(64), files: [{ path: decisionPath, integrity: integrity("{}\n") }] };
  await mkdir(path.join(project, path.dirname(decisionPath)), { recursive: true });
  await writeFile(path.join(project, decisionPath), "{}\n");
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), {
    schemaVersion: "1.0.0", core: { version: "0.5.1", source: kit.manifest.source.repository, commit: null }, modules: [old]
  });
  commitAll(project);
  const cacheDir = path.join(kit.root, "cache");
  await importPortableModule({ sourcePath: kit.root, cacheDir });
  const args = { projectPath: project, name: "fixture-kit", cacheDir };
  const first = await createModulePlan(args);
  assert.equal(first.status, "ready");
  assert.equal(first.previewId, (await createModulePlan(args)).previewId);
  assert.equal(first.actions.find((entry) => entry.target === decisionPath).action, "preserve");
  assert.ok(first.actions.some((entry) => entry.target.endsWith("implementation.json") && entry.action === "add"));
  await assert.rejects(applyModulePlan({ ...args, approval: old.appliedFromPreview }), /exactly match/);
  await applyModulePlan({ ...args, approval: first.previewId });
  assert.equal((await verifyProjectModules(project)).valid, true);
  const lock = JSON.parse(await readFile(path.join(project, ".kontextstack/modules.lock.json")));
  assert.deepEqual(lock.modules[0].history, [old]);
  commitAll(project);
  await writeFile(path.join(project, decisionPath), '{"ownerChoice":"custom"}\n');
  commitAll(project);
  const customized = await createModulePlan(args);
  assert.equal(customized.status, "blocked");
  await assert.rejects(applyModulePlan({ ...args, approval: customized.previewId }), /blocked/);
  assert.equal(JSON.parse(await readFile(path.join(project, decisionPath))).ownerChoice, "custom");
});
