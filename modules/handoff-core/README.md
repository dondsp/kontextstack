# Handoff Core

`handoff-core` adds the smallest project-owned foundation needed to continue a
ContextKraft handoff in Codex while keeping the target repository authoritative.

With Handoff Pack v2, the generated records also preserve the approved builder
origin, canonical repository, release unit, related-repository status,
system-of-record summary and repository-decision reopening triggers. Legacy v1
packs remain readable and are marked as lacking that structured decision.

It may add:

- `.kontextstack/project.json`;
- `.kontextstack/modules.lock.json`;
- `docs/kontextstack/HANDOFF_RECEIPT.md`;
- `docs/kontextstack/CONTINUE_IN_CODEX.md`; and
- `KONTEXTSTACK-NOTICE.txt`.

It does not change application source, dependencies, Git state, infrastructure,
accounts, credentials, deployments, DNS, databases, or authentication.

Existing paths are preserved when their generated content matches. Any other
existing content is reported as a conflict; apply has no force-overwrite
mode for those records.
