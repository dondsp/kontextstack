import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stableStringify } from "../src/core/json.js";
import { compareVersions, satisfiesRange } from "../src/core/semver.js";
import { fingerprintPortableBundle } from "../src/modules/bundle.js";
import { importPortableModule } from "../src/modules/cache.js";
import { listAvailableModules } from "../src/modules/registry.js";
import {
  applyModulePlan,
  createModulePlan,
  inspectModule,
  listInstalledModules,
  verifyProjectModules
} from "../src/modules/lifecycle.js";
import { commitAll, makeCleanProject } from "./support/project.js";

const target = "docs/kontextstack/modules/domain-guide/README.md";
const source = `files/${target}`;

async function makeBundle({ version, content, upgradeFrom = [] }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "kontextstack-module-"));
  const manifest = {
    schemaVersion: "1.0.0",
    name: "domain-guide",
    displayName: "Domain Guide",
    version,
    description: "Safe, project-owned domain planning guidance.",
    category: "hosting",
    maturity: [0, 1, 2, 3],
    projectTypes: ["website", "web-app", "service", "unknown"],
    coreCompatibility: ">=0.1.0-alpha.1 <0.2.0",
    source: {
      repository: "https://github.com/dondsp/kontextstack",
      ref: `module/domain-guide/v${version}`,
      path: "modules/domain-guide",
      integrity: `sha256-${"0".repeat(64)}`
    },
    dependencies: [],
    optionalDependencies: [],
    conflicts: [],
    capabilities: ["docs", "validation"],
    permissions: { network: false, commands: [], writePatterns: [target] },
    files: [{ path: target, source }],
    validations: [{ id: "domain-guide-readable", kind: "contains", path: target, value: "KontextStack" }],
    upgrade: { from: upgradeFrom, strategy: "preview-required" }
  };
  await mkdir(path.join(root, path.dirname(source)), { recursive: true });
  await writeFile(path.join(root, source), content, "utf8");
  await writeFile(path.join(root, "module.json"), `${stableStringify(manifest, 2)}\n`, "utf8");
  const fingerprint = await fingerprintPortableBundle(root);
  manifest.source.integrity = fingerprint.integrity;
  await writeFile(path.join(root, "module.json"), `${stableStringify(manifest, 2)}\n`, "utf8");
  return root;
}

async function initializeModuleLock(projectRoot) {
  const lock = {
    schemaVersion: "1.0.0",
    core: {
      version: "0.1.0-alpha.1",
      source: "https://github.com/dondsp/kontextstack",
      commit: "fixture-core-commit"
    },
    modules: []
  };
  await mkdir(path.join(projectRoot, ".kontextstack"), { recursive: true });
  await writeFile(path.join(projectRoot, ".kontextstack", "modules.lock.json"), `${stableStringify(lock, 2)}\n`, "utf8");
  commitAll(projectRoot, "test: initialize KontextStack module lock");
}

test("semantic compatibility supports the alpha core range", () => {
  assert.equal(compareVersions("0.1.0-alpha.1", "0.1.0-alpha.2"), -1);
  assert.equal(compareVersions("0.1.0", "0.1.0-alpha.2"), 1);
  assert.equal(satisfiesRange("0.1.0-alpha.1", ">=0.1.0-alpha.1 <0.2.0"), true);
  assert.equal(satisfiesRange("0.2.0", ">=0.1.0-alpha.1 <0.2.0"), false);
});

test("filesystem import is exact, idempotent and discoverable", async (t) => {
  const cache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-cache-"));
  const bundle = await makeBundle({ version: "1.0.0", content: "# KontextStack Domain Guide\n" });
  const conflictingBundle = await makeBundle({ version: "1.0.0", content: "# Different content for the same version\n" });
  t.after(() => Promise.all([
    rm(cache, { recursive: true, force: true }),
    rm(bundle, { recursive: true, force: true }),
    rm(conflictingBundle, { recursive: true, force: true })
  ]));

  const first = await importPortableModule({ sourcePath: bundle, cacheDir: cache });
  const second = await importPortableModule({ sourcePath: bundle, cacheDir: cache });
  assert.equal(first.imported, true);
  assert.equal(second.preserved, true);
  await assert.rejects(
    importPortableModule({ sourcePath: conflictingBundle, cacheDir: cache }),
    /different content/
  );

  const available = await listAvailableModules({ cacheDir: cache });
  assert.ok(available.modules.some((entry) => entry.name === "handoff-core" && entry.bundled));
  assert.ok(available.modules.some((entry) => entry.name === "domain-guide" && entry.portable));

  const inspection = await inspectModule({ name: "domain-guide", cacheDir: cache });
  assert.equal(inspection.module.coreCompatible, true);
  assert.equal(inspection.module.permissions.network, false);
  assert.equal(inspection.module.files[0].path, target);
});

