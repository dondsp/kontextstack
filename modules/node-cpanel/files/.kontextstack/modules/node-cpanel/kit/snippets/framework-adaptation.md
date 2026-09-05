# Existing framework adaptation

Read the repository's instructions and architecture. Locate the one production
server, build output, proxy integration and health route. Keep the existing
framework and router. Do not paste the reference server beside it.

Transfer the required behavior: injected port, bounded HTTP input, minimal
liveness, separate readiness, JSON API errors, missing-asset refusal, intentional
HTML fallback, safe startup errors, redacted logs and bounded shutdown.

Translate those checks into the project's test framework. Configure proxy trust
from observed topology; forwarded headers are untrusted by default. When auth is
selected, separately test secure cookies, session rotation and origin/CSRF
boundaries. This runtime kit does not implement identity or durable data.

Adapt start.cjs only if the host needs a CommonJS shim. Its import must point to
the actual built entrypoint. Run the exact staged artifact locally with an
injected port before an authorized host restart.
