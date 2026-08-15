# Handoff Core

`handoff-core` is the only bundled KontextStack v0.1 module. It adds the
smallest project-owned foundation needed to continue a ContextKraft handoff in
Codex while keeping the target repository authoritative.

It may add:

- `.kontextstack/project.json`;
- `.kontextstack/modules.lock.json`;
- `docs/kontextstack/HANDOFF_RECEIPT.md`;
- `docs/kontextstack/CONTINUE_IN_CODEX.md`; and
- `KONTEXTSTACK-NOTICE.txt`.

It does not change application source, dependencies, Git state, infrastructure,
accounts, credentials, deployments, DNS, databases, or authentication.

Existing paths are preserved when their generated content matches. Any other
existing content is reported as a conflict; alpha apply has no force-overwrite
mode for those records.
