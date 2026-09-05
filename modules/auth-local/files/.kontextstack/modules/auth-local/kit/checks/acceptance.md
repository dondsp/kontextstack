# Acceptance checks

Test closed/open registration, generic failed login, throttling, cookie flags, origin/CSRF, session rotation/idle/absolute expiry/logout replay, role/status/password revocation, cross-user denial and concurrent one-time bootstrap. Run the same service with a real disposable MySQL adapter.

Provider acceptance: Inspect the application environment and proxy topology without reading secret values. Record exact application, HTTPS origin, durable storage and session/cookie policy. Obtain approval before configuration/restart. The private bootstrap runs only after approved schema verification, accepts identity/password through hidden interactive prompts, and requires the exact create-first-administrator confirmation. No password in arguments, environment variables, chat, Git or CI. Verify normal-user and administrator journeys privately. Revocation and recovery require explicit target/account scope; retain only synthetic or redacted evidence.
