import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CANONICAL_SOURCE = "https://github.com/dondsp/kontextstack";
export const CORE_NAME = "KontextStack";
export const LEGACY_HANDOFF_SCHEMA = "https://contextkraft.com/schemas/handoff/v1";
export const LEGACY_HANDOFF_SCHEMA_VERSION = "1.0.0";
export const HANDOFF_SCHEMA = "https://contextkraft.com/schemas/handoff/v2";
export const HANDOFF_SCHEMA_VERSION = "2.0.0";
export const SUPPORTED_HANDOFF_SCHEMAS = new Map([
  [LEGACY_HANDOFF_SCHEMA, LEGACY_HANDOFF_SCHEMA_VERSION],
  [HANDOFF_SCHEMA, HANDOFF_SCHEMA_VERSION]
]);
export const MODULE_NAME = "handoff-core";
export const MODULE_MANIFEST_PATH = path.join(ROOT_DIR, "modules", MODULE_NAME, "module.json");
export const REGISTRY_PATH = path.join(ROOT_DIR, "registry", "index.json");
export const PACKAGE_PATH = path.join(ROOT_DIR, "package.json");
export const SOURCE_MANIFEST_PATH = path.join(ROOT_DIR, "kontextstack.source.json");
export const INSTALLATION_CONTRACT_PATH = path.join(ROOT_DIR, "installation", "contract.json");

export const GENERATED_PATHS = Object.freeze([
  ".kontextstack/project.json",
  ".kontextstack/modules.lock.json",
  "docs/kontextstack/HANDOFF_RECEIPT.md",
  "docs/kontextstack/CONTINUE_IN_CODEX.md",
  "KONTEXTSTACK-NOTICE.txt"
]);
