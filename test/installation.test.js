import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadInstallationContract, normalizeInstallationMode } from "../src/installation/contract.js";
import { canonicalRemoteTrace, parseGitRemotes, verifyInstallation } from "../src/installation/verify.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("installation contract exposes deterministic simple and mature paths", async () => {
  const simple = await loadInstallationContract("simple");
  const mature = await loadInstallationContract("mature");

  assert.equal(simple.mode, "simple");
  assert.equal(simple.name, "KontextStack installation contract");
  assert.equal(simple.profile.verificationProfile, "core");
  assert.equal(mature.mode, "mature");
  assert.equal(mature.profile.verificationProfile, "extended");
  assert.equal(simple.commands[0], "git clone https://github.com/dondsp/kontextstack.git");
  assert.match(mature.commands.join("\n"), /install verify --mode mature/);
  assert.throws(() => normalizeInstallationMode("enterprise"), /simple or mature/);
});

test("canonical source trace accepts origin or upstream and rejects detached copies", () => {
  const remotes = parseGitRemotes([
    "origin git@github.com:someone/kontextstack.git (fetch)",
    "origin git@github.com:someone/kontextstack.git (push)",
    "upstream https://github.com/dondsp/kontextstack.git (fetch)",
    "upstream https://github.com/dondsp/kontextstack.git (push)"
  ].join("\n"));

  assert.deepEqual(canonicalRemoteTrace(remotes), {
    traceable: true,
    remote: "upstream",
    url: "https://github.com/dondsp/kontextstack.git"
  });
  assert.equal(canonicalRemoteTrace(remotes.filter((remote) => remote.name === "origin")).traceable, false);
});

test("the repository satisfies both read-only installation profiles", async () => {
  const simple = await verifyInstallation({ mode: "simple" });
  const mature = await verifyInstallation({ mode: "mature" });

  assert.equal(simple.valid, true);
  assert.equal(simple.source.traceable, true);
  assert.equal(simple.source.remote, "origin");
  assert.equal(simple.suggestions.length, 0);
  assert.equal(mature.valid, true);
  assert.ok(mature.checks.some((entry) => entry.id === "extended-operations" && entry.ok));
  assert.ok(mature.checks.some((entry) => entry.id === "clean-checkout" && entry.required === false));
});

test("CLI returns the machine-readable installation contract", () => {
  const result = spawnSync(process.execPath, ["bin/kontextstack.js", "install", "contract", "--mode", "simple"], {
    cwd: root,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, "simple");
  assert.equal(output.canonicalSource, "https://github.com/dondsp/kontextstack");
});
