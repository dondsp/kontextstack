# Project adaptation

Adapt migrations.mjs, migrate-local.mjs and mysql-store.mjs into one project-owned data directory. Add mysql2 3.24.3 to the project lockfile after dependency review. Store one reviewed DDL statement per ordered .sql.template file and its SHA-256 in manifest.json. Never modify an applied migration. The local helper requires APP_MODE local/test, a literal loopback host, fixture_ database name and exact database-name approval. It cannot operate production. The guard and auth_records tables are a compact, transaction-serialized identity store; they are not a product-domain schema. Row-level bucket keys preserve independent domains without whole-table replacement. Benchmark contention and design project-specific indexed tables before high-volume use. Call ready() at startup and fail closed on missing or changed schema.

- Inspect durable data ownership and sensitivity/retention/deletion.
- Inspect engine version, schema and immutable migration history.
- Inspect runtime versus migration privileges, backup and restore ownership.

Preserve the existing working architecture and reconcile legacy records. Never overwrite customized files or delete the module lock to force an upgrade. Module installation and project adaptation are separate.
