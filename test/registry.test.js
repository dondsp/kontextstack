import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPortableBundle } from "../src/modules/bundle.js";
import { listAvailableModules } from "../src/modules/registry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the bundled registry exposes source-traceable release modules", async (t) => {
  const emptyCache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-empty-cache-"));
  t.after(() => rm(emptyCache, { recursive: true, force: true }));
  const registry = await listAvailableModules({ cacheDir: emptyCache });
  assert.equal(registry.transport, "bundled");
  const names = new Set(registry.modules.map((entry) => entry.name));
  assert.ok(names.has("handoff-core"));
  assert.ok(names.has("domain-cpanel"));
  assert.ok(names.has("static-site-cpanel"));
  assert.ok(names.has("node-cpanel"));
  assert.ok(names.has("mysql-storage"));
  assert.ok(names.has("auth-local"));
  assert.ok(names.has("auth-google"));
  assert.ok(names.has("github-cpanel-deploy"));
  assert.ok(names.has("production-operations"));
  for (const entry of registry.modules) {
    assert.equal(entry.source, "https://github.com/dondsp/kontextstack");
    assert.match(entry.integrity, /^sha256-[a-f0-9]{64}$/);
  }
});

test("every bundled portable module matches its registry fingerprint and filesystem boundary", async (t) => {
  const emptyCache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-empty-cache-"));
  t.after(() => rm(emptyCache, { recursive: true, force: true }));
  const registry = await listAvailableModules({ cacheDir: emptyCache, includeLocations: true });
  const portable = registry.modules.filter((entry) => entry.name !== "handoff-core");
  const packageVersion = JSON.parse(await readFile(path.join(root, "package.json"))).version;
  for (const entry of portable) {
    const bundle = await loadPortableBundle(path.dirname(entry.manifestPath));
    assert.equal(bundle.computedIntegrity, entry.integrity);
    if (bundle.contracts && !entry.manifestPath.includes('/versions/')) assert.equal(bundle.contracts.guide.package.version, packageVersion, "Current guide snapshot must match the selected package release");
    assert.equal(bundle.manifest.permissions.network, false);
    assert.deepEqual(bundle.manifest.permissions.commands, []);
    assert.ok(bundle.files.every((file) => (
      file.target.startsWith(`.kontextstack/modules/${entry.name}/`) ||
      file.target.startsWith(`docs/kontextstack/modules/${entry.name}/`)
    )));
  }

  const localAuth = await loadPortableBundle(path.join(root, "modules", "auth-local"));
  const googleAuth = await loadPortableBundle(path.join(root, "modules", "auth-google"));
  assert.deepEqual(localAuth.manifest.dependencies, []);
  assert.ok(localAuth.manifest.optionalDependencies.includes("mysql-storage@>=0.5.0"));
  assert.deepEqual(googleAuth.manifest.dependencies, ["auth-local@>=0.5.0"]);
});
