# Changelog

All notable changes are recorded here. KontextStack core and modules use
independent semantic versions.

## 0.1.0-alpha.2 — Unreleased

- Add Handoff Pack v2 while retaining v1 compatibility.
- Require an approved repository/release-boundary decision for new handoffs.
- Preserve builder origin, canonical repository, related-repository status,
  systems of record and decision-reopening triggers in generated records.
- Add a ChatGPT Sites continuation example and regression coverage.
- Update the first-handoff guide so repository selection follows architecture
  approval instead of preceding it.

## 0.1.0-alpha.1 — 2026-08-15

- Establish the clean-room public repository boundary.
- Add the local-first CLI foundation and source provenance.
- Add v1 ContextPack, Handoff Pack, module, registry and project-lock schemas.
- Bundle only the `handoff-core` module.
- Add deterministic preview/apply/verify safety tests.
- Add a machine-readable clone-first installation contract with simple and
  mature verification profiles.
- Add read-only installation verification for canonical remotes, exact Git
  identity, attribution, bundled module provenance and operational records.
- Add filesystem-only module fingerprint, import, discovery, inspection,
  deterministic preview, exact approved apply and verification workflows.
- Add module lock upgrades with per-file integrity and conflict protection for
  project-customized files.
- Add a read-only, source-traced, fast-forward-only KontextStack core update
  guide.
