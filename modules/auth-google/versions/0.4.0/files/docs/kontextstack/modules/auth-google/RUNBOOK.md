# Google Authentication Adapter Runbook

Generated from the public `auth-google@0.4.0` module at
<https://github.com/dondsp/kontextstack>.

This optional module records a provider-adapter plan. It does not create a
Google Cloud project, configure a consent screen, store provider configuration
values, request user consent, link accounts, grant roles, or enable production
sign-in.

## Separate identity from service access

Use the minimum OpenID identity scopes for sign-in. Treat Google Workspace or
other service access as a separate, later consent flow with its own purpose,
scope review, encrypted storage, revocation, and user-visible connection state.
Identity sign-in must not silently grant offline service access.

## Provider contract

- Record approved local and production origins and exact callback paths.
- Require state, nonce, PKCE where supported, verified issuer, intended
  audience, verified email, and bounded clock handling.
- Map the stable provider subject to a local identity; do not use mutable profile
  fields as the sole account key.
- Never link an existing local account or grant a role without the approved
  linking and authorization policy.
- Keep provider configuration values outside the repository and fail closed
  when storage or origin requirements are unsafe.

## Acceptance tests

1. Valid sign-in creates only the approved local session and role.
2. Invalid state, nonce, issuer, audience, callback, unverified email, closed
   registration, and replayed responses fail closed.
3. Existing-account linking requires the approved proof and cannot elevate
   privileges.
4. Identity-only consent excludes Workspace scopes and offline access.
5. Disconnect and revocation remove stored grants without deleting the local
   account unexpectedly.

## Operator boundary and recovery

The authorized operator owns provider-console configuration, domain and consent
verification, production values, enablement, monitoring, revocation, and
incident response. Preserve a documented method to disable the provider while
keeping local authorization and account ownership consistent.
