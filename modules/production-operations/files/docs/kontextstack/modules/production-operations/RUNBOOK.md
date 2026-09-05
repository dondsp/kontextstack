# Production Operations Runbook

Generated from the public `production-operations@0.5.0` module at
<https://github.com/dondsp/kontextstack>.

This module records operational readiness. It does not access monitoring,
hosting, databases, backups, logs, incident systems, or production accounts.

## Ownership and service boundary

Name the release, monitoring, incident, hosting, database, backup, recovery,
security, and product acceptance owners. Document the production surfaces,
systems of record, dependencies, user-impact boundary, support hours, and
escalation path.

## Health and observability

- Define public availability, application health, dependency, queue, storage,
  certificate, and representative user-journey checks.
- Establish thresholds, observation windows, destinations, acknowledgement,
  and escalation without placing private data in alerts.
- Review log fields, access, retention, redaction, correlation, and deletion.
- Distinguish an endpoint returning success from the product being usable.

## Backup and recovery evidence

Record what is backed up, where ownership sits, frequency, retention, integrity
checks, and the latest successful restore exercise. Include application
artifacts, configuration records, uploaded files, databases, domain settings,
and any external system of record that needs a separate recovery procedure.

## Release acceptance

1. Confirm the exact source revision and artifact digest.
2. Record deployment, restart, migration, and cache operations independently.
3. Run technical smoke checks and the approved representative user journey.
4. Observe error, latency, capacity, and support signals for the agreed window.
5. Record known risks, rollback readiness, technical verification, and explicit
   product-owner acceptance.

## Incident and rollback

Define severity, first response, safe containment, evidence preservation,
communications, rollback authority, recovery verification, and follow-up. An
artifact rollback, runtime rollback, DNS reversal, database forward-fix, and
backup restore are different operations and require their own owner and gate.

Never claim that committed means pushed, pushed means verified, verified means
deployed, deployed means migrated, or deployed means accepted.
