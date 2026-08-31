import { spawnSync } from "node:child_process";

export function runGit(cwd, args) {
  const result = spawnSync("git", ["-c", "core.fsmonitor=false", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function parseGitHubRepository(remote) {
  if (!remote) return null;
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return match ? `${match[1]}/${match[2]}` : null;
}
