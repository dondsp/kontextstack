import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { request } from "node:http";
import { inspectArtifact } from "../modules/static-site-cpanel/files/.kontextstack/modules/static-site-cpanel/kit/checks/artifact.mjs";
import { createModulePlan, applyModulePlan, verifyProjectModules, inspectModule } from "../src/modules/lifecycle.js";
import { makeCleanProject, commitAll } from "./support/project.js";
import { writeJson } from "./support/kit.js";
import { startApache } from "./support/apache.js";

const kit = new URL("../modules/static-site-cpanel/files/.kontextstack/modules/static-site-cpanel/kit/", import.meta.url);
const source = "https://github.com/dondsp/kontextstack";
async function artifact(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "kontextstack-static-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL("fixtures/site/", kit), root, { recursive: true });
  const policy = {
    schemaVersion: "kontextstack-static-artifact/v1",
    sourceCommit: "1".repeat(40), canonicalOrigin: "https://site.example.invalid",
    allowedFiles: ["index.html", "assets/site.css"], requiredFiles: ["index.html"],
    formModel: "none", approvedBy: "synthetic-fixture-owner"
  };
  return { root, policy };
}

test("static artifact validates exact neutral output and refuses unsafe additions", async (t) => {
  const { root, policy } = await artifact(t);
  const result = await inspectArtifact(root, policy);
  assert.equal(result.valid, true);
  assert.equal(result.productionVerified, false);
  assert.equal(result.files.length, 2);
  for (const name of [".env", "backup.sql", "bundle.js.map", "archive.zip", "extra.html"]) {
    await writeFile(path.join(root, name), "synthetic");
    await assert.rejects(inspectArtifact(root, policy));
    await rm(path.join(root, name));
  }
  await symlink(path.join(root, "index.html"), path.join(root, "alias.html"));
  await assert.rejects(inspectArtifact(root, policy), /symlink/);
});

test("artifact refuses missing files, unreviewed policy, secrets and placeholders", async (t) => {
  const { root, policy } = await artifact(t);
  await assert.rejects(inspectArtifact(root, { ...policy, approvedBy: null }), /policy/);
  await assert.rejects(inspectArtifact(root, { ...policy, allowedFiles: ["../outside"] }), /policy/);
  for (const content of ["<UNRESOLVED_HOST>", "sk-" + "x".repeat(24), 'const API_TOKEN = "synthetic-value";', "http://localhost:3000"]) {
    await writeFile(path.join(root, "index.html"), content);
    await assert.rejects(inspectArtifact(root, policy), (error) => /withheld/.test(error.message) && !error.message.includes(content));
  }
  await rm(path.join(root, "index.html"));
  await assert.rejects(inspectArtifact(root, policy), /missing/);
});

