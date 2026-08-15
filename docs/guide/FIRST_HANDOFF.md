# First Handoff Guide

## Prerequisites

- A project already published to GitHub.
- A local clone of that project.
- A local clone of KontextStack.
- Node.js 20 or newer.
- A reviewed Handoff Pack from ContextKraft or a current-state extraction flow.

## Sequence

1. Run `doctor` in the KontextStack clone.
2. Run `validate` against the Handoff Pack.
3. Run `inspect` against the project clone.
4. Run `preview` and review every proposed path.
5. Run `apply` with the exact preview ID.
6. Run `verify`.
7. Move into the project folder and continue with the generated receipt and
   handoff context.
8. Review and commit the project changes yourself.

If the project continued changing after its ContextPack was created, refresh
the Current-State Snapshot before previewing the handoff.
