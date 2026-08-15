import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }

  return value;
}

export function stableStringify(value, spacing = 0) {
  return JSON.stringify(stableValue(value), null, spacing);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function integrity(value) {
  return `sha256-${sha256(value)}`;
}

export async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export function handoffContentHash(handoff) {
  const hashable = structuredClone(handoff);
  delete hashable.contentHash;
  return integrity(stableStringify(hashable));
}