test("portable bundles cannot write outside their module-owned namespace", async (t) => {
  const bundle = await makeBundle({ version: "1.0.0", content: "# Safe initial content\n" });
  t.after(() => rm(bundle, { recursive: true, force: true }));
  const manifestPath = path.join(bundle, "module.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files[0].path = "server.js";
  manifest.permissions.writePatterns = ["server.js"];
  await writeFile(manifestPath, `${stableStringify(manifest, 2)}\n`, "utf8");
  await assert.rejects(fingerprintPortableBundle(bundle), /owned namespace/);
});

test("portable bundles reject secret-like file content without printing it", async (t) => {
  const bundle = await makeBundle({ version: "1.0.0", content: "# Safe initial content\n" });
  t.after(() => rm(bundle, { recursive: true, force: true }));
  const protectedValue = `sk-${"x".repeat(24)}`;
  await writeFile(path.join(bundle, source), `${protectedValue}\n`, "utf8");

  await assert.rejects(
    fingerprintPortableBundle(bundle),
    (error) => error.message.includes("protected secret-like value") && !error.message.includes(protectedValue)
  );
});

test("module preview, approved apply, lock update and verification are deterministic", async (t) => {
  const cache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-cache-"));
  const bundle = await makeBundle({ version: "1.0.0", content: "# KontextStack Domain Guide v1\n" });
  const project = await makeCleanProject();
  t.after(() => Promise.all([
    rm(cache, { recursive: true, force: true }),
    rm(bundle, { recursive: true, force: true }),
    rm(project, { recursive: true, force: true })
  ]));
  await initializeModuleLock(project);
  await importPortableModule({ sourcePath: bundle, cacheDir: cache });

  const first = await createModulePlan({ projectPath: project, name: "domain-guide", cacheDir: cache });
  const second = await createModulePlan({ projectPath: project, name: "domain-guide", cacheDir: cache });
  assert.equal(first.status, "ready");
  assert.equal(first.previewId, second.previewId);
  assert.equal(first.actions[0].action, "add");
  assert.equal(first.lock.action, "update");

  await assert.rejects(
    applyModulePlan({ projectPath: project, name: "domain-guide", cacheDir: cache, approval: "sha256-wrong" }),
    /exactly match/
  );
  const applied = await applyModulePlan({
    projectPath: project,
    name: "domain-guide",
    cacheDir: cache,
    approval: first.previewId
  });
  assert.deepEqual(applied.added, [target]);
  assert.equal(applied.lockUpdated, true);

  const verification = await verifyProjectModules(project);
  assert.equal(verification.valid, true);
  const installed = await listInstalledModules(project);
  assert.equal(installed.modules[0].name, "domain-guide");
  assert.equal(installed.modules[0].exactFileIntegrity, true);
});

test("declared upgrades update untouched files and block customized files", async (t) => {
  const cache = await mkdtemp(path.join(os.tmpdir(), "kontextstack-cache-"));
  const v1 = await makeBundle({ version: "1.0.0", content: "# KontextStack Domain Guide v1\n" });
  const v2 = await makeBundle({ version: "1.1.0", content: "# KontextStack Domain Guide v2\n", upgradeFrom: ["1.0.0"] });
  const v3 = await makeBundle({ version: "1.2.0", content: "# KontextStack Domain Guide v3\n", upgradeFrom: ["1.1.0"] });
  const project = await makeCleanProject();
  t.after(() => Promise.all([
    rm(cache, { recursive: true, force: true }),
    rm(v1, { recursive: true, force: true }),
    rm(v2, { recursive: true, force: true }),
    rm(v3, { recursive: true, force: true }),
    rm(project, { recursive: true, force: true })
  ]));
  await initializeModuleLock(project);
  for (const bundle of [v1, v2, v3]) await importPortableModule({ sourcePath: bundle, cacheDir: cache });

  const first = await createModulePlan({ projectPath: project, name: "domain-guide", version: "1.0.0", cacheDir: cache });
  await applyModulePlan({ projectPath: project, name: "domain-guide", version: "1.0.0", cacheDir: cache, approval: first.previewId });
  commitAll(project, "test: apply domain guide v1");

  const upgrade = await createModulePlan({ projectPath: project, name: "domain-guide", version: "1.1.0", cacheDir: cache });
  assert.equal(upgrade.status, "ready");
  assert.equal(upgrade.actions[0].action, "update");
  await applyModulePlan({ projectPath: project, name: "domain-guide", version: "1.1.0", cacheDir: cache, approval: upgrade.previewId });
  assert.match(await readFile(path.join(project, target), "utf8"), /v2/);
  commitAll(project, "test: upgrade domain guide to v2");

  await writeFile(path.join(project, target), "# Project-owned customization\n", "utf8");
  commitAll(project, "test: customize domain guide");
  const blocked = await createModulePlan({ projectPath: project, name: "domain-guide", version: "1.2.0", cacheDir: cache });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.conflicts.some((entry) => entry.includes("customized")));
});
