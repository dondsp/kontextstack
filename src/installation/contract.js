import { readJson } from "../core/json.js";
import { CANONICAL_SOURCE, INSTALLATION_CONTRACT_PATH } from "../core/constants.js";

export const INSTALLATION_MODES = Object.freeze(["simple", "mature"]);

export function normalizeInstallationMode(mode = "simple") {
  if (!INSTALLATION_MODES.includes(mode)) {
    throw new Error(`Unsupported installation mode: ${mode}. Use simple or mature.`);
  }
  return mode;
}

export async function loadInstallationContract(mode = "simple") {
  const selectedMode = normalizeInstallationMode(mode);
  const contract = await readJson(INSTALLATION_CONTRACT_PATH);
  const contractValid = (
    contract.schemaVersion === "1.0.0" &&
    contract.canonicalSource === CANONICAL_SOURCE &&
    contract.cloneUrl === `${CANONICAL_SOURCE}.git` &&
    Number.isInteger(contract.minimumNodeMajor) &&
    contract.minimumNodeMajor >= 20 &&
    contract.packageManager === "npm" &&
    Array.isArray(contract.sharedCommands) &&
    contract.sharedCommands.every((command) => typeof command === "string" && command.length > 0)
  );
  if (!contractValid) throw new Error("Installation contract metadata is invalid or no longer canonical.");

  const profile = contract.modes?.[selectedMode];
  if (
    !profile ||
    !["core", "extended"].includes(profile.verificationProfile) ||
    typeof profile.verifyCommand !== "string" ||
    typeof profile.firstCommand !== "string"
  ) {
    throw new Error(`Installation contract is missing a valid ${selectedMode} mode.`);
  }

  return {
    schemaVersion: contract.schemaVersion,
    name: contract.name,
    canonicalSource: contract.canonicalSource,
    cloneUrl: contract.cloneUrl,
    minimumNodeMajor: contract.minimumNodeMajor,
    packageManager: contract.packageManager,
    mode: selectedMode,
    profile,
    commands: [
      ...contract.sharedCommands,
      profile.verifyCommand,
      profile.firstCommand
    ]
  };
}
