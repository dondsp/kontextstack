import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules", "coverage", "dist", "tmp"]);
const deniedNames = [
  /^\.env(?:\.|$)/,
  /credentials?/i,
  /database.*dump/i,
  /\.sql$/i,
  /\.pem$/i,
  /id_rsa/i
];
const deniedContent = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/
];

const findings = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute);
    const details = await lstat(absolute);

    if (details.isSymbolicLink()) {
      findings.push(`${relative}: symbolic links are not allowed in the public artifact.`);
      continue;
    }
    if (entry.isDirectory()) {
      await scan(absolute);
      continue;
    }
    if (!entry.isFile()) continue;

    if (deniedNames.some((pattern) => pattern.test(entry.name)) && relative !== ".env.example") {
      findings.push(`${relative}: denied sensitive filename category.`);
    }

    if (details.size > 2_000_000) {
      findings.push(`${relative}: file exceeds the 2 MB clean-room limit.`);
      continue;
    }

    const content = await readFile(absolute, "utf8").catch(() => null);
    if (content && deniedContent.some((pattern) => pattern.test(content))) {
      findings.push(`${relative}: denied private-path or secret-like content category.`);
    }
  }
}

await scan(root);

if (findings.length) {
  process.stderr.write(`Source audit failed:\n- ${findings.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Source audit passed: no denied private-path, secret, dump, or symlink categories found.\n");
}
