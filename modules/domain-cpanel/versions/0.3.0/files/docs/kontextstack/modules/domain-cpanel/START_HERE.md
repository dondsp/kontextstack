# Connect a domain or subdomain

This kit prepares a reviewed DNS, certificate and routing change. It does not
change a registrar, cPanel account, DNS record or certificate.

Read implementation.json, fill decision/evidence records with non-secret facts,
and adapt the hostname, DNS-change and certificate/root worksheets. Preserve any
older plan.json and RUNBOOK.md choices; additions do not migrate those decisions.

Use IMPLEMENTATION.md locally, then CODEX_PROMPT.md in the actual repository.
Stop at PROVIDER_SETUP.md until the owner authorizes exact external targets.
Completion requires VERIFICATION.md plus an owner decision and ROLLBACK.md.
A static target does not require Node, MySQL or authentication.
