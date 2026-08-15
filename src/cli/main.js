import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { loadAndValidateHandoff } from "../handoff/validate.js";
import { publicInspection, inspectProject } from "../inspection/inspect-project.js";
import { createPlan, publicPlan } from "../planning/create-plan.js";
import { applyApprovedPlan } from "../planning/apply-plan.js";
import { verifyProject } from "../verification/verify-project.js";
import { listAvailableModules } from "../modules/registry.js";
import { loadMetadata } from "../core/metadata.js";
import { MODULE_MANIFEST_PATH, PACKAGE_PATH, REGISTRY_PATH, ROOT_DIR } from "../core/constants.js";

const HELP = `KontextStack — local-first ContextKraft handoff toolkit

Usage:
  kontextstack about
  kontextstack doctor
  kontextstack validate --handoff <file>
  kontextstack inspect --project <directory>
  kontextstack preview --project <directory> --handoff <file>
  kontextstack apply --project <directory> --handoff <file> --approve <preview-id>
  kontextstack verify --project <directory>
  kontextstack modules available

Preview is read-only. Apply writes only the exact project-owned handoff files
listed in the approved preview. KontextStack does not commit, push, or deploy.
`;

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}.`);
    flags[key] = value;
    index += 1;
  }
  return { positionals, flags };
}

function requireFlag(flags, name) {
  if (!flags[name]) throw new Error(`--${name} is required.`);
  return flags[name];
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function pathCheck(label, filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return { label, ok: true };
  } catch {
    return { label, ok: false, reason: "missing or unreadable" };
  }
}

async function doctor() {
  const major = Number(process.versions.node.split(".")[0]);
  const checks = [
    { label: "Node.js 20 or newer", ok: major >= 20, actual: process.versions.node },
    await pathCheck("package metadata", PACKAGE_PATH),
    await pathCheck("module registry", REGISTRY_PATH),
    await pathCheck("handoff-core manifest", MODULE_MANIFEST_PATH),
    await pathCheck("handoff schema", path.join(ROOT_DIR, "schemas", "handoff", "v1.json"))
  ];
  const registry = await listAvailableModules();
  checks.push({
    label: "bundled module integrity",
    ok: registry.modules.every((module) => /^sha256-[a-f0-9]{64}$/.test(module.integrity) && !module.integrity.endsWith("0".repeat(64)))
  });
  return { healthy: checks.every((check) => check.ok), checks };
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const [command, subcommand] = positionals;

  if (!command || command === "help" || command === "--help") {
    process.stdout.write(HELP);
    return;
  }

  if (command === "about") {
    output(await loadMetadata());
    return;
  }

  if (command === "doctor") {
    const result = await doctor();
    output(result);
    if (!result.healthy) process.exitCode = 1;
    return;
  }

  if (command === "validate") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output({ valid: true, artifactId: handoff.artifactId, contentHash: handoff.contentHash, schemaVersion: handoff.schemaVersion });
    return;
  }

  if (command === "inspect") {
    output(publicInspection(await inspectProject(requireFlag(flags, "project"))));
    return;
  }

  if (command === "preview") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output(publicPlan(await createPlan({ projectPath: requireFlag(flags, "project"), handoff })));
    return;
  }

  if (command === "apply") {
    const handoff = await loadAndValidateHandoff(requireFlag(flags, "handoff"));
    output(await applyApprovedPlan({
      projectPath: requireFlag(flags, "project"),
      handoff,
      approval: requireFlag(flags, "approve")
    }));
    return;
  }

  if (command === "verify") {
    const result = await verifyProject(requireFlag(flags, "project"));
    output(result);
    if (!result.valid) process.exitCode = 1;
    return;
  }

  if (command === "modules" && subcommand === "available") {
    output(await listAvailableModules());
    return;
  }

  if (command === "modules" && subcommand === "refresh") {
    throw new Error("Remote registry refresh is not available in 0.1.0-alpha.1; the bundled registry remains active.");
  }

  throw new Error(`Unknown command: ${positionals.join(" ")}. Run kontextstack help.`);
}
