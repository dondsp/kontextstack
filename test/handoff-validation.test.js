import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handoffContentHash } from "../src/core/json.js";
import { validateHandoffObject } from "../src/handoff/validate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fixture() {
  return JSON.parse(await readFile(path.join(root, "test", "fixtures", "handoffs", "valid.json"), "utf8"));
}

test("the valid Handoff Pack fixture has a canonical matching hash", async () => {
  const handoff = await fixture();
  assert.equal(handoff.contentHash, handoffContentHash(handoff));
  assert.deepEqual(validateHandoffObject(handoff), { valid: true, errors: [] });
});

test("tampered Handoff Pack content is rejected", async () => {
  const handoff = await fixture();
  handoff.goal.statement = "Changed after hashing";
  const result = validateHandoffObject(handoff);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("contentHash does not match")));
});

test("secret-bearing fields are rejected without returning their values", async () => {
  const handoff = await fixture();
  handoff.sources[0].token = "sensitive-fixture-value";
  handoff.contentHash = handoffContentHash(handoff);
  const result = validateHandoffObject(handoff);
  const output = result.errors.join("\n");
  assert.equal(result.valid, false);
  assert.match(output, /protected value finding/);
  assert.doesNotMatch(output, /sensitive-fixture-value/);
});

test("unsupported top-level fields fail closed", async () => {
  const handoff = await fixture();
  handoff.futureAuthority = true;
  handoff.contentHash = handoffContentHash(handoff);
  const result = validateHandoffObject(handoff);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("futureAuthority is not supported")));
});
