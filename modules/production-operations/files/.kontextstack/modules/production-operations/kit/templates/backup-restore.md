# Backup and restore rehearsal

Coverage: <DATABASE_FILES_CONFIGURATION_IDENTITIES>
Approved off-repository storage owner/reference: <REFERENCE>
Backup operator, date, retention and deletion policy: <RECORD>
Backup integrity reference: <REFERENCE>
Disposable restore target and approval: <REFERENCE>
Restore operator, duration and recovery point: <RECORD>
Schema/constraints/persistence/authorization verification: <REFERENCE>
Result and next rehearsal date: <RECORD>

Backup existence is not restoration evidence. Never put dumps, archives, runtime
values or customer rows in the repository, public root, application artifact,
CI artifacts, chat or guide evidence. Rehearse with synthetic data locally.
Production backup/export and restore each require separate explicit authority.

Before restore isolate writes, identify incident scope, account for later valid
records, inspect backup integrity, approve expected data loss and record the
operator/window. After restore verify schema/code compatibility, persistence,
authorization and session invalidation; older data can otherwise resurrect
revoked sessions. Record file and data recovery independently.
