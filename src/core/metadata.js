import { readJson } from "./json.js";
import { runGit } from "./git.js";
import { CANONICAL_SOURCE, MODULE_MANIFEST_PATH, PACKAGE_PATH, ROOT_DIR, SOURCE_MANIFEST_PATH } from "./constants.js";

export async function loadMetadata() {
  const [packageJson, moduleManifest, sourceManifest] = await Promise.all([
    readJson(PACKAGE_PATH),
    readJson(MODULE_MANIFEST_PATH),
    readJson(SOURCE_MANIFEST_PATH)
  ]);

  return {
    name: "KontextStack",
    version: packageJson.version,
    source: CANONICAL_SOURCE,
    cloneUrl: sourceManifest.cloneUrl,
    maintainer: sourceManifest.maintainer,
    license: sourceManifest.license,
    commit: runGit(ROOT_DIR, ["rev-parse", "HEAD"]),
    branch: runGit(ROOT_DIR, ["branch", "--show-current"]),
    dirty: runGit(ROOT_DIR, ["status", "--porcelain"]) !== "",
    module: {
      name: moduleManifest.name,
      version: moduleManifest.version,
      source: moduleManifest.source.repository,
      integrity: moduleManifest.source.integrity
    }
  };
}
