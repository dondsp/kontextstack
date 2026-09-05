# cPanel Static Site Publication Runbook

Generated from the public `static-site-cpanel@0.2.0` module at
<https://github.com/dondsp/kontextstack>.

This module records a release plan. It does not build, upload, delete remote
files, edit cPanel, or change a production route.

## Release unit

Record the exact source revision, deterministic build command, output
directory, generated artifact digest, target hostname, and directory-scoped
delivery account. Keep the source tree separate from the upload artifact.

## Preflight

1. Run project-owned tests and the production build locally or in reviewed CI.
2. Inspect the artifact for source maps, private records, development files,
   unexpected large assets, and files outside the public release allowlist.
3. Confirm the target directory belongs only to this site.
4. Capture or verify a recoverable copy of the current production artifact.
5. Review routing files, SPA fallbacks, cache headers, canonical URLs, and error
   pages as ordinary release inputs.

## Operator delivery

The human or separately approved deployment system uploads only the inspected
artifact to the scoped directory. Do not enable broad mirroring or delete
extraneous remote files unless a dedicated review proves that the remote scope
contains no shared or operator-managed files.

## Verification

- The home page and at least one direct nested route return the expected build.
- Static assets load over HTTPS without mixed content or missing-file errors.
- Cache behavior matches the release policy.
- A nonexistent path has the intended SPA or 404 behavior.
- No directory listing, source file, private record, or server configuration is
  publicly exposed.
- Unrelated sites on the account remain healthy.

## Rollback and acceptance

Restore the previously recorded artifact using the same scoped delivery path,
then repeat smoke checks. Record commit, artifact digest, upload completion,
verification, rollback readiness, and owner acceptance as separate states.
