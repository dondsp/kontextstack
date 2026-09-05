# Static artifact implementation

1. Read project instructions and inspect package scripts, lockfile, build output,
   routing, forms, metadata and asset references. Confirm the canonical source
   repository and whether another builder is still an upstream reference.
2. Record source commit, content approval, reviewed install/test/build commands,
   exact output root, domain, license/provenance of public assets and exclusions.
   Build locally using the actual project's required checks.
3. Copy artifact-policy.json into a project-owned release record. Enumerate every
   approved output path; do not generate an allowlist from unreviewed output.
   Set sourceCommit, canonicalOrigin, formModel and approvedBy from evidence.
4. Review kit/checks/artifact.mjs, then run it manually against a disposable build
   directory and that reviewed policy. It only reads and emits path/hash evidence.
   A valid result is an artifact gate, not a complete secret audit or acceptance.
5. Choose multi-page or SPA routing from observed behavior. For a domain-root SPA,
   adapt spa.htaccess: API paths and missing asset-like paths fail before fallback.
   Dotted client routes require a deliberate project-specific adaptation and tests.
   Preserve provider rules and challenge paths. Review the domain kit if needed.
6. Use https.htaccess only for direct TLS termination owned by that file; behind
   a proxy use the actual reviewed HTTPS owner. Never trust arbitrary forwarded
   headers. Validate certificates before enforcement.
7. Verify root, assets, MIME types, direct deep route, missing asset, API refusal,
   title/canonical metadata, responsive layout and keyboard behavior.
8. Inspect the archive listing. index.html must extract directly into the intended
   document root. Exclude the archive itself, Git files, source maps, secrets,
   backups, development files and unrelated subdirectories.

Forms require an explicit model: no form, mailto (no delivery guarantee), an
approved hosted provider, or a separately secured backend. Test success and
failure; never show success before a submission actually succeeds.
