import test from "node:test";
import assert from "node:assert/strict";
import { validateRelativeTarget, isInside } from "../src/core/paths.js";

test("generated target paths reject traversal and absolute paths", () => {
  assert.throws(() => validateRelativeTarget("../outside.txt"), /escape/);
  assert.throws(() => validateRelativeTarget("/outside.txt"), /relative/);
  assert.equal(validateRelativeTarget("docs/kontextstack/receipt.md"), "docs/kontextstack/receipt.md");
});

test("path containment distinguishes siblings from descendants", () => {
  assert.equal(isInside("/tmp/project", "/tmp/project/docs/file.md"), true);
  assert.equal(isInside("/tmp/project", "/tmp/project-other/file.md"), false);
});
