# Add durable local authentication

This is an inert implementation kit. Installing it grants no provider or production authority. Read decision.json, evidence.json, implementation.json and ROLLBACK.md, then use CODEX_PROMPT.md in the actual project.

Adapt local-auth.mjs into the canonical server; memory-store.mjs is a fixture only. Production startup requires a durable store, exact HTTPS origin and complete reviewed schema. The MySQL module supplies the standard durable adapter; auth-local can be installed alone for explicit local/test evaluation. Use 15–1024-byte bounded passwords (minimum 15 characters), asynchronous scrypt N=131072/r=8/p=1 and benchmark host memory/load. Never reduce work factors silently. Sessions are opaque; only hashes are stored. Serialize each mutation and use version invalidation on role/status/password changes. Map the route adapter into the existing router, preserving exact origins, bounded JSON, trusted server-derived client rate keys and no request-body logs. Authentication methods return server-internal tokens: only send the cookie, public user and CSRF token to the browser. Do not expose bootstrap or externalIdentity as public routes. Recovery, email verification, invitations and MFA need separately scoped implementations.

Source: https://github.com/dondsp/kontextstack
