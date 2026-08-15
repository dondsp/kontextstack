import { readJson, handoffContentHash } from "../core/json.js";
import { assertNoSecretValues } from "../core/safety.js";
import { HANDOFF_SCHEMA, HANDOFF_SCHEMA_VERSION } from "../core/constants.js";

const TOP_LEVEL_FIELDS = new Set([
  "schema",
  "schemaVersion",
  "artifactType",
  "artifactId",
  "projectId",
  "createdAt",
  "createdBy",
  "sources",
  "freshness",
  "contentHash",
  "project",
  "classification",
  "goal",
  "authority",
  "constraints",
  "reconciliation",
  "modules"
]);

const SOURCE_TRACKS = new Set(["ai-studio", "chatgpt-sites", "existing-repository", "static-export"]);
const CREATOR_KINDS = new Set(["user", "contextkraft", "coding-agent", "kontextstack"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(errors, value, path) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }
  return true;
}

function requireString(errors, value, path, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    errors.push(`${path} must be ${allowEmpty ? "a string" : "a non-empty string"}.`);
  }
}

function requireStringArray(errors, value, path) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    errors.push(`${path} must be an array of strings.`);
  }
}

function rejectUnknownFields(errors, value, allowed, path) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} is not supported by schema v1.`);
  }
}

export function validateHandoffObject(handoff) {
  const errors = [];

  if (!requireObject(errors, handoff, "handoff")) return { valid: false, errors };
  rejectUnknownFields(errors, handoff, TOP_LEVEL_FIELDS, "handoff");

  if (handoff.schema !== HANDOFF_SCHEMA) errors.push(`schema must be ${HANDOFF_SCHEMA}.`);
  if (handoff.schemaVersion !== HANDOFF_SCHEMA_VERSION) errors.push(`schemaVersion must be ${HANDOFF_SCHEMA_VERSION}.`);
  if (handoff.artifactType !== "handoff-pack") errors.push("artifactType must be handoff-pack.");
  requireString(errors, handoff.artifactId, "artifactId");
  requireString(errors, handoff.projectId, "projectId");
  requireString(errors, handoff.createdAt, "createdAt");
  if (typeof handoff.createdAt === "string" && Number.isNaN(Date.parse(handoff.createdAt))) {
    errors.push("createdAt must be an ISO-8601 date-time.");
  }

  if (requireObject(errors, handoff.createdBy, "createdBy")) {
    if (!CREATOR_KINDS.has(handoff.createdBy.kind)) errors.push("createdBy.kind is unsupported.");
    requireString(errors, handoff.createdBy.name, "createdBy.name");
  }
  if (!Array.isArray(handoff.sources)) errors.push("sources must be an array.");
  requireObject(errors, handoff.freshness, "freshness");

  requireString(errors, handoff.contentHash, "contentHash");
  if (typeof handoff.contentHash === "string" && !/^sha256-[a-f0-9]{64}$/.test(handoff.contentHash)) {
    errors.push("contentHash must be a sha256 integrity value.");
  } else if (handoff.contentHash !== handoffContentHash(handoff)) {
    errors.push("contentHash does not match the canonical Handoff Pack content.");
  }

  if (requireObject(errors, handoff.project, "project")) {
    rejectUnknownFields(errors, handoff.project, new Set(["name", "repository", "expectedBranch", "expectedCommit", "localPath"]), "project");
    requireString(errors, handoff.project.name, "project.name");
    requireString(errors, handoff.project.repository, "project.repository");
    if (typeof handoff.project.repository === "string" && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(handoff.project.repository)) {
      errors.push("project.repository must use owner/repository form.");
    }
    requireString(errors, handoff.project.expectedBranch, "project.expectedBranch");
    if (handoff.project.expectedCommit !== undefined && !/^[a-f0-9]{7,64}$/.test(handoff.project.expectedCommit)) {
      errors.push("project.expectedCommit must be a Git commit identifier.");
    }
    requireString(errors, handoff.project.localPath, "project.localPath", { allowEmpty: true });
  }

  if (requireObject(errors, handoff.classification, "classification")) {
    if (!SOURCE_TRACKS.has(handoff.classification.sourceTrack)) errors.push("classification.sourceTrack is unsupported.");
    if (![0, 1, 2, 3, "unconfirmed"].includes(handoff.classification.maturity)) errors.push("classification.maturity must be 0, 1, 2, 3, or unconfirmed.");
    requireStringArray(errors, handoff.classification.capabilities, "classification.capabilities");
  }

  if (requireObject(errors, handoff.goal, "goal")) {
    requireString(errors, handoff.goal.statement, "goal.statement");
    requireStringArray(errors, handoff.goal.outcomes, "goal.outcomes");
    requireStringArray(errors, handoff.goal.acceptance, "goal.acceptance");
  }

  if (requireObject(errors, handoff.authority, "authority")) {
    for (const field of ["projectInstructions", "projectRecords", "decisions"]) {
      requireStringArray(errors, handoff.authority[field], `authority.${field}`);
    }
  }

  if (requireObject(errors, handoff.constraints, "constraints")) {
    requireStringArray(errors, handoff.constraints.prohibitedActions, "constraints.prohibitedActions");
    if (handoff.constraints.secretPolicy !== "never-print-or-copy-values") errors.push("constraints.secretPolicy must be never-print-or-copy-values.");
    if (handoff.constraints.productionAuthority !== "separate-explicit-approval") errors.push("constraints.productionAuthority must be separate-explicit-approval.");
  }

  if (requireObject(errors, handoff.reconciliation, "reconciliation")) {
    for (const field of ["confirmed", "drift", "conflicts", "unknowns"]) {
      requireStringArray(errors, handoff.reconciliation[field], `reconciliation.${field}`);
    }
  }

  if (requireObject(errors, handoff.modules, "modules")) {
    for (const field of ["allowedCategories", "recommended", "excluded"]) {
      requireStringArray(errors, handoff.modules[field], `modules.${field}`);
    }
  }

  try {
    assertNoSecretValues(handoff);
  } catch (error) {
    errors.push(error.message);
  }

  return { valid: errors.length === 0, errors };
}

export async function loadAndValidateHandoff(filePath) {
  let handoff;
  try {
    handoff = await readJson(filePath);
  } catch {
    throw new Error("Handoff Pack is not readable JSON.");
  }

  const result = validateHandoffObject(handoff);
  if (!result.valid) {
    throw new Error(`Handoff Pack validation failed:\n- ${result.errors.join("\n- ")}`);
  }

  return handoff;
}
