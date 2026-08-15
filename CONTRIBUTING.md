# Contributing to KontextStack

KontextStack favors small, auditable changes that preserve its local-first and
preview-first safety model.

## Before opening a pull request

1. Create a short-lived branch.
2. Keep the change within one core or module outcome.
3. Add or update deterministic tests.
4. Run `npm test` and `npm run audit:source`.
5. Review the complete diff for secrets, private data, internal paths, dumps,
   uploads, generated projects and unrelated modules.
6. Record origin and adaptation for any ported pattern.

Do not contribute real `.env` files, credentials, database dumps, production
data, customer records, private chat exports, uploads, or project-specific
evidence.

## Module contributions

Every module must have an exact semantic version, compatible core range,
canonical source, integrity value, declared permissions, deterministic preview,
tests, and an upgrade path. Module discovery never grants script execution.

## Generated projects

Tests may generate temporary projects, but they must not auto-commit or push
them. Output belongs to the user project and must preserve provenance.
