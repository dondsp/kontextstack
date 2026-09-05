# Domain verification and acceptance

Run the commands in kit/checks/dns-tls-routing.md after substituting reviewed
public values. Compare authoritative and independent resolver results, including
IPv6 when present. Record expected versus actual, time and owner.

Use the synthetic request matrix to design the project-specific assertions:
HTTP and HTTPS for every host, canonical root, alias deep path with query, encoded
path, missing asset, challenge path and application/API boundary. Inspect the
first response and full finite chain. Do not bypass certificate validation.

Use a signed-out private browser for the canonical destination and aliases.
Check certificate names, visible product, final URL and unrelated site baselines.
If the target is static, also use the static kit's asset and route checks.

Pass only when targets match, TLS covers all names, redirects preserve intended
paths/queries, roots are correctly separated and prior values are recoverable.
A parking page proves neither application readiness nor production acceptance.
Record owner acceptance separately; defer unperformed provider checks.
