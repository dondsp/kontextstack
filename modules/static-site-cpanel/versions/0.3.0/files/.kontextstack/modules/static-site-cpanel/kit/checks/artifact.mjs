// Inert kit reference. After review, run manually against a disposable/local
// artifact: node artifact.mjs <ARTIFACT_ROOT> <REVIEWED_POLICY_JSON>.
// Reads only. No upload, deletion, archive extraction, Git or network operation.
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const publicExtensions = new Set([".html", ".css", ".js", ".mjs", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".ico", ".woff", ".woff2", ".txt", ".xml", ".webmanifest"]);
const textExtensions = new Set([".html", ".css", ".js", ".mjs", ".svg", ".txt", ".xml", ".webmanifest"]);
function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !/[\\\\:\x00-\x1f]/.test(value) &&
    !value.split("/").some((part) => ["", ".", ".."].includes(part));
}
function forbidden(value) {
  return value.split("/").some((part) => /^\.|^(?:node_modules|uploads|backups|dumps|src|test|tests)$/i.test(part) && part !== ".htaccess") ||
    /\.(?:map|sql|zip|tgz|gz|log|pem|key)$/i.test(value);
}

export async function inspectArtifact(root, policy) {
  if (policy?.schemaVersion !== "kontextstack-static-artifact/v1" ||
      !/^[a-f0-9]{40}$/.test(policy.sourceCommit ?? "") ||
      !Array.isArray(policy.allowedFiles) || !policy.allowedFiles.length ||
      !Array.isArray(policy.requiredFiles) || !policy.requiredFiles.includes("index.html") ||
      !["none", "mailto", "approved-provider", "approved-backend"].includes(policy.formModel) ||
      typeof policy.approvedBy !== "string" || !policy.approvedBy.trim() ||
      new Set(policy.allowedFiles).size !== policy.allowedFiles.length ||
      policy.allowedFiles.some((file) => !safeRelative(file) || forbidden(file)) ||
      policy.requiredFiles.some((file) => !policy.allowedFiles.includes(file))) {
    throw new Error("Artifact policy is incomplete or unsafe; inspect and approve exact public files first.");
  }
  let origin;
  try { origin = new URL(policy.canonicalOrigin); } catch { throw new Error("Canonical origin must be reviewed HTTPS."); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.origin !== policy.canonicalOrigin ||
      /[<>]/.test(policy.canonicalOrigin)) throw new Error("Canonical origin must be reviewed HTTPS.");
  const absolute = path.resolve(root);
  // Refuse links in the selected root and all ancestors.
  for (let cursor = absolute; ; cursor = path.dirname(cursor)) {
    const details = await lstat(cursor);
    if (!details.isDirectory() || details.isSymbolicLink()) throw new Error("Artifact root must be a real directory without symlink ancestors.");
    if (cursor === path.dirname(cursor)) break;
  }
  const files = [];
  async function walk(directory, prefix = "") {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix + entry.name;
      const target = path.join(directory, entry.name);
      const details = await lstat(target);
      if (!safeRelative(relative) || forbidden(relative) || details.isSymbolicLink()) throw new Error("Artifact contains a forbidden path or symlink.");
      if (details.isDirectory()) { await walk(target, relative + "/"); continue; }
      if (!details.isFile() || !policy.allowedFiles.includes(relative)) throw new Error("Artifact contains an undeclared or non-regular file.");
      const extension = path.extname(relative).toLowerCase();
      if (relative !== ".htaccess" && !publicExtensions.has(extension)) throw new Error("Artifact file type is not approved for static publication.");
      if (details.size > 20_000_000) throw new Error("Artifact file exceeds the reviewed size limit.");
      const bytes = await readFile(target);
      if (textExtensions.has(extension) || relative === ".htaccess") {
        const content = bytes.toString("utf8");
        if (/<[A-Z][A-Z0-9_]{2,}>/.test(content) ||
            /localhost|127\.0\.0\.1|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}|\bsk-[A-Za-z0-9_-]{20,}|(?:mysql|postgres):\/\/[^\s]+@/i.test(content) ||
            /\b(?:[A-Z_]*(?:PASSWORD|TOKEN|SECRET)|apiKey)\s*[:=]\s*["'][^"']+["']/i.test(content)) {
          throw new Error("Artifact contains an unresolved input, local origin or secret-like content; values withheld.");
        }
      }
      files.push({ path: relative, bytes: bytes.length, integrity: "sha256-" + createHash("sha256").update(bytes).digest("hex") });
    }
  }
  await walk(absolute);
  if (policy.allowedFiles.some((file) => !files.some((entry) => entry.path === file))) throw new Error("A declared artifact file is missing.");
  return { valid: true, sourceCommit: policy.sourceCommit, files, productionVerified: false, ownerAccepted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error("Provide the local artifact root and reviewed policy JSON.");
    const policy = JSON.parse(await readFile(process.argv[3], "utf8"));
    process.stdout.write(JSON.stringify(await inspectArtifact(process.argv[2], policy), null, 2) + "\n");
  } catch {
    process.stderr.write("Artifact verification failed. Inspect policy and local files; no file contents were printed.\n");
    process.exitCode = 1;
  }
}
