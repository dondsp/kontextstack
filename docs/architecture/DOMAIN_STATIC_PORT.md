# Domain and static implementation port

Status: Phase 2 local gates verified; candidate modules are not npm-published.

## Sources and adaptation

Predecessor base revision: 9f2a29c4e56c72ef40c21eba58c98b8c6843f31b.
These source documents were working-tree snapshots, not committed files:

| Path | SHA-256 |
| --- | --- |
| docs/adaptive-handoff/03_DOMAIN_DNS_AND_CPANEL.md | 574509104bc43c5febb8aa8036836ef6eb75a357a8ac8643f631028d6c025fe2 |
| docs/adaptive-handoff/04_REDIRECTS_HTTPS_AND_ROUTING.md | 43eb9ab5ee5e8dbf02713ae8fdb3c3d59b620780f255807caf7387c43cf92550 |
| docs/adaptive-handoff/05_STATIC_SITE_DEPLOYMENT.md | 60aae87620f9d6a8f95741a3087899d9a7b94cda65391294e86f4bfb95b0d233 |

Reusable patterns: hostname/owner/root separation, certificate-before-redirect
ordering, one redirect owner, exact public artifact allowlists, archive-root
inspection, preserve lists, separate form/backend choices, hosted verification
and scoped recovery. No supporting product repository was used in this phase.

Removed project accounts, home paths, production values, product names, business
behavior and implicit authority. Replaced operational inputs with named
placeholders; fixtures use reserved example.invalid hosts and synthetic files.
No credentials, private exports, uploads, data rows or screenshots were copied.

The redirect port intentionally changes the predecessor example: Apache's NE
flag allowed a decoded space in Location during the encoded-path fixture. Normal
escaping preserves the tested encoded path. Tests also found and corrected an
over-escaped missing-asset pattern. Unknown asset-like and API requests now fail
before SPA fallback; dotted client routes require explicit adaptation.

Provider references checked 2026-09-05:
[Domains](https://docs.cpanel.net/cpanel/domains/domains/),
[domain creation](https://docs.cpanel.net/cpanel/domains/domains/create-a-new-domain/),
[File Manager](https://docs.cpanel.net/cpanel/files/file-manager/) and
[Apache rewrite flags](https://httpd.apache.org/docs/2.4/rewrite/flags.html).
Provider labels remain version/host dependent; the installed procedures require
inspection of the actual account and a scoped approval before mutation.

## Version and authority

domain-cpanel and static-site-cpanel become 0.3.0 candidate kits for core
0.6.0-alpha.1. Their published 0.2.0 bundles are retained byte-for-byte under
versions/0.2.0 with original fingerprints. Registry status is alpha for the new
kits. No tag, npm publication or provider deployment is performed.

All writes remain under the selected module's .kontextstack/modules and
docs/kontextstack/modules roots. network is false; commands is empty. Artifact
checking is an inert reference script reviewed and invoked by a project operator;
core never executes it. It is an allowlist and pattern check, not a claim that
arbitrary minified code has been comprehensively audited for secrets.

## Evidence

- Full core/contract suite plus static integration and legacy upgrade tests.
- Real disposable Apache 2.4.67 fixture: root, deep route, CSS MIME, missing asset,
  API refusal, canonical alias, encoded path/query and certificate challenge.
- Composition preserves existing application source and installed kit integrity.
- Published planning records preview as preserve; implementation-kit files add;
  previous source/version/integrity records remain in lock history.
- Artifact refusal tests cover missing/extra files, maps, archives, .env, SQL,
  symlinks, unreviewed policy, unresolved inputs and secret-like content.
- Source/privacy audit, doctor, mature clone verification and package dry-run.
- Isolated local tarball install: about, doctor, available, inspect, preview,
  exact approval/apply and verify.

No real DNS, certificate issuance, provider account, archive extraction, hosted
browser acceptance or production rollback is claimed. Those stay separately
approved project actions. Local kit verification does not activate ContextKraft
production guides or pass the final v0.6 release gate.
