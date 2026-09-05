import { readFile } from "node:fs/promises";
import { validateContractSchema } from "../core/contract-schema.js";
import { integrity, stableStringify } from "../core/json.js";
import { assertNoSecretValues } from "../core/safety.js";
import { validateRelativeTarget } from "../core/paths.js";
import { satisfiesRange } from "../core/semver.js";

const schemas = Object.fromEntries(await Promise.all(["implementation", "guide"].map(async (name) => [
  name, JSON.parse(await readFile(new URL(`../../schemas/module/${name}-v1.json`, import.meta.url), "utf8"))
])));

export function guideContentIntegrity(guide) {
  const value = structuredClone(guide);
  delete value.source.integrity;
  return integrity(stableStringify(value));
}

export function assertContractPath(value) {
  if (typeof value !== "string" || /[\\\\:\x00-\x1f]/.test(value) ||
      value.split("/").some((part) => ["", ".", ".."].includes(part)) ||
      validateRelativeTarget(value) !== value) throw new Error("Contract path must be a confined, canonical relative path.");
  return value;
}

export function assertKitContent(content) {
  // Literal assignments are forbidden; variable references and neutral named
  // placeholders in reference code remain possible. Values are never echoed.
  const assignment = /\b(?:[A-Z_]*(?:PASSWORD|TOKEN|SECRET|PRIVATE_KEY|DATABASE_URL)|password|clientSecret|apiKey)\s*[:=]\s*["']([^"'\r\n]+)["']/gi;
  for (const match of content.matchAll(assignment)) {
    if (!/^(?:<[A-Z][A-Z0-9_]*>|\$\{[A-Z][A-Z0-9_]*\})$/.test(match[1])) {
      throw new Error("Module source contains a protected secret-like assignment.");
    }
  }
}

function parseContract(content, kind) {
  let value;
  try { value = JSON.parse(content); } catch { throw new Error(`Module ${kind} contract is not readable JSON.`); }
  // Validate structured values as well as the source text; do not echo input.
  assertNoSecretValues(value);
  const result = validateContractSchema(value, schemas[kind]);
  if (!result.valid) throw new Error(`Invalid ${kind} contract: ${result.errors.join(" ")}`);
  return value;
}

function uniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} identifier.`);
  return new Set(ids);
}

export function validateModuleContracts({ manifest, files, guideContent }) {
  const declaration = manifest.contracts;
  const implementationPath = `.kontextstack/modules/${manifest.name}/implementation.json`;
  if (!declaration) {
    if (guideContent !== null || files.some((file) => file.target === implementationPath)) {
      throw new Error("Implementation and guide contracts require an explicit manifest declaration.");
    }
    return null; // v0.5.1 planning-only bundles remain readable, unchanged.
  }
  if (declaration.schemaVersion !== "kontextstack-kit/v1" ||
      declaration.implementation !== implementationPath || declaration.guide !== "guide.json" ||
      Object.keys(declaration).sort().join(",") !== "guide,implementation,schemaVersion") {
    throw new Error("Unsupported or invalid implementation-kit declaration.");
  }
  // Old cores ignore contracts; they must never consider these bundles compatible.
  if (satisfiesRange("0.5.1", manifest.coreCompatibility)) throw new Error("Implementation kits must exclude legacy core 0.5.1.");
  const implementationFile = files.find((file) => file.target === implementationPath);
  if (!implementationFile || guideContent === null) throw new Error("Implementation kit is missing a declared contract.");
  const implementation = parseContract(implementationFile.content, "implementation");
  const guide = parseContract(guideContent, "guide");
  for (const contract of [implementation, guide]) {
    if (contract.module.name !== manifest.name || contract.module.version !== manifest.version) throw new Error("Contract module identity mismatch.");
  }
  if (!satisfiesRange(guide.package.version, manifest.coreCompatibility)) throw new Error("Guide package version is incompatible with the module.");
  if (stableStringify(implementation.requires) !== stableStringify(manifest.dependencies) ||
      stableStringify(implementation.optional) !== stableStringify(manifest.optionalDependencies) ||
      stableStringify(guide.prerequisites) !== stableStringify(manifest.dependencies)) {
    throw new Error("Contract dependency declarations must match the module manifest.");
  }
  if (guide.maturity.some((level) => !manifest.maturity.includes(level))) throw new Error("Guide maturity is outside module compatibility.");
  if (guide.durationMinutes.min > guide.durationMinutes.max) throw new Error("Invalid guide duration range.");
  const targets = new Set(files.map((file) => file.target));
  const kitRoot = `.kontextstack/modules/${manifest.name}/kit/`;
  for (const file of files) assertContractPath(file.target);
  for (const change of implementation.projectChanges) {
    assertContractPath(change.projectPath);
    for (const template of change.templates) {
      assertContractPath(template);
      if (!template.startsWith(kitRoot) || !targets.has(template)) throw new Error("Referenced template must exist in the module-owned kit.");
    }
  }
  for (const source of implementation.sources) assertContractPath(source.path);
  const names = { start: "START_HERE", implementation: "IMPLEMENTATION", provider: "PROVIDER_SETUP", verification: "VERIFICATION", rollback: "ROLLBACK", codex: "CODEX_PROMPT" };
  for (const [role, filename] of Object.entries(names)) {
    const target = guide.documents[role];
    if (target !== `docs/kontextstack/modules/${manifest.name}/${filename}.md` || !targets.has(target)) {
      throw new Error("Guide document must exist at its module-owned canonical path.");
    }
  }
  for (const field of ["projectEvidence", "decisions", "projectChanges", "externalActions", "approvalGates", "checks", "rollback", "acceptance"]) uniqueIds(implementation[field], field);
  const gates = new Set(implementation.approvalGates.map((item) => item.id));
  for (const action of implementation.externalActions) {
    if (!gates.has(action.approvalGate)) throw new Error("External action requires a declared approval gate.");
  }
  const checks = new Set(implementation.checks.map((item) => item.id));
  for (const criterion of implementation.acceptance) {
    if (criterion.evidence.some((id) => !checks.has(id))) throw new Error("Acceptance references an unknown check.");
  }
  for (const check of implementation.checks) {
    if (check.kind === "provider" && check.authority !== "separate-explicit-approval") throw new Error("Provider checks require explicit authority.");
  }
  uniqueIds(guide.questions, "question");
  const stages = uniqueIds(guide.stages, "stage");
  uniqueIds(guide.commands, "command");
  for (const question of guide.questions) {
    const choice = ["choice", "multi-choice"].includes(question.answer.type);
    if (choice !== (question.answer.options.length > 0)) throw new Error("Question answer shape and choices disagree.");
  }
  for (const stage of guide.stages) {
    if (["provider", "accept"].includes(stage.kind) && stage.approval !== "separate-explicit-approval") throw new Error("Provider and acceptance stages require explicit approval.");
    if (stage.kind === "install" && stage.approval !== "exact-preview") throw new Error("Installation stage requires exact preview approval.");
  }
  for (const command of guide.commands) {
    if (!stages.has(command.stage)) throw new Error("Command references an unknown guide stage.");
    const placeholders = [...new Set(command.text.match(/<[A-Z][A-Z0-9_]*>/g) ?? [])].sort();
    if (stableStringify(placeholders) !== stableStringify([...command.placeholders].sort())) throw new Error("Command placeholder declarations do not match its text.");
  }
  if (guide.source.implementationIntegrity !== implementationFile.integrity || guide.source.integrity !== guideContentIntegrity(guide)) {
    throw new Error("Guide content or implementation integrity mismatch.");
  }
  return { implementation, guide };
}
