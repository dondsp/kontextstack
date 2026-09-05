# Domain rollback

Before changes retain prior record type/value/TTL, root mapping, certificate
coverage and redirect rules in a restricted project-owned record without secrets.
Name the DNS, hosting and release owners and an observation window.

On a bad target, certificate error, loop or unrelated-site regression, stop
further changes. Preserve sanitized first-response and resolution evidence.
Obtain explicit recovery approval for the exact layer:
- DNS: restore prior selected values; observe caches through the prior TTL.
- Mapping: restore the prior approved root without deleting another site's files.
- Routing: restore the previous reviewed rules and confirm no competing owner.
- TLS: keep a valid prior destination available; a redirect cannot fix failed TLS.

Repeat authoritative/recursive DNS, TLS, path/query and unrelated-site checks.
Do not delete a domain as a generic rollback step. Record restored versus still
cached behavior and the owner's recovery acceptance.
