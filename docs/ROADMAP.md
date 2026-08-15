# Release Roadmap

KontextStack grows through independently reviewed modules. A roadmap entry does
not mean the capability is already available.

## v0.1 — Handoff core

- Validate ContextPack/Handoff Pack v1.
- Inspect local projects read-only.
- Reconcile expected repository baseline.
- Preview deterministic project-owned handoff records.
- Apply only an exact approved preview.
- Verify source/module provenance.
- Expose a versioned bundled module registry.
- Import exact portable module bundles from the local filesystem.
- Preview, apply, upgrade and verify module-owned project records without
  overwriting project customizations.
- Generate a source-traced, fast-forward-only core update guide.

## v0.2 — Domain and static publication

Planned modules: `domain-cpanel` and `static-site-cpanel`. They will generate
tailored domain, subdomain, add-on domain, redirect, certificate, `.htaccess`,
static deployment, verification, and rollback guidance. They will not log in to
registrars or cPanel or change DNS directly.

## v0.3 — Node.js and cPanel runtime

Planned module: `node-cpanel`. It will cover cPanel Application Manager setup,
runtime versions, entrypoints, environment-name contracts, reverse routing,
process restart, health checks, and rollback without managing production
credentials.

## v0.4 — Database and authentication foundations

Planned modules include MySQL storage, local authentication, and optional Google
authentication. Each will be opt-in and gated by security, migration, session,
CSRF, RBAC, backup, and recovery acceptance criteria.

## v0.5 — GitHub deployment and operations

Planned modules cover GitHub Actions artifact deployment, environment/secret
name contracts, cPanel delivery, rollback, backups, monitoring, and production
acceptance. KontextStack itself will not deploy automatically.

## v0.6 — ContextKraft guided continuity

ContextKraft `/guide` will generate current-state extraction prompts, Handoff
Packs, module recommendations, domain topology guidance, and copy-ready Codex
continuation prompts. Deterministic guided flows come before a conversational
prompt generator.

Every release must preserve inspect → preview → approval → apply → verify,
module integrity, old-client compatibility, and project ownership.
