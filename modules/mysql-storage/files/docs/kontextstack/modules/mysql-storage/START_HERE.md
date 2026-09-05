# Add MySQL storage and immutable migrations

This is an inert implementation kit. Installing it grants no provider or production authority. Read decision.json, evidence.json, implementation.json and ROLLBACK.md, then use CODEX_PROMPT.md in the actual project.

Adapt migrations.mjs, migrate-local.mjs and mysql-store.mjs into one project-owned data directory. Add mysql2 3.24.3 to the project lockfile after dependency review. Store one reviewed DDL statement per ordered .sql.template file and its SHA-256 in manifest.json. Never modify an applied migration. The local helper requires APP_MODE local/test, a literal loopback host, fixture_ database name and exact database-name approval. It cannot operate production. The guard and auth_records tables are a compact, transaction-serialized identity store; they are not a product-domain schema. Row-level bucket keys preserve independent domains without whole-table replacement. Benchmark contention and design project-specific indexed tables before high-volume use. Call ready() at startup and fail closed on missing or changed schema.

Source: https://github.com/dondsp/kontextstack
