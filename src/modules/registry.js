import { readJson } from "../core/json.js";
import { REGISTRY_PATH, ROOT_DIR } from "../core/constants.js";
import path from "node:path";

export async function listAvailableModules() {
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
        bundled: true
      });
    }
  }

  return {
    schemaVersion: registry.schemaVersion,
    source: registry.canonicalSource,
    transport: "bundled",
    modules
  };
}
