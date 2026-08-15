import { ROOT_DIR } from "../core/constants.js";
import { runGit } from "../core/git.js";
import { canonicalRemoteTrace, parseGitRemotes } from "../installation/verify.js";
import { normalizeInstallationMode } from "../installation/contract.js";

export function coreUpdateGuide(mode = "simple") {
  const selectedMode = normalizeInstallationMode(mode);
  const remotes = parseGitRemotes(runGit(ROOT_DIR, ["remote", "-v"]) ?? "");
  const trace = canonicalRemoteTrace(remotes);
  const branch = runGit(ROOT_DIR, ["branch", "--show-current"]);
  const commit = runGit(ROOT_DIR, ["rev-parse", "HEAD"]);
  const dirtyOutput = runGit(ROOT_DIR, ["status", "--porcelain"]);
  const dirty = dirtyOutput === null ? null : dirtyOutput !== "";

  if (!trace.traceable) {
    return {
      ready: false,
      reason: "No Git remote traces to the canonical dondsp/kontextstack repository.",
      source: { remote: null, branch, commit, dirty },
      commands: ["node bin/kontextstack.js install verify --mode simple"]
    };
  }

  const reasons = [];
  if (dirty === null) reasons.push("KontextStack could not determine whether the checkout is clean.");
  else if (dirty) reasons.push("Review or commit local KontextStack changes before updating.");
  if (branch !== "main") reasons.push("Switch to the main branch before fast-forwarding KontextStack core.");
  return {
    ready: dirty === false && branch === "main",
    reason: reasons.length ? reasons.join(" ") : null,
    source: { remote: trace.remote, url: trace.url, branch, commit, dirty },
    policy: {
      automatic: false,
      strategy: "fetch and fast-forward only",
      rollback: "The previous exact commit remains in Git history; do not reset without reviewing local changes."
    },
    commands: [
      "git status --short",
      "git switch main",
      `git fetch ${trace.remote} main`,
      `git merge --ff-only ${trace.remote}/main`,
      "npm ci --ignore-scripts",
      `node bin/kontextstack.js install verify --mode ${selectedMode}`,
      "npm test",
      "node bin/kontextstack.js modules available"
    ]
  };
}
