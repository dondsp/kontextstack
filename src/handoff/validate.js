import { readJson, handoffContentHash } from "../core/json.js";
import { assertNoSecretValues } from "../core/safety.js";
import {
  HANDOFF_SCHEMA,
  HANDOFF_SCHEMA_VERSION,
  LEGACY_HANDOFF_SCHEMA,
  LEGACY_HANDOFF_SCHEMA_VERSION,
  SUPPORTED_HANDOFF_SCHEMAS
} from "../core/constants.js";

const V1_TOP_LEVEL_FIELDS = new Set([
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
const V2_TOP_LEVEL_FIELDS = new Set([...V1_TOP_LEVEL_FIELDS, "architecture"]);

const SOURCE_TRACKS = new Set(["ai-studio", "chatgpt-sites", "existing-repository", "static-export"]);
const CREATOR_KINDS = new Set(["user", "contextkraft", "coding-agent", "kontextstack"]);
const REPOSITORY_STRATEGIES = new Set(["reuse-existing", "new-standalone", "multiple-independent", "temporary-split"]);
const RELEASE_UNITS = new Set(["unified", "independent", "temporary-split"]);
const RELATED_REPOSITORY_STATUSES = new Set(["active", "candidate", "rollback-evidence", "retired"]);

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

function rejectUnknownFields(errors, value, allowed, path, schemaLabel) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} is not supported by ${schemaLabel}.`);
  }
}

function validRepository(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
}

function validateArchitecture(errors, architecture, projectRepository, schemaLabel) {
  if (!requireObject(errors, architecture, "architecture")) return;
  rejectUnknownFields(errors, architecture, new Set([
    "decisionStatus",
    "repositoryStrategy",
    "releaseUnit",
    "canonicalRepository",
    "relatedRepositories",
    "sharedCapabilities",
    "systemsOfRecord",
    "separationJustification",
    "temporaryBridges",
    "reopenTriggers",
    "decisionRecord"
  ]), "architecture", schemaLabel);

  if (architecture.decisionStatus !== "approved") {
    errors.push("architecture.decisionStatus must be approved before handoff.");
  }
  if (!REPOSITORY_STRATEGIES.has(architecture.repositoryStrategy)) {
    errors.push("architecture.repositoryStrategy is unsupported.");
  }
  if (!RELEASE_UNITS.has(architecture.releaseUnit)) {
    errors.push("architecture.releaseUnit is unsupported.");
  }
  requireString(errors, architecture.canonicalRepository, "architecture.canonicalRepository");
  if (!validRepository(architecture.canonicalRepository)) {
    errors.push("architecture.canonicalRepository must use owner/repository form.");
  } else if (
    validRepository(projectRepository) &&
    architecture.canonicalRepository.toLowerCase() !== projectRepository.toLowerCase()
  ) {
    errors.push("architecture.canonicalRepository must match project.repository.");
  }

  if (!Array.isArray(architecture.relatedRepositories)) {
    errors.push("architecture.relatedRepositories must be an array.");
  } else {
    const seen = new Set();
    for (const [index, related] of architecture.relatedRepositories.entries()) {
      const path = `architecture.relatedRepositories[${index}]`;
      if (!requireObject(errors, related, path)) continue;
      rejectUnknownFields(errors, related, new Set(["repository", "status", "responsibility"]), path, schemaLabel);
      requireString(errors, related.repository, `${path}.repository`);
      if (!validRepository(related.repository)) errors.push(`${path}.repository must use owner/repository form.`);
      if (!RELATED_REPOSITORY_STATUSES.has(related.status)) errors.push(`${path}.status is unsupported.`);
      requireString(errors, related.responsibility, `${path}.responsibility`);
      const normalized = typeof related.repository === "string" ? related.repository.toLowerCase() : "";
      if (normalized && seen.has(normalized)) errors.push(`${path}.repository is duplicated.`);
      if (normalized && validRepository(architecture.canonicalRepository) && normalized === architecture.canonicalRepository.toLowerCase()) {
        errors.push(`${path}.repository must not duplicate architecture.canonicalRepository.`);
      }
      seen.add(normalized);
    }
  }

  for (const field of ["sharedCapabilities", "systemsOfRecord", "temporaryBridges", "reopenTriggers"]) {
    requireStringArray(errors, architecture[field], `architecture.${field}`);
  }
  if (Array.isArray(architecture.reopenTriggers) && architecture.reopenTriggers.length === 0) {
    errors.push("architecture.reopenTriggers must contain at least one scope-change condition.");
  }
  requireString(errors, architecture.separationJustification, "architecture.separationJustification");
  requireString(errors, architecture.decisionRecord, "architecture.decisionRecord");
}

export function validateHandoffObject(handoff) {
  const errors = [];

  if (!requireObject(errors, handoff, "handoff")) return { valid: false, errors };
  const expectedVersion = SUPPORTED_HANDOFF_SCHEMAS.get(handoff.schema);
  const isV2 = handoff.schema === HANDOFF_SCHEMA && handoff.schemaVersion === HANDOFF_SCHEMA_VERSION;
  const isV1 = handoff.schema === LEGACY_HANDOFF_SCHEMA && handoff.schemaVersion === LEGACY_HANDOFF_SCHEMA_VERSION;
  const schemaLabel = isV2 ? "schema v2" : "schema v1";
  rejectUnknownFields(errors, handoff, isV2 ? V2_TOP_LEVEL_FIELDS : V1_TOP_LEVEL_FIELDS, "handoff", schemaLabel);

  if (!expectedVersion) {
    errors.push(`schema must be ${LEGACY_HANDOFF_SCHEMA} or ${HANDOFF_SCHEMA}.`);
  } else if (handoff.schemaVersion !== expectedVersion) {
    errors.push(`schemaVersion must be ${expectedVersion} for ${handoff.schema}.`);
  }
  if (!isV1 && !isV2 && expectedVersion) errors.push("Handoff Pack schema and schemaVersion do not form a supported pair.");
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
    rejectUnknownFields(errors, handoff.project, new Set(["name", "repository", "expectedBranch", "expectedCommit", "localPath"]), "project", schemaLabel);
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

  if (isV2) validateArchitecture(errors, handoff.architecture, handoff.project?.repository, schemaLabel);

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
