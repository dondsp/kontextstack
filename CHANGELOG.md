# Changelog

All notable changes are recorded here. KontextStack core and modules use
independent semantic versions.

## 0.5.1 — 2026-09-05

- Rename the machine-readable installation contract so it reflects the
  recommended public npm path as well as the full source-clone path.
- Replace generic module-lifecycle examples with released bundled-module names
  and versions.
- Clarify that fingerprint and import are advanced steps for separately
  reviewed external bundles, not prerequisites for bundled release modules.

## 0.5.0 — 2026-09-05

- Add stable `github-cpanel-deploy` and `production-operations` planning
  modules.
- Define protected-environment, pinned-action, least-privilege, deterministic
  artifact, scoped delivery, dependency-manifest, smoke, and rollback gates.
- Add health, monitoring, backup, restore-exercise, incident, evidence, and
  explicit owner-acceptance records.
- Keep workflow triggering, host access, uploads, restarts, migrations,
  monitoring access, recovery, and production acceptance outside KontextStack.

## 0.4.0 — 2026-09-05

- Add stable `mysql-storage`, `auth-local`, and optional `auth-google` planning
  modules.
- Define ordered checksum-bound migrations, target readiness, backup and
  recovery evidence, production separation, and temporary-bridge retirement.
- Define deny-by-default local accounts, sessions, CSRF, RBAC, audit, recovery,
  and closed-registration acceptance gates.
- Separate minimum Google identity consent from optional Workspace access and
  require explicit account-linking, scope, storage, revocation, and enablement
  decisions.

## 0.3.0 — 2026-09-05

- Add the stable `node-cpanel` runtime planning module.
- Record Node.js version, private application root, built entrypoint, startup,
  environment-name, routing, health, restart, and rollback contracts.
- Keep cPanel access, runtime configuration, environment values, dependency
  installation, process restart, and production acceptance outside KontextStack.

## 0.2.0 — 2026-09-05

- Add stable, source-traceable `domain-cpanel` and `static-site-cpanel`
  planning modules.
- Generate only project-owned contracts and runbooks; registrar, DNS, cPanel,
  certificate, upload, and production actions remain human-controlled.
- Add explicit current-state evidence, scoped-target, verification, rollback,
  and acceptance gates for domain and static publication work.
- Promote `handoff-core` to 0.2.0 compatibility while preserving the immutable
  alpha.2 manifest in the bundled registry.

## 0.1.0-alpha.4 — 2026-09-05

- Publish the first npm distribution under the available public package name
  `kontextstack`.
- Replace the unavailable `@dondsp` npm scope in install, version-check, update,
  and `npx` examples.
- Keep the package repository linked to the canonical
  `dondsp/kontextstack` GitHub project.

## 0.1.0-alpha.3 — 2026-09-05

- Prepare npm package metadata for `@dondsp/kontextstack`; the registry upload
  was superseded by alpha.4 because the `@dondsp` npm scope does not exist.
- Add public npm installation, version-check and explicit update guidance.
- Preserve the alpha.2 Handoff Pack v2 implementation unchanged.

## 0.1.0-alpha.2 — 2026-09-05

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
