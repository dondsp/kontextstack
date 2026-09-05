# Runtime verification

Run the copied/adapted runtime test fixture locally and the existing project's
canonical checks. Start the exact staged artifact with an injected port. Verify
one listener, minimal liveness, separate readiness, API JSON errors, missing asset
failures, hidden-file refusal, HTML-only fallback, safe errors and redacted logs.
Send SIGTERM locally and confirm bounded shutdown without leaked listeners.

For an existing app, retain its framework/router and add equivalent tests to its
suite. Confirm that copying a kit does not modify any application source.
Use kit/checks/browser.md for local and separately authorized hosted checks.
No-auth fixtures cannot establish session, secure-cookie or data guarantees.

After approved provider setup compare runtime version, private root, entrypoint,
environment names, logs, restart behavior, HTTPS product identity and representative
journey. Recheck actual proxy behavior before configuring trust or secure cookies.
Retain current versus previous artifact identities and owner acceptance separately.
