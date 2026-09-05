# GitHub to cPanel Deployment Runbook

Generated from the public `github-cpanel-deploy@0.5.0` module at
<https://github.com/dondsp/kontextstack>.

This module records a deployment contract. It does not create a GitHub
environment, store delivery values, connect to cPanel, upload an artifact,
restart an application, migrate a database, or trigger a workflow.

## Workflow trust boundary

- Trigger production only from the approved release branch or an explicitly
  reviewed manual dispatch.
- Use a protected GitHub environment with the required human approval policy.
- Pin third-party actions to reviewed immutable commit revisions.
- Grant the workflow the minimum repository permissions it needs.
- Commit environment and secret names only; store values in the protected
  environment and directory-scoped hosting account.

## Build and artifact contract

1. Install locked dependencies in a clean runner.
2. Run tests, type checks, audits, and project-specific policy checks.
3. Build a deterministic release artifact from an explicit allowlist.
4. Inspect the staged artifact and record its source revision and digest.
5. Retain the previous verified artifact for rollback.

Dependency-manifest changes require a separate host dependency review when the
delivery transport cannot safely run the host package manager. Database
migrations always use their own reviewed operator procedure; deployment success
must never imply migration success.

## Scoped delivery

Use a hosting identity restricted to the exact release directory. Avoid broad
account access and automatic deletion. Deploy the application and marketing
surfaces separately when they have different roots, accounts, or rollback
units. Restart a Node.js process only through the reviewed host mechanism.

## Verification and state reporting

Verify HTTPS, home and nested routes, static assets, application health,
representative API behavior, and unrelated hosted sites. Report committed,
pushed, CI-verified, artifact-built, deployed, restarted, migrated, released,
smoke-verified, rollback-ready, and owner-accepted as independent states.

## Rollback

Restore the previous artifact through the same scoped path, restore reviewed
runtime settings when needed, restart separately, and repeat smoke checks. A
database rollback or restore remains a distinct authorized operation.
