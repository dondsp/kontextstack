import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { parseGitHubRepository, runGit } from "../core/git.js";
import { resolveProjectRoot } from "../core/paths.js";

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readPackageSummary(projectRoot) {
  const packagePath = path.join(projectRoot, "package.json");
  if (!(await exists(packagePath))) return null;
  try {
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
    return {
      name: typeof packageJson.name === "string" ? packageJson.name : null,
      type: typeof packageJson.type === "string" ? packageJson.type : null,
      scripts: Object.keys(packageJson.scripts ?? {}).sort()
    };
  } catch {
    return { unreadable: true };
  }
}

export async function inspectProject(inputPath) {
  const root = await resolveProjectRoot(inputPath);
  const gitRoot = runGit(root, ["rev-parse", "--show-toplevel"]);
  const isGitRepository = Boolean(gitRoot);
  const remote = isGitRepository ? runGit(root, ["remote", "get-url", "origin"]) : null;
  const status = isGitRepository ? runGit(root, ["status", "--porcelain"]) : null;

  const markers = {
    packageJson: await exists(path.join(root, "package.json")),
    staticIndex: await exists(path.join(root, "index.html")),
    viteConfig: (await exists(path.join(root, "vite.config.js"))) || (await exists(path.join(root, "vite.config.ts"))),
    nextConfig: (await exists(path.join(root, "next.config.js"))) || (await exists(path.join(root, "next.config.mjs"))),
    envExample: await exists(path.join(root, ".env.example")),
    githubActions: await exists(path.join(root, ".github", "workflows")),
    contextRecords: await exists(path.join(root, ".kontextstack", "project.json"))
  };

  let projectType = "unknown";
  if (markers.nextConfig || markers.viteConfig || markers.packageJson) projectType = "web-app";
  else if (markers.staticIndex) projectType = "website";

  return {
    root,
    git: {
      repository: isGitRepository,
      root: gitRoot,
      branch: isGitRepository ? runGit(root, ["branch", "--show-current"]) : null,
      commit: isGitRepository ? runGit(root, ["rev-parse", "HEAD"]) : null,
      dirty: isGitRepository ? Boolean(status) : null,
      remoteRepository: parseGitHubRepository(remote)
    },
    projectType,
    package: await readPackageSummary(root),
    markers
  };
}

export function publicInspection(snapshot) {
  return {
    root: snapshot.root,
    git: snapshot.git,
    projectType: snapshot.projectType,
    package: snapshot.package,
    markers: snapshot.markers
  };
}
