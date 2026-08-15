import path from "node:path";
import { lstat, realpath, stat } from "node:fs/promises";

export function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function resolveProjectRoot(inputPath) {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("A target project path is required.");
  }

  const resolved = await realpath(path.resolve(inputPath));
  const details = await stat(resolved);
  if (!details.isDirectory()) {
    throw new Error("The target project path must be a directory.");
  }
  return resolved;
}

export function validateRelativeTarget(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("A generated target path is required.");
  }
  if (path.isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new Error("Generated target paths must be safe relative paths.");
  }

  const normalized = path.normalize(relativePath);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    throw new Error("Generated target paths may not escape the project root.");
  }
  return normalized;
}

export async function safeTargetPath(projectRoot, relativePath) {
  const normalized = validateRelativeTarget(relativePath);
  const destination = path.resolve(projectRoot, normalized);
  if (!isInside(projectRoot, destination)) {
    throw new Error("Generated target path escapes the project root.");
  }

  let cursor = path.dirname(destination);
  while (isInside(projectRoot, cursor) && cursor !== projectRoot) {
    try {
      const details = await lstat(cursor);
      if (details.isSymbolicLink()) {
        throw new Error(`Generated target ancestor is a symbolic link: ${path.relative(projectRoot, cursor)}`);
      }
      cursor = path.dirname(cursor);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      cursor = path.dirname(cursor);
    }
  }

  return destination;
}
