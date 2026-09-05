# Project adaptation

Adapt google-auth.mjs server-side with jose 6.2.12 pinned in the project lockfile. Its default verifier uses only Google HTTPS JWKS and RS256. The injection points are for trusted server tests, never browser input. Configure exact origin/callback and environment-only client values. Start via an origin-checked POST, place the returned binding only in its HttpOnly cookie, and redirect to the returned fixed Google URL. The callback reads that cookie and existing session cookie server-side, uses the exact request URL, and clears the OAuth cookie on every outcome. Store pending state in the shared durable adapter; consume it atomically before exchange. Never log query strings, authorization codes or JWTs. Identity-only scopes are fixed; no offline access. Email never auto-links accounts. Linking requires a separate user action with CSRF and a recent local session; user roles stay local. No provider tokens are retained.

- Inspect exact local/production origins and callbacks.
- Inspect local authorization and explicit existing-account linking policy.
- Inspect identity scopes, provider disable/disconnect and privacy/consent owners.

Preserve the existing working architecture and reconcile legacy records. Never overwrite customized files or delete the module lock to force an upgrade. Module installation and project adaptation are separate.
