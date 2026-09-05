import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { integrity, stableStringify } from "../../src/core/json.js";
import { guideContentIntegrity } from "../../src/modules/contracts.js";
import { fingerprintPortableBundle } from "../../src/modules/bundle.js";

export async function writeJson(target, value) {
  await writeFile(target, stableStringify(value, 2) + "\n");
}

export async function makeKit() {
  const root = await mkdtemp(path.join(os.tmpdir(), "kontextstack-kit-"));
  const implementation = JSON.parse(await readFile(new URL("../fixtures/contracts/implementation.json", import.meta.url)));
  const guide = JSON.parse(await readFile(new URL("../fixtures/contracts/guide.json", import.meta.url)));
  const manifest = JSON.parse(await readFile(new URL("../../modules/domain-cpanel/module.json", import.meta.url)));
  Object.assign(manifest, {
    name: "fixture-kit", version: "1.1.0", coreCompatibility: ">=0.6.0-alpha.1 <0.7.0",
    dependencies: [], optionalDependencies: [],
    source: { repository: "https://github.com/dondsp/kontextstack", ref: "module/fixture-kit/v1.1.0", path: "modules/fixture-kit", integrity: "sha256-" + "0".repeat(64) },
    contracts: { schemaVersion: "kontextstack-kit/v1", implementation: ".kontextstack/modules/fixture-kit/implementation.json", guide: "guide.json" },
    files: [], permissions: { network: false, commands: [], writePatterns: [] },
    maturity: [1, 2, 3],
    upgrade: { from: ["1.0.0"], strategy: "preview-required" }
  });
  const content = new Map([
    [manifest.contracts.implementation, stableStringify(implementation, 2) + "\n"],
    [".kontextstack/modules/fixture-kit/decision.json", "{}\n"],
    [".kontextstack/modules/fixture-kit/kit/templates/redirect.htaccess", "# Adapt to <CANONICAL_HOST> after inspection.\n"],
    ...Object.values(guide.documents).map((target) => [target, "# Synthetic KontextStack guidance\n"])
  ]);
  for (const [target, text] of content) {
    const source = "files/" + target;
    manifest.files.push({ path: target, source });
    manifest.permissions.writePatterns.push(target);
    await mkdir(path.dirname(path.join(root, source)), { recursive: true });
    await writeFile(path.join(root, source), text);
  }
  guide.source.implementationIntegrity = integrity(content.get(manifest.contracts.implementation));
  guide.source.integrity = guideContentIntegrity(guide);
  await writeJson(path.join(root, "guide.json"), guide);
  await writeJson(path.join(root, "module.json"), manifest);
  manifest.source.integrity = (await fingerprintPortableBundle(root)).integrity;
  await writeJson(path.join(root, "module.json"), manifest);
  return { root, manifest, implementation, guide };
}

export async function updateImplementation(kit, mutate) {
  mutate(kit.implementation);
  await writeJson(path.join(kit.root, "files", kit.manifest.contracts.implementation), kit.implementation);
}
