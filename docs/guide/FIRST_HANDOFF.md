# First Handoff Guide

Use the pinned [Start Here sequence](START_HERE.md) for the full workflow and
return to this page for the local KontextStack commands.

## Prerequisites

- A project already published to GitHub.
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
2. Run the personalized extraction prompt in the actual project repository.
3. Review and approve the Current-State ContextPack.
4. Review the evidence-grounded complexity, hostname, Node.js and next-guide
   recommendations; approve or override them.
5. Define the bounded goal and export the approved Handoff Pack.
6. Run `install verify --mode simple` or `install verify --mode mature` in the
   KontextStack clone, then run `doctor`.
7. Run `validate` against the Handoff Pack.
8. Run `inspect` against the project clone.
9. Run `preview` and review every proposed path.
10. Run `apply` only with the exact preview ID.
11. Run `verify`.
12. Move into the project folder and continue with the generated receipt and
    handoff context.
13. Review and commit the project changes yourself.

If the project changes after its Current-State ContextPack was created, run the
extraction prompt again and approve a refreshed Current-State ContextPack before
exporting or previewing the handoff.
