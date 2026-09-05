import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { createModulePlan, applyModulePlan, verifyProjectModules } from "../src/modules/lifecycle.js";
import { makeCleanProject, commitAll } from "./support/project.js";
import { writeJson } from "./support/kit.js";

async function install(t, existing = false) {
  const project = await realpath(await makeCleanProject());
  t.after(() => rm(project, { recursive: true, force: true, maxRetries: 3 }));
  await writeJson(path.join(project, "package.json"), { name: "runtime-fixture", private: true, type: "module" });
  if (existing) await writeFile(path.join(project, "existing-server.mjs"), "// Existing framework owns the listener.\n");
  await mkdir(path.join(project, ".kontextstack"));
  await writeJson(path.join(project, ".kontextstack/modules.lock.json"), {
    schemaVersion: "1.0.0", core: { version: "0.5.1", source: "https://github.com/dondsp/kontextstack", commit: null }, modules: []
  });
  commitAll(project);
  const plan = await createModulePlan({ projectPath: project, name: "node-cpanel" });
  assert.equal(plan.status, "ready");
  assert.deepEqual(plan.module.dependencies, []);
  await applyModulePlan({ projectPath: project, name: "node-cpanel", approval: plan.previewId });
  assert.equal((await verifyProjectModules(project)).valid, true);
  const kit = path.join(project, ".kontextstack/modules/node-cpanel/kit");
  const app = path.join(project, "runtime-fixture");
  await mkdir(path.join(app, "test"), { recursive: true });
  await cp(path.join(kit, "fixtures/public"), path.join(app, "public"), { recursive: true });
  for (const file of ["runtime.mjs", "start.cjs"]) await cp(path.join(kit, "templates", file), path.join(app, file));
  await cp(path.join(kit, "checks/runtime.test.mjs"), path.join(app, "test/runtime.test.mjs"));
  return { project, app };
}
function runNode(args, options = {}) {
  const env = { ...(options.env ?? process.env) };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, args, { ...options, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  return { child, result: once(child, "close").then(([code, signal]) => ({ code, signal, stdout, stderr })) };
}
test("installed greenfield Node kit passes its adapted runtime test suite", async (t) => {
  const { project, app } = await install(t);
  const { result } = runNode(["--test", "test/runtime.test.mjs"], { cwd: app });
  const output = await result;
  assert.equal(output.code, 0, output.stdout + output.stderr);
  assert.match(output.stdout, /# pass 3/);
  assert.equal((await verifyProjectModules(project)).valid, true);
});
test("existing app stays intact; exact staged shim starts on injected port and shuts down", async (t) => {
  const { project, app } = await install(t, true);
  assert.match(await readFile(path.join(project, "existing-server.mjs"), "utf8"), /Existing framework/);
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const { child, result } = runNode(["start.cjs"], {
    cwd: app, env: { NODE_ENV: "production", PORT: String(port), SERVICE_NAME: "runtime-fixture", APP_BASE_URL: "https://app.example.invalid", TRUST_PROXY: "false" }
  });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const health = await fetch("http://127.0.0.1:" + port + "/api/health");
      assert.deepEqual(await health.json(), { ok: true, service: "runtime-fixture" });
      ready = true; break;
    } catch { await new Promise((resolve) => setTimeout(resolve, 30)); }
  }
  assert.equal(ready, true);
  child.kill("SIGTERM");
  const output = await result;
  assert.equal(output.code, 0, output.stderr);
  assert.match(output.stdout, /runtime-ready/);
  assert.doesNotMatch(output.stdout, /APP_BASE_URL|https:|PORT/);
  assert.equal((await verifyProjectModules(project)).valid, true);
});
test("runtime refuses symlink assets and unsafe startup without exposing private details", async (t) => {
  const { app } = await install(t);
  await writeFile(path.join(app, "private.js"), "synthetic-private-data");
  await symlink(path.join(app, "private.js"), path.join(app, "public/private.js"));
  const { createServer, runtimeConfig } = await import(pathToFileURL(path.join(app, "runtime.mjs")));
  const server = await createServer({
    config: runtimeConfig({ NODE_ENV: "test", PORT: "4000", SERVICE_NAME: "runtime-fixture", APP_BASE_URL: "http://127.0.0.1:4000" }),
    publicRoot: path.join(app, "public")
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  assert.equal((await fetch("http://127.0.0.1:" + server.address().port + "/private.js")).status, 404);
  const output = await runNode(["start.cjs"], { cwd: app, env: { NODE_ENV: "production", APP_BASE_URL: "synthetic-private-input" } }).result;
  assert.equal(output.code, 1);
  assert.doesNotMatch(output.stderr, /synthetic-private-input/);
  assert.match(output.stderr, /startup failed/);
});
