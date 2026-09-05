# MySQL Storage Foundation Runbook

Generated from the public `mysql-storage@0.4.0` module at
<https://github.com/dondsp/kontextstack>.

This module records storage decisions and gates. It does not create a database,
open a remote connection, read production rows, apply a migration, restore a
backup, or place connection values in the repository.

## Establish ownership

Name the product data owner, schema owner, migration author, migration operator,
recovery operator, and acceptance owner. Define the system of record and each
table's retention, deletion, export, and privacy obligations before designing
the schema.

## Migration contract

- Use ordered, immutable migration identifiers and bind each reviewed file to a
  checksum.
- Separate schema creation, additive changes, backfills, constraint activation,
  destructive cleanup, and rollback decisions.
- Refuse an unknown target, placeholder configuration, remote development
  database, reordered history, checksum drift, or already-failed migration.
- Keep production migration approval and execution separate from GitHub Actions
  artifact deployment.

## Preflight evidence

1. Validate the schema and migration history without connecting when possible.
2. Apply to a disposable local MySQL database using fake data.
3. Record row-count, constraint, index, compatibility, and application smoke
   checks without copying private rows into logs.
4. Confirm a current backup and record a successful restore exercise.
5. Review lock duration, capacity, retry, timeout, and maintenance-window risks.

## Production operator boundary

The authorized operator confirms the exact target, backup, approved migration
range, application compatibility, monitoring window, and rollback decision.
The operator applies the migration through the approved production runbook—not
through this module.

## Verify, recover, retire bridges

Run the recorded structural and application checks, monitor errors and latency,
and preserve evidence of the applied migration identifiers. If recovery is
required, follow the reviewed restore or forward-fix decision. Every temporary
database or cross-application bridge must have an exit owner, retirement
condition, and target date.
