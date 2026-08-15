import test from "node:test";
import assert from "node:assert/strict";
import { listAvailableModules } from "../src/modules/registry.js";

test("the alpha registry exposes only source-traceable handoff-core", async () => {
  const registry = await listAvailableModules();
  assert.equal(registry.transport, "bundled");
  assert.equal(registry.modules.length, 1);
  assert.equal(registry.modules[0].name, "handoff-core");
  assert.equal(registry.modules[0].source, "https://github.com/dondsp/kontextstack");
  assert.match(registry.modules[0].integrity, /^sha256-[a-f0-9]{64}$/);
});
