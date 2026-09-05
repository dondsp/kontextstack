import { stableStringify } from "./json.js";

// Deliberately limited to the keywords used by our bundled, trusted schemas.
// No remote references, code compilation, formats, or module-supplied schemas.
export function validateContractSchema(value, schema) {
  const errors = [];
  function visit(node, rule, location) {
    if (rule.$ref) {
      if (!/^#\/\$defs\/[a-zA-Z0-9-]+$/.test(rule.$ref)) throw new Error("Unsupported contract schema reference.");
      const definition = schema.$defs?.[rule.$ref.split("/").at(-1)];
      if (!definition) throw new Error("Missing contract schema definition.");
      return visit(node, definition, location);
    }
    const fail = (reason) => errors.push(`${location}: ${reason}.`);
    if ("const" in rule && stableStringify(node) !== stableStringify(rule.const)) fail("unexpected constant");
    if (rule.enum && !rule.enum.some((item) => stableStringify(item) === stableStringify(node))) fail("unsupported choice");
    const matches = {
      object: node !== null && typeof node === "object" && !Array.isArray(node),
      array: Array.isArray(node), string: typeof node === "string",
      integer: Number.isInteger(node), boolean: typeof node === "boolean"
    };
    if (rule.type && !matches[rule.type]) { fail(`expected ${rule.type}`); return; }
    if (rule.type === "object") {
      for (const key of rule.required ?? []) if (!Object.hasOwn(node, key)) fail(`missing ${key}`);
      for (const key of Object.keys(node)) {
        if (Object.hasOwn(rule.properties ?? {}, key)) visit(node[key], rule.properties[key], `${location}.${key}`);
        else if (rule.additionalProperties === false) fail("unsupported field");
      }
    }
    if (Array.isArray(node)) {
      if (node.length < (rule.minItems ?? 0) || node.length > (rule.maxItems ?? Infinity)) fail("invalid item count");
      if (rule.uniqueItems && new Set(node.map((item) => stableStringify(item))).size !== node.length) fail("duplicate item");
      if (rule.items) node.forEach((item, index) => visit(item, rule.items, `${location}[${index}]`));
    }
    if (typeof node === "string") {
      if (node.trim().length < (rule.minLength ?? 0)) fail("empty or short string");
      if (rule.pattern && !new RegExp(rule.pattern).test(node)) fail("invalid string shape");
    }
    if (typeof node === "number" && node < (rule.minimum ?? -Infinity)) fail("below minimum");
  }
  visit(value, schema, "contract");
  return { valid: errors.length === 0, errors };
}