test("install, Codex handoff, fixture adaptation and Apache verification compose without provider authority", async (t) => {
  const project = await realpath(await makeCleanProject());
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(path.join(project, ".kontextstack"));
  await mkdir(path.join(project, "src"));
  const existingApp = "// Existing application runtime; retain its route ownership.\n";
  await writeFile(path.join(project, "src/server.mjs"), existingApp);
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), {
    schemaVersion: "1.0.0", core: { version: "0.5.1", source, commit: null }, modules: []
  });
  commitAll(project);
  for (const name of ["domain-cpanel", "static-site-cpanel"]) {
    const args = { projectPath: project, name };
    const plan = await createModulePlan(args);
    assert.equal(plan.status, "ready");
    await applyModulePlan({ ...args, approval: plan.previewId });
    assert.equal((await verifyProjectModules(project)).valid, true);
    const prompt = await readFile(path.join(project, `docs/kontextstack/modules/${name}/CODEX_PROMPT.md`), "utf8");
    assert.match(prompt, /AGENTS.md/);
    assert.match(prompt, /separate explicit approval/);
    const inspection = await inspectModule(args);
    assert.equal(inspection.module.guide.package.version, "0.6.0-alpha.1");
    commitAll(project);
  }
  // Simulated Codex adaptation: copy only the explicitly selected fixture,
  // preserving installed kit integrity and existing application source.
  const publicRoot = path.join(project, "public-fixture");
  const installed = path.join(project, ".kontextstack/modules/static-site-cpanel/kit");
  await cp(path.join(installed, "fixtures/site"), publicRoot, { recursive: true });
  const alias = await readFile(path.join(project, ".kontextstack/modules/domain-cpanel/kit/snippets/canonical.htaccess"), "utf8");
  const routing = alias.replaceAll("<ALIAS_HOST_REGEX>", "alias\\.example\\.invalid").replaceAll("<CANONICAL_HOST>", "site.example.invalid") +
    await readFile(path.join(installed, "snippets/spa.htaccess"), "utf8");
  assert.doesNotMatch(routing, /<[A-Z][A-Z0-9_]*>/);
  await writeFile(path.join(publicRoot, ".htaccess"), routing);
  const { inspectArtifact: installedCheck } = await import(pathToFileURL(path.join(installed, "checks/artifact.mjs")));
  await installedCheck(publicRoot, {
    schemaVersion: "kontextstack-static-artifact/v1", sourceCommit: "1".repeat(40),
    allowedFiles: ["index.html", "assets/site.css", ".htaccess"], requiredFiles: ["index.html"],
    canonicalOrigin: "https://site.example.invalid", formModel: "none", approvedBy: "synthetic-owner"
  });
  await mkdir(path.join(publicRoot, ".well-known/acme-challenge"), { recursive: true });
  await writeFile(path.join(publicRoot, ".well-known/acme-challenge/probe"), "synthetic-challenge");
  const origin = await startApache(t, publicRoot);
  const get = (url, host = "site.example.invalid") => new Promise((resolve, reject) => {
    const req = request(origin + url, { headers: { Host: host } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: new Headers(response.headers),
        text: async () => Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal((await get("/")).status, 200);
  assert.match(await (await get("/deep/path")).text(), /Static fixture/);
  assert.match((await get("/assets/site.css")).headers.get("content-type"), /text\/css/);
  assert.equal((await get("/assets/missing.css")).status, 404);
  assert.equal((await get("/api/health")).status, 404);
  const redirect = await get("/deep/path?q=1", "alias.example.invalid");
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "https://site.example.invalid/deep/path?q=1");
  const encoded = await get("/space%20path?q=two%20words", "alias.example.invalid");
  assert.equal(encoded.headers.get("location"), "https://site.example.invalid/space%20path?q=two%20words");
  assert.equal((await get("/.well-known/acme-challenge/probe", "alias.example.invalid")).status, 200);
  assert.equal((await verifyProjectModules(project)).valid, true);
  assert.equal(await readFile(path.join(project, "src/server.mjs"), "utf8"), existingApp);
  const evidence = JSON.parse(await readFile(path.join(project, ".kontextstack/modules/static-site-cpanel/evidence.json")));
  assert.equal(evidence.states["provider-configured"], false);
  assert.equal(evidence.states["owner-accepted"], false);
});

test("published planning modules upgrade additively without changing old records or fingerprints", async (t) => {
  const project = await makeCleanProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(path.join(project, ".kontextstack"));
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), {
    schemaVersion: "1.0.0", core: { version: "0.5.1", source, commit: null }, modules: []
  });
  commitAll(project);
  for (const name of ["domain-cpanel", "static-site-cpanel"]) {
    const args = { projectPath: project, name, version: "0.2.0" };
    const legacy = await createModulePlan(args);
    assert.equal(legacy.module.implementationKit, null);
    await applyModulePlan({ ...args, approval: legacy.previewId });
    commitAll(project);
    const upgraded = await createModulePlan({ ...args, version: "0.3.0" });
    assert.equal(upgraded.status, "ready");
    assert.equal(upgraded.actions.filter((entry) => entry.action === "preserve").length, 2);
    assert.ok(upgraded.actions.every((entry) => ["preserve", "add"].includes(entry.action)));
    await applyModulePlan({ ...args, version: "0.3.0", approval: upgraded.previewId });
    assert.equal((await verifyProjectModules(project)).valid, true);
    const lock = JSON.parse(await readFile(path.join(project, ".kontextstack/modules.lock.json")));
    const record = lock.modules.find((entry) => entry.name === name);
    assert.equal(record.history[0].version, "0.2.0");
    assert.equal(record.history[0].integrity, legacy.module.integrity);
    commitAll(project);
  }
});
