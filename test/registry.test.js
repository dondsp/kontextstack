import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listAvailableModules } from "../src/modules/registry.js";

test("the alpha registry exposes only source-traceable handoff-core", async (t) => {
  const emptyCache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-empty-cache-"));
  t.after(() => rm(emptyCache, { recursive: true, force: true }));
  const registry = await listAvailableModules({ cacheDir: emptyCache });
  assert.equal(registry.transport, "bundled");
  assert.equal(registry.modules.length, 1);
  assert.equal(registry.modules[0].name, "handoff-core");
  assert.equal(registry.modules[0].source, "https://github.com/dondsp/kontextstack");
  assert.match(registry.modules[0].integrity, /^sha256-[a-f0-9]{64}$/);
});
