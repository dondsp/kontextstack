const SECRET_KEYS = new Set([
  "password",
  "passwd",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secretKey",
  "clientSecret",
  "privateKey",
  "databaseUrl",
  "connectionString"
]);

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /(?:mysql|postgres(?:ql)?):\/\/[^\s:@]+:[^\s@]+@/i
];

export function secretFindings(value) {
  const findings = [];

  function visit(node, pathParts) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...pathParts, String(index)]));
      return;
    }

    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        const childPath = [...pathParts, key];
        if (SECRET_KEYS.has(key) && child !== "" && child !== null) {
          findings.push({ category: "secret-bearing-field", path: childPath.join(".") });
          continue;
        }
        visit(child, childPath);
      }
      return;
    }

    if (typeof node === "string" && SECRET_PATTERNS.some((pattern) => pattern.test(node))) {
      findings.push({ category: "secret-like-value", path: pathParts.join(".") });
    }
  }

  visit(value, []);
  return findings;
}

export function assertNoSecretValues(value) {
  const findings = secretFindings(value);
  if (findings.length) {
    const categories = [...new Set(findings.map((finding) => finding.category))];
    throw new Error(`Handoff rejected: ${findings.length} protected value finding(s) in ${categories.join(", ")}. Values were not printed.`);
  }
}
