# Handoff Contract

KontextStack keeps five artifact roles distinct:

1. **Intent ContextPack** — intended purpose, users, outcomes, constraints and
   architecture direction.
2. **Current-State Snapshot** — repository-grounded implementation facts,
   freshness, tests, drift, risks and unknowns.
3. **Reconciled ContextPack** — intended, observed and decided values without
   rewriting disagreement away.
4. **Handoff Pack** — the bounded, schema-valid input for one current goal.
5. **Handoff Receipt** — the target-project record of the exact preview, module,
   source and files applied.

Machine-readable JSON uses exact schema versions; Markdown carries human review
context. Handoff Packs do not contain credentials, session URLs, dumps, user
records, or complete proprietary source.

Repository evidence proves what is implemented. It does not prove product
approval or production acceptance. Explicit user/project decisions can
supersede old intent, but the transition remains visible.

The bundled v1 schema is at [`schemas/handoff/v1.json`](../../schemas/handoff/v1.json).
Unsupported future schema versions fail closed.
