# Authorized operator: domain setup

Before any mutation, record exact hostname, intended effect, owner, prior mapping,
approved document root, expected result, verification and recovery reference.
Obtain separate explicit approval for DNS, hosting mappings and certificate work.
Stop on an account, zone, root or hostname mismatch.

1. Open the known provider portal. Inspect the domain and authoritative zone.
   Do not save a session-bearing address or credential in this record.
2. Inspect existing domains and roots in the selected cPanel account. Confirm
   unrelated sites and any provider restrictions before selecting a create/edit
   action. Use a separate document root when the new site is independent.
3. Review the exact hostname/root summary before submitting the approved change.
   Creating a hosting mapping does not itself update external authoritative DNS.
4. At the approved DNS owner, change only selected records. Preserve unrelated
   services. Record prior TTL and allow for independent resolver caches.
5. Verify resolution, certificate coverage and destination health. Request or
   inspect host-managed issuance only within the approved scope.
6. Enable the chosen redirect owner only after TLS works on every source name.
   Record actual outcome and immediately run the verification matrix.
7. Stop before another change if verification fails; use the recorded rollback
   path and obtain approval for recovery actions.

Interfaces vary by cPanel version and hosting policy; verify the current screen.
Current reference: [cPanel Domains](https://docs.cpanel.net/cpanel/domains/domains/)
and [domain creation](https://docs.cpanel.net/cpanel/domains/domains/create-a-new-domain/),
checked 2026-09-05. These references identify the domain/root and HTTPS controls;
they do not establish access or authorization for the selected account.
