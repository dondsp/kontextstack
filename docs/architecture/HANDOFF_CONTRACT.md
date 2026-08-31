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

Legacy Handoff Pack v1 remains readable at
[`schemas/handoff/v1.json`](../../schemas/handoff/v1.json). New ContextKraft
handoffs use repository-boundary-aware v2 at
[`schemas/handoff/v2.json`](../../schemas/handoff/v2.json). Unsupported future
schema versions fail closed.

## Repository and release boundary

Handoff Pack v2 separates builder origin from architecture. `chatgpt-sites` or
`ai-studio` records where implementation began; neither value authorizes a new
repository, runtime, database, domain or deployment path.

Before v2 validates, the owner must approve:

- the canonical implementation repository;
- reuse, standalone, independently owned or temporary-split strategy;
- unified, independent or temporary release unit;
- related repositories and whether each is active, candidate, rollback evidence
  or retired;
- shared journeys/capabilities and systems of record;
- the reason for unification or separation;
- temporary bridges and their documented status;
- a project-owned decision record; and
- at least one condition that reopens the decision.

KontextStack checks that the canonical decision matches the target repository.
It does not decide the architecture automatically or inspect unrelated sibling
repositories.
