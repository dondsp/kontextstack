import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
  for (const entry of portable) {
    const bundle = await loadPortableBundle(path.join(root, "modules", entry.name));
    assert.equal(bundle.computedIntegrity, entry.integrity);
    assert.equal(bundle.manifest.permissions.network, false);
    assert.deepEqual(bundle.manifest.permissions.commands, []);
    assert.ok(bundle.files.every((file) => (
      file.target.startsWith(`.kontextstack/modules/${entry.name}/`) ||
      file.target.startsWith(`docs/kontextstack/modules/${entry.name}/`)
    )));
  }
});
