import test from "node:test";
import assert from "node:assert/strict";
import { coreUpdateGuide } from "../src/updates/core-update.js";

test("core update guidance is explicit, source-traced and fast-forward only", () => {
  const guide = coreUpdateGuide("mature");
  assert.equal(guide.source.remote, "origin");
  assert.equal(guide.policy.automatic, false);
  assert.equal(guide.policy.strategy, "fetch and fast-forward only");
  assert.ok(guide.commands.includes("git switch main"));
  assert.ok(guide.commands.includes("git fetch origin main"));
  assert.ok(guide.commands.includes("git merge --ff-only origin/main"));
  assert.ok(guide.commands.includes("node bin/kontextstack.js install verify --mode mature"));
});
