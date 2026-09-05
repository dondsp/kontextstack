# Operator checks (copy and adapt; core never executes)

After separately authorized provider setup:

```sh
dig NS <ZONE>
dig @<AUTHORITATIVE_NAMESERVER> <HOSTNAME> A
dig @<AUTHORITATIVE_NAMESERVER> <HOSTNAME> AAAA
dig <HOSTNAME> CNAME
curl --fail --silent --show-error --head 'https://<HOSTNAME>/'
curl --silent --show-error --head --max-redirs 5 --location 'http://<ALIAS_HOST>/deep/path?source=redirect-check'
```

Compare exact targets; record NXDOMAIN, conflicting A/AAAA records and stale caches.
Inspect the first response as well as the finite chain. No --insecure: a TLS
failure must fail the check. Verify canonical host, path and query remain correct.
Also test encoded paths, a missing asset, .well-known challenge paths and /api.
Record only status, sanitized location, target comparison and certificate coverage.
Do not retain session URLs or full provider responses containing private records.
