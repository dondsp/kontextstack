# cPanel Node.js Runtime Runbook

Generated from the public `node-cpanel@0.3.0` module at
<https://github.com/dondsp/kontextstack>.

This module defines a reviewable runtime contract. It does not sign in to
cPanel, create an application, install packages on a host, set environment
values, restart a process, or deploy an artifact.

## Runtime contract

Record the supported Node.js major version, private application root, built
server entrypoint, startup command, public origin, health path, static asset
directory, and reverse-routing expectations. Confirm that the entrypoint in the
release artifact is the one cPanel will execute—not a development source file.

## Environment boundary

- Commit only environment variable names, purpose, required/optional status,
  validation rules, and ownership.
- Keep every production value in the approved host or environment store.
- Fail startup when a required name is absent, a placeholder is present, or the
  public origin violates the release policy.
- Separate build-time public configuration from server-only runtime settings.

## Preflight

1. Run tests and build using the selected Node.js major.
2. Start the exact built entrypoint in a production-like local process.
3. Verify the health route, static files, nested routes, and controlled failure
   behavior without using production data.
4. Inspect the staged artifact and dependency manifests.
5. Record current cPanel application settings and the previous artifact.

## Operator procedure

The human operator creates or updates the scoped cPanel application, chooses
the approved runtime, root and entrypoint, enters environment values directly
in the host interface, installs dependencies through the host-supported
mechanism, and performs the documented restart.

## Verification and rollback

- The process starts once and remains healthy after the operator restart.
- HTTPS, host routing, static assets, API health, and one representative request
  behave as expected.
- Logs contain no environment values or private request data.
- A missing required setting fails closed with a non-sensitive diagnostic.
- Rollback restores the previous artifact and runtime settings, restarts the
  application, and repeats health checks.

Record built, uploaded, configured, restarted, verified, and accepted as
separate states.
