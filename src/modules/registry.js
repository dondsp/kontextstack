import { readJson } from "../core/json.js";
import { REGISTRY_PATH, ROOT_DIR } from "../core/constants.js";
import path from "node:path";
import { compareVersions, satisfiesRange } from "../core/semver.js";
import { DEFAULT_MODULE_CACHE, listImportedModules } from "./cache.js";
import { loadPortableBundle } from "./bundle.js";

export async function listAvailableModules({ cacheDir = DEFAULT_MODULE_CACHE, includeLocations = false } = {}) {
  const registry = await readJson(REGISTRY_PATH);
  const modules = [];

  for (const entry of registry.modules) {
    for (const version of entry.versions) {
      const manifest = await readJson(path.join(ROOT_DIR, version.manifestPath));
      modules.push({
        name: entry.name,
        version: version.version,
        status: version.status,
        category: manifest.category,
        description: manifest.description,
        coreCompatibility: version.coreCompatibility,
        source: manifest.source.repository,
        integrity: version.integrity,
        bundled: true,
        portable: false,
        ...(includeLocations ? { manifestPath: path.join(ROOT_DIR, version.manifestPath) } : {})
      });
    }
  }

  const imported = await listImportedModules(cacheDir);
  modules.push(...imported.map((module) => {
    if (includeLocations) return module;
    const { root, ...publicModule } = module;
    return publicModule;
  }));
  modules.sort((left, right) => left.name.localeCompare(right.name) || compareVersions(right.version, left.version));

  return {
    schemaVersion: registry.schemaVersion,
    source: registry.canonicalSource,
    transport: modules.some((module) => !module.bundled) ? "bundled+filesystem-cache" : "bundled",
    modules
  };
}

export async function resolveModule({ name, version = null, cacheDir = DEFAULT_MODULE_CACHE, coreVersion = null }) {
  const registry = await listAvailableModules({ cacheDir, includeLocations: true });
  let candidates = registry.modules.filter((module) => module.name === name && module.status !== "revoked");
  if (version) candidates = candidates.filter((module) => module.version === version);
  if (coreVersion) candidates = candidates.filter((module) => satisfiesRange(coreVersion, module.coreCompatibility));
  candidates.sort((left, right) => compareVersions(right.version, left.version));
  const selected = candidates[0];
  if (!selected) throw new Error(`No compatible module found for ${name}${version ? `@${version}` : ""}.`);

  if (selected.portable) return loadPortableBundle(selected.root);
  const manifest = await readJson(selected.manifestPath);
  return {
    root: path.dirname(selected.manifestPath),
    manifest,
    files: [],
    computedIntegrity: selected.integrity,
    portable: false,
    bundled: true
  };
}
