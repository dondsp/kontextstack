# cPanel Domain Planning Runbook

Generated from the public `domain-cpanel@0.2.0` module at
<https://github.com/dondsp/kontextstack>.

This record prepares a reviewable domain change. It does not log in to a
registrar or cPanel, write DNS records, issue certificates, or enable redirects.

## 1. Record the current state

- Record the hostname, DNS provider, authoritative nameservers, relevant record
  types and non-secret values, TTLs, redirects, certificate state, cPanel
  account identifier, document root, and current production owner.
- Capture dated evidence before proposing any change.
- Identify whether the request concerns an apex domain, `www`, subdomain,
  add-on domain, alias, redirect, or application route.

## 2. Approve the intended topology

- Name the canonical public hostname and every redirect source.
- Record which system owns DNS, TLS termination, files, application runtime,
  and redirect behavior.
- Confirm that the proposed cPanel document root is scoped to this release and
  cannot overwrite another site.
- Reopen architecture review when one hostname would span multiple release
  units or systems of record.

## 3. Prepare the operator change set

Write exact proposed records and cPanel fields in a separate reviewed change
ticket. Never place account credentials, private keys, provider recovery data,
or production exports in this repository.

The human operator should apply one bounded layer at a time:

1. create or verify the scoped cPanel domain mapping;
2. apply the approved DNS record;
3. wait for authoritative resolution;
4. verify certificate issuance and HTTPS behavior;
5. apply reviewed canonical redirects only after the destination is healthy.

## 4. Verify

- DNS answers match the approved target from at least two independent resolvers.
- HTTP redirects are finite and preserve the intended path and query behavior.
- HTTPS serves the intended certificate chain and hostname.
- The expected content or application health response is visible.
- Unrelated hostnames and sites remain unchanged.

## 5. Roll back and accept

Record the prior DNS values, mapping, redirects, and certificate state before
the change. Name the rollback operator and the time window in which restoration
is safe. A successful technical check is not production acceptance: the owner
must record the deployed, verified, and accepted states separately.
