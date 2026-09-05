# Domain implementation

1. Inspect the project instruction files, routes, existing .htaccess, deployment
   records and canonical metadata. List apex, aliases, application/API and
   reserved hostnames. Identify registrar, authoritative DNS owner, hosting
   account and unrelated hosted sites using sanitized records.
2. Complete kit/templates/hostname-matrix.json. Distinguish a public document
   root from a private runtime root. Independent sites need independent roots.
   Do not copy a private runtime or environment file into a public directory.
3. Record each prior DNS mapping, record type and TTL in dns-change.json. Keep
   existing email/verification records and nameservers unless a scoped change
   is explicitly necessary. Identify conflicting A and AAAA responses.
4. Complete certificate-and-roots.md. An HTTPS alias needs valid certificate
   coverage before its redirect can run. Verify the destination is healthy.
5. Choose one owner for each redirect: provider, Apache, runtime or CDN. Adapt
   canonical.htaccess only for an approved alias and a fixed canonical host.
   Escape regex dots; do not derive the destination from an arbitrary Host header.
6. Start with temporary routing and inspect path/query behavior. Preserve existing
   rules and challenge paths. Only the owner can accept a permanent redirect.
7. Compose with the static kit when the target is static. An application hostname
   may need the Node kit, with evidence-exact runtime ownership.

Save project-owned adaptations separately from the installed templates. Core
verify checks kit integrity; it does not verify the adapted host configuration.
