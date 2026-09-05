# Local Authentication Foundation Runbook

Generated from the public `auth-local@0.4.0` module at
<https://github.com/dondsp/kontextstack>.

This module records an authentication contract. It does not create users,
promote an administrator, connect to production storage, enable registration,
send recovery messages, or activate authentication in a deployed application.

## Identity and account policy

Define who may register, how email ownership is verified, how duplicate
identities are handled, who may create or promote administrators, and which
support process owns recovery. Registration should default closed and the first
registered account must never gain administrator access implicitly.

## Credential and session controls

- Use a modern adaptive password hash and a project-owned password policy.
- Store sessions server-side; rotate identifiers after authentication and
  privilege change; expire and revoke them explicitly.
- Use secure, HTTP-only cookies in production with a reviewed SameSite policy.
- Protect every state-changing browser request with CSRF validation.
- Rate-limit authentication and recovery paths without leaking whether an
  account exists.

## Authorization and audit

Create an explicit role-to-action matrix and deny unlisted actions. Check
authorization at the server boundary, not only in the interface. Audit account
creation, sign-in failures, role changes, session revocation, recovery, and
privileged settings changes without logging credentials or session material.

## Acceptance tests

1. Registration, verification, sign-in, sign-out, expiry, rotation, and
   revocation behave as approved.
2. Unauthenticated, cross-account, stale-session, forged-CSRF, and insufficient
   role requests fail closed.
3. Password and recovery responses resist enumeration and replay.
4. Existing accounts cannot be silently promoted through bootstrap or linking.
5. Production starts only with the approved storage, cookie, origin, and
   authorization configuration.

## Recovery

Document operator-owned account recovery, mass session revocation, compromised
administrator response, audit review, and the safe procedure to disable new
sign-ins while preserving existing product data.
