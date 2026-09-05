# Implementation kits v1

Status: v0.6 candidate contract layer, not an npm release or provider approval.

Portable modules still install files only into their own namespaces. Core does
not execute templates, checks, guide commands, migrations, workflows or provider
instructions. Reference code is inert text until the owner authorizes Codex to
adapt it in the project. The permissions remain network false and commands empty.

## Contracts and integrity

A kit manifest declares:

```json
{
  "contracts": {
    "schemaVersion": "kontextstack-kit/v1",
    "implementation": ".kontextstack/modules/<MODULE>/implementation.json",
    "guide": "guide.json"
  }
}
```

The implementation file is a normal declared output. The source-root guide is
metadata: it is validated, fingerprinted and retained during cache import, but
never grants another write target. Inspect exposes both contracts. An undeclared,
missing or unsupported contract fails before import, preview or apply.

The bundled JSON schemas are the structural authority. A small interpreter
validates only their used keywords; it never loads external schemas or compiles
module code. Semantic validation additionally checks identities, dependency
agreement, maturity, approval references, acceptance evidence, copy-command
placeholders, and canonical installed document/template references.

Guide source.integrity is sha256 over stable JSON with that field omitted.
Guide source.implementationIntegrity is sha256 over the exact installed
implementation file bytes. The bundle fingerprint adds the guide's exact file
integrity to the existing manifest-and-files hash input. Legacy bundles retain
their original hash algorithm and fingerprints.

Source commits identify reviewed input revisions, not a self-referential future
release commit. Extraction records distinguish committed input from a working
tree snapshot. Each source includes its content hash. The release tag and npm
tarball bind the eventual released output separately.

## Compatibility and upgrades

Kit modules must exclude core 0.5.1 because that core cannot validate these
contracts. The first candidate core is 0.6.0-alpha.1. The package is intentionally
unpublished until the full release gates and owner approval.

Old module locks and planning bundles remain readable. New kit versions must
declare upgrade.from. Additive kit files preview as additions; unchanged decision
records are preserved. Customized output blocks apply and requires a reviewed
manual reconciliation. Never reset the lock to bypass a conflict. Prior module
source/version/integrity/file records remain in history; this is provenance,
not an automatic downgrade or rollback command.

Every apply still requires the exact current preview. After verify, open
START_HERE.md and use CODEX_PROMPT.md to adapt the kit. Installed, implemented,
locally verified, provider configured, deployed, migrated, production verified,
and owner accepted are separate states. Reading guide stages grants no authority.

## Guide consumer boundary

ContextKraft must compare the guide package version with its selected release,
verify guide and implementation hashes, and reject stale snapshots. Contract
validation alone does not activate a guide or establish a release gate. External
and acceptance stages require separate explicit approval. Copy commands are
display text only; consumers must never dispatch them as executable actions.
Evidence is non-secret or an explicit waiver; a waiver cannot invent successful
verification. Screenshots require review before retention.
