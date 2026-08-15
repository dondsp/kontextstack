import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubRepository } from "../src/core/git.js";

test("GitHub repository identity is parsed from HTTPS and SSH remotes", () => {
  assert.equal(parseGitHubRepository("https://github.com/dondsp/kontextstack.git"), "dondsp/kontextstack");
  assert.equal(parseGitHubRepository("git@github.com:dondsp/kontextstack.git"), "dondsp/kontextstack");
  assert.equal(parseGitHubRepository("https://example.com/dondsp/kontextstack.git"), null);
});
