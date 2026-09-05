# Credential and maintenance review

Inventory secret categories only: scoped delivery identities; database service
identity; session/signing keys; OAuth client; approved service providers.
For each record owner, secret-store reference, affected surface and next review.
Never record values. Scope one rotation at a time and obtain explicit approval.

Generate privately, update the owning provider and approved runtime store,
verify scope/TLS, restart only if required, run targeted and regression checks,
then revoke the previous value. Record user impact (especially session expiry),
operator/date/result and recovery. Do not rotate unrelated identities to fix
one failed upload.

Periodically review runtime support, pinned actions and dependencies, branch
and environment protections, certificates, storage capacity, redacted logs and
retention/deletion, restore exercises, incident ownership and guide drift.
Expired auth sessions, throttle/OAuth entries and audit retention need explicit
project-owned maintenance. No background job is installed by KontextStack.
