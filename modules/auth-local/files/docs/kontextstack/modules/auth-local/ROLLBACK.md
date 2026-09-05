# Recovery

Keep the durable store and audit history during code rollback. Verify old code remains compatible with current hashes/schema. Revoke affected sessions via user version changes after approved identity recovery; restore does not prove logout tokens remain invalid. Rehearse session invalidation after restoring an older database. Never reopen bootstrap or convert the store to memory to make production start.
