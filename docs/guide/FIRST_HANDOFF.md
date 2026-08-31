# First Handoff Guide

Use the pinned [Start Here sequence](START_HERE.md) for the full workflow and
return to this page for the local KontextStack commands.

## Repository decision before prerequisites

If the project began in ChatGPT Sites, AI Studio or another builder, treat that
tool as the implementation origin—not the architecture authority. Before a new
GitHub repository is created, record:

1. whether an existing product repository already owns the canonical domain or
   connected customer journey;
2. whether the new surface shares authentication, sessions, mutable data,
   email, administration, analytics, feature flags, releases or rollback;
3. whether both surfaces must be tested, released or recovered together;
4. the security, compliance, ownership, scaling or genuinely independent-
   release reason for separation, if any; and
5. who owns every additional workflow, secret, dependency, monitor, backup,
   rollback and eventual retirement.

When the first three answers indicate shared responsibility and no evidence
requires separation, default to the existing repository and application. The
owner still approves the decision. Product surfaces may keep distinct layouts,
routes and permission boundaries inside one repository and release unit.

## Prerequisites

- An approved repository/release-boundary decision.
- The approved canonical project repository published to GitHub.
- A local clone of that project.
- A local clone of KontextStack.
- Node.js 20 or newer.
- A schema-valid Current-State ContextPack extracted from the current local
  project repository and approved in its ContextKraft project memory.
- A reviewed Handoff Pack exported from that approved memory.

The Current-State ContextPack is mandatory for projects that started in
ContextKraft and for projects started elsewhere. A ContextKraft Starter
ContextPack is historical intent only.

## Sequence

1. In ContextKraft, select an existing project memory or create one for an
   outside project.
2. Select the project origin and approve the repository/release boundary before
   creating or selecting the canonical GitHub repository.
3. Run the personalized extraction prompt in the actual canonical repository.
4. Review and approve the Current-State ContextPack, including related
   repositories, release evidence, systems of record and temporary bridges.
5. Review the evidence-grounded complexity, hostname, Node.js and next-guide
   recommendations; approve or override them.
6. Define the bounded goal and export the approved Handoff Pack v2.
7. Run `install verify --mode simple` or `install verify --mode mature` in the
   KontextStack clone, then run `doctor`.
8. Run `validate` against the Handoff Pack.
9. Run `inspect` against the project clone.
10. Run `preview` and review every proposed path.
11. Run `apply` only with the exact preview ID.
12. Run `verify`.
13. Move into the project folder and continue with the generated receipt and
    handoff context.
14. Review and commit the project changes yourself.

If the project changes after its Current-State ContextPack was created, run the
extraction prompt again and approve a refreshed Current-State ContextPack before
exporting or previewing the handoff.

Also reopen the repository decision when scope begins sharing authentication,
sessions, mutable data, email, administration, one cross-surface journey,
coordinated release/rollback, or canonical-domain behavior. Do not let another
API bridge or repository appear as an unreviewed incremental shortcut.
