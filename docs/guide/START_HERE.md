# Start Here: KontextStack Sequence

This page is the pinned table of contents for the complete ContextKraft-to-
KontextStack workflow. Follow it in order for a first handoff. Return to the
update step only when the core or a compatible module changes.

## First-time sequence

| Order | Where | Guide or action | Outcome |
| --- | --- | --- | --- |
| 1 | ContextKraft public guide | [Install and verify KontextStack](INSTALLATION.md) | The public npm CLI or canonical source clone is installed, source-verified, tested, and connected to an explicit update path. |
| 2 | ContextKraft application | Select the project origin and memory | Choose an owned ContextKraft project or create owner-scoped memory for a project started in ChatGPT Sites, AI Studio or elsewhere. |
| 3 | ContextKraft application | Approve the repository and release boundary | Decide whether to reuse an existing repository, create a genuinely standalone one, preserve independently owned repositories, or document a temporary split before GitHub publication. |
| 4 | Actual canonical project repository | Generate the Current-State ContextPack | A coding agent inspects the approved repository read-only and records customer journeys, related repositories, releases, systems of record, bridges and current implementation. |
| 5 | ContextKraft application | Review adaptive recommendations | ContextKraft suggests complexity, semantic hostnames, Node.js values and relevant next guides from approved evidence; the user approves or overrides them. |
| 6 | ContextKraft application | Define and export the handoff | Repository identity, the approved architecture boundary, the next bounded goal, acceptance evidence and prohibited actions become Handoff Pack v2. |
| 7 | KontextStack CLI or source clone | Validate, inspect and preview | The pack and target repository are checked without writing project files. |
| 8 | KontextStack CLI or source clone | Apply and verify the exact preview | Only the reviewed project-owned handoff records are written; KontextStack never commits or pushes the project. |
| 9 | Actual project repository | Continue in Codex | A new task starts in the project folder with the reviewed handoff context and repository as source of truth. |
| 10 | KontextStack CLI or source clone | [Update core or modules](MODULE_LIFECYCLE.md) | Incoming changes are inspected, previewed and verified while canonical source traceability is preserved. |

The public sequence is also available at
<https://contextkraft.com/guide>. Project-memory steps require the signed-in
application at <https://app.contextkraft.com/guide/handoff>.

## The Current-State ContextPack is always required

An existing ContextKraft project may already have a Starter ContextPack. That
starter record preserves historical intent but does not prove what the current
repository implements. The user must still run the personalized extraction
prompt against the actual project repository and approve the Current-State
ContextPack.

A project started outside ContextKraft follows the same extraction path. It
begins without a Starter ContextPack, but it still receives owner-scoped project
memory and the same mandatory Current-State record.

## Adaptive capability sequence

After the first handoff, ContextKraft can recommend later capability guides in
this dependency order:

1. domain or subdomain;
2. Node.js backend or hosted application runtime;
3. database;
4. authentication; and
5. GitHub Actions auto-deployment.

Versions 0.2 through 0.5 bundle these capabilities as filesystem-only planning
modules. A project may not need every step. ContextKraft should recommend them
only when the approved Current-State evidence and user-supplied hosting facts
justify them. No recommendation or applied module authorizes DNS, hosting,
database, authentication, deployment, Git, account or production changes.

## Source and ownership

The canonical source is <https://github.com/dondsp/kontextstack>. A direct clone
retains it as `origin`; a fork remains traceable when `upstream` points to the
canonical repository. The target project stays independently owned and retains
the exact KontextStack core/module provenance of applied records.
