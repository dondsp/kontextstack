# Static verification

Local:
- Required project tests and build pass at the recorded source revision.
- The reviewed artifact checker passes its exact file allowlist and emits hashes.
- No unresolved inputs, local origins, source maps, secrets, private files or
  accidental archive wrapper remain. Review minified bundles as public content.
- Root and a direct deep route render the intended title/content; real assets
  return correct MIME types; missing assets and /api return failures.
- Canonical metadata, navigation, viewport layout, keyboard focus and form
  success/failure match the approved behavior.

Hosted, after separate authorization:
- TLS is valid for canonical and alias names without bypasses.
- Inspect first response and finite redirect chain, including path/query.
- Request an asset directly and compare its hash to the approved release.
- Check representative route, signed-out browser, desktop/mobile and keyboard.
- Check requests for old/local/unapproved origins and form delivery when present.
- Confirm preserved provider/application paths and unrelated sites.

A local fixture does not prove provider TLS, DNS, archive extraction or hosted
behavior. Record those as deferred until observed. The owner must separately
accept the release and its rollback readiness.
