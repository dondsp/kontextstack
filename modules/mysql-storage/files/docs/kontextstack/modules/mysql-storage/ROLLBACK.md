# Recovery

DDL may commit before a later failure. A running or failed ledger blocks retry. Stop, inspect the actual schema privately, and record restore or forward-fix with the exact failed ID/checksum. Do not delete ledger rows or mark them applied to bypass the block. For disposable fixtures recreate the isolated database. For production approve and rehearse restore, or independently verify completed DDL before a reviewed ledger repair; preserve a non-secret recovery record. File rollback does not roll back the database.
