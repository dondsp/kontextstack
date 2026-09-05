import os from "node:os";
import path from "node:path";
import { access, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { loadPortableBundle } from "./bundle.js";
import { stableStringify } from "../core/json.js";

export const DEFAULT_MODULE_CACHE = path.join(os.homedir(), ".kontextstack", "module-cache", "v1");

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function moduleCachePath(cacheDir, name, version) {
  return path.join(path.resolve(cacheDir), name, version);
}

export async function importPortableModule({ sourcePath, cacheDir = DEFAULT_MODULE_CACHE }) {
  const sourceRoot = path.resolve(sourcePath);
  const bundle = await loadPortableBundle(sourceRoot);
  const destination = moduleCachePath(cacheDir, bundle.manifest.name, bundle.manifest.version);
  if (await exists(destination)) {
    const existing = await loadPortableBundle(destination);
    if (existing.computedIntegrity === bundle.computedIntegrity) {
      return {
        imported: false,
        preserved: true,
        name: bundle.manifest.name,
        version: bundle.manifest.version,
        integrity: bundle.computedIntegrity,
        cachePath: destination
      };
    }
    throw new Error(`Module cache conflict at ${destination}; the same name and version has different content.`);
  }

  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const temporary = path.join(parent, `.import-${bundle.manifest.version}-${process.pid}-${Date.now()}`);
  await mkdir(temporary, { recursive: false });
  try {
    await writeFile(path.join(temporary, "module.json"), `${stableStringify(bundle.manifest, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644
    });
    for (const file of [...bundle.files, ...bundle.metadataFiles]) {
      const target = path.join(temporary, file.source);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content, { encoding: "utf8", flag: "wx", mode: 0o644 });
    }
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }

  return {
    imported: true,
    preserved: false,
    name: bundle.manifest.name,
    version: bundle.manifest.version,
    integrity: bundle.computedIntegrity,
    cachePath: destination
  };
}

export async function listImportedModules(cacheDir = DEFAULT_MODULE_CACHE) {
  if (!(await exists(cacheDir))) return [];
  const modules = [];
  for (const nameEntry of await readdir(cacheDir, { withFileTypes: true })) {
    if (!nameEntry.isDirectory() || nameEntry.isSymbolicLink()) continue;
    const nameRoot = path.join(cacheDir, nameEntry.name);
    for (const versionEntry of await readdir(nameRoot, { withFileTypes: true })) {
      if (!versionEntry.isDirectory() || versionEntry.isSymbolicLink()) continue;
      const root = path.join(nameRoot, versionEntry.name);
      try {
        const bundle = await loadPortableBundle(root);
        modules.push({
          name: bundle.manifest.name,
          version: bundle.manifest.version,
          status: "imported",
          category: bundle.manifest.category,
          description: bundle.manifest.description,
          coreCompatibility: bundle.manifest.coreCompatibility,
          source: bundle.manifest.source.repository,
          integrity: bundle.computedIntegrity,
          bundled: false,
          portable: true,
          root
        });
      } catch {
        // Invalid cache entries stay unavailable and cannot be executed.
      }
    }
  }
  return modules;
}
