# MySQL and identity implementation port

Candidate: 0.6.0-alpha.2, Phase 4. Not published or deployed.

The primary predecessor revision is
9f2a29c4e56c72ef40c21eba58c98b8c6843f31b. The reviewed inputs were working-tree
snapshots, not claimed committed contents. Exact SHA-256 values and paths live
in each new module's implementation.sources and evidence.sources records:

- docs/adaptive-handoff/07_MYSQL_AND_MIGRATIONS.md
- docs/adaptive-handoff/08_AUTHENTICATION_AND_AUTHORIZATION.md
- presets/foundations/auth-storage-mysql/files/src/server/auth-storage-mysql/index.js
- presets/foundations/auth-storage-mysql/files/scripts/auth-storage-mysql-migrate-local.cjs
- presets/foundations/auth-storage-mysql/files/docs/database/auth-storage-mysql-migration.sql.template
- presets/foundations/auth-provider-local/files/src/server/auth-provider-local/index.js
- presets/foundations/auth-provider-google/files/src/server/auth-provider-google/index.js

No supporting product repository was copied or modified. No production data,
private exports, secret values, product roles or business behavior was selected.
Project names, environment-name substitutions, file-store defaults, automatic
email linking and whole-table replacement were removed. Neutral example.com
identities exist only in synthetic tests. Provider endpoints are official
Google endpoints, not project destinations.

## Architecture and migration changes

mysql-storage 0.5.0 provides no-connection manifest validation, ordered immutable
DDL, exact hashes, advisory migration exclusion, a persistent running/failed
ledger and a disposable-local target guard. DDL is not represented as atomic:
failure may leave schema changes and blocks replay until a separate recovery.
The reference CLI cannot migrate production and deployment must never invoke it.

The MySQL identity adapter uses parameterized per-key records and a persistent
transaction guard. This avoids the predecessor's delete-and-reinsert snapshot
strategy and prevents concurrent bootstrap/lost updates, including an empty
store. It is a compact modest-volume reference, not a universal product schema.
Evaluate contention, indexed domain tables, account lifecycle, retention and
capacity before production adaptation. MySQL 9.5 is the local fixture runtime;
public CI uses its installed MySQL runtime. MariaDB hosting needs the same
fixture/DDL rehearsal on the selected supported version before provider use.

auth-local 0.5.0 permits explicit test-only memory storage but refuses it in
production. The standard durable companion is mysql-storage 0.5.0. Optional
module ranges now block incompatible installed companions while allowing an
absent optional module. Production startup checks schema readiness, exact HTTPS
origin and session policy. No fallback from failed MySQL to memory is available.

auth-google 0.5.0 requires auth-local 0.5.0. OIDC verification is delegated to
pinned jose with fixed Google keys/endpoints and identity-only scopes. Provider
identity maps to local users and permissions; it never grants administrator
status. Existing email collisions require explicit authenticated linking.

All portable permissions remain network false and commands empty. The reference
code is installed only beneath each module-owned kit directory. mysql2 3.24.3
and jose 6.2.12 are test-only development dependencies of KontextStack, with no
core runtime import. Projects deliberately adopting these adapters add their own
reviewed dependencies and lockfile. Provider calls are possible only after
separate project adaptation and authorization.

## Security review and adaptations

1. Replaced whole-store MySQL rewrites with transaction-scoped row operations.
   Real database tests cover independent concurrent writes and pool restart.
2. Replaced implicit migration repeat with checksummed history and persistent
   failed/interrupted state. An actual failing DDL fixture refuses the retry.
3. Removed production file/memory defaults and first-user administrator rules.
   Private bootstrap is one-time, transaction-guarded, input-hidden and audited.
4. Added bounded asynchronous scrypt, dummy verification for absent accounts,
   shared account/client throttles, exact origin/CSRF checks, opaque hashed
   sessions, idle/absolute expiry, rotation and version-based revocation.
5. Replaced Google userinfo-only acceptance and automatic email linking with
   signed ID-token validation, issuer/audience/azp/expiry/nonce checks, PKCE,
   exact callbacks, browser-bound single-use state and explicit linking.
6. Added allowlisted public views and audit fields. HTTP errors withhold raw
   adapter exceptions and no session identifier is sent in JSON. Provider
   access/refresh/ID tokens are not persisted. OAuth query strings must not be
   logged by the adapted reverse proxy/application.

Reference documentation reviewed 2026-09-05:
[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect),
[Google claim reference](https://developers.google.com/identity/openid-connect/reference),
[OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html),
[MySQL implicit commits](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html).

Review limitations: this is a reusable server reference, not a certification of
an adopted project's router, UI, email verification, recovery, MFA, infrastructure
or operating procedures. The installed guide requires project-specific browser,
proxy, hosted-database and recovery acceptance. Throttle/session/OAuth/audit
retention requires an approved maintenance policy; expired records must be
removed under that policy, without copying record payloads into reports.

## Upgrade and verification gates

Original MySQL/local/Google 0.4.0 planning bundles remain immutable under their
version directories. New 0.5.0 kits preserve the original records, declare the
upgrade, add six implementation documents and reject customized-file overwrite.
Domain/static 0.3.1 and Node 0.4.1 are guide-release patches; alpha.1 bundles
remain intact. Current guides identify alpha.2, while historical guides identify
their original release. Neither is rewritten in place after publication.

Required checks: complete core suite, actual HTTP auth cases, signed OIDC with
memory and real disposable MySQL, installed-kit adaptation and emitted checks,
legacy fingerprints/upgrades, source/privacy audit, doctor, mature installation,
package dry-run, isolated package installation and public Node 20/22 CI.

The work does not activate ContextKraft or finish deployment/operations and the
full end-to-end release matrix. Provider and production states remain pending.
