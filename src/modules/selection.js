import { lstat, readFile } from 'node:fs/promises';
import { safeTargetPath } from '../core/paths.js';
import { integrity } from '../core/json.js';
import { satisfiesRange } from '../core/semver.js';

export function validateSelectionDeclaration(manifest) {
  if (!manifest.selection) return;
  const selection = manifest.selection;
  if (selection.schemaVersion !== 'kontextstack-selection/v1' || Object.keys(selection).sort().join(',') !== 'fields,schemaVersion' ||
      !Array.isArray(selection.fields) || !selection.fields.length || selection.fields.length > 10 ||
      satisfiesRange('0.6.0-alpha.1', manifest.coreCompatibility)) throw new Error('Unsupported selection contract');
  const names = new Set();
  for (const field of selection.fields) {
    if (Object.keys(field).sort().join(',') !== 'multiple,name,options' || !/^[a-z][a-z0-9-]{0,40}$/.test(field.name) || names.has(field.name) ||
        typeof field.multiple !== 'boolean' || !Array.isArray(field.options) || !field.options.length || field.options.length > 20 ||
        new Set(field.options).size !== field.options.length || field.options.some(s => typeof s !== 'string' || !/^[a-z][a-z0-9-]{0,40}$/.test(s))) throw new Error('Invalid selection field');
    names.add(field.name);
  }
  const target = `.kontextstack/modules/${manifest.name}/selection.json`;
  if (manifest.files.some(f => f.path === target)) throw new Error('Module must not overwrite owner selection');
}

export async function readModuleSelection(root, manifest) {
  if (!manifest.selection) return null;
  const target = `.kontextstack/modules/${manifest.name}/selection.json`;
  try {
    const absolute = await safeTargetPath(root, target), details = await lstat(absolute);
    if (!details.isFile() || details.isSymbolicLink() || details.size > 8192) throw new Error();
    const raw = await readFile(absolute, 'utf8'), value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).length !== manifest.selection.fields.length) throw new Error();
    for (const field of manifest.selection.fields) {
      const input = value[field.name], choices = field.multiple ? input : [input];
      if (!Array.isArray(choices) || !choices.length || new Set(choices).size !== choices.length || choices.some(v => !field.options.includes(v))) throw new Error();
    }
    return { path: target, valid: true, integrity: integrity(raw), values: value };
  } catch {
    // Never print raw user input, arbitrary fields, paths or parse errors.
    return { path: target, valid: false, integrity: null, instruction: 'Create the owner selection using only the declared choices before preview.' };
  }
}
