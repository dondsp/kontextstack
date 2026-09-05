# Recovery decision

1. Pre-upload gate failed: no delivery occurred. Correct the gate in source.
2. Transfer failed: assume partial state on every selected target. Inspect before
   retry; restore the approved prior file artifact or approve a forward fix.
3. Startup failed: verify artifact completeness, exact lockfile dependencies,
   host startup path and newest redacted log. Restore runtime settings separately.
4. Schema failed: stop writes as approved. File rollback does not reverse DDL.
   Follow the database recovery record and explicit restore/forward-fix approval.
5. Identity failed: disable the affected provider if approved; preserve users,
   local authorization and audit. Revoke sessions or rotate only with scoped
   authority. Reopening bootstrap or disabling CSRF is not recovery.
6. DNS/TLS failed: restore recorded DNS/routing values after approval and observe
   TTL/caches. Do not enforce HTTPS redirects before coverage is valid.

After any recovery repeat the prior baseline and a representative journey,
record the current revision/schema/provider state, and obtain owner acceptance.
