# Runtime implementation

1. Read project instructions and locate one canonical server source, built
   entrypoint, startup shim, lockfile, build command and static output. Record the
   tested Node major and provider-supported version. Do not add another framework.
2. Compare kit/snippets/framework-adaptation.md with the actual runtime. Adapt
   injected-port behavior, health/readiness, API/static ownership, timeouts,
   error redaction and shutdown in the existing framework when present.
3. For a greenfield no-auth fixture only, copy templates/runtime.mjs and start.cjs
   into a disposable application root, fixtures/public into public, and
   checks/runtime.test.mjs into test/runtime.test.mjs. Run node --test.
4. Provide environment names from environment-names.json. Production requires
   a reviewed HTTPS origin, service identity and host-injected PORT. Never upload
   a production .env. The minimal reference does not trust forwarded headers;
   proxy/cookie/origin behavior requires a reviewed framework-specific adapter.
5. Run the exact start.cjs artifact with a locally injected numeric port. Match
   the actual provider's binding requirements; Passenger/socket-based hosting
   may require a deliberate shim adaptation. The reference is not universal.
6. Inspect runtime-artifact.json: exact allowlisted startup/server/public files,
   package manifest and canonical lockfile when dependencies exist. Exclude Git,
   tests, local fixtures, maps, secrets, dumps, backups, logs and unreviewed modules.
7. Test health, readiness failure, unknown API, real and missing assets, hidden
   files, direct HTML route, non-HTML route, unsafe method and bounded shutdown.
   Logs must contain approved categories only, never URLs with query data,
   request bodies, cookies, authorization headers or exception details.
8. Preserve prior files and host configuration before separately approved setup.

The reference deliberately has no identity, sessions or durable storage. A healthy
no-auth runtime must not imply auth or database readiness. Compose those kits only
when project evidence calls for them. The React/Vite/Express upgrade is unscoped.
