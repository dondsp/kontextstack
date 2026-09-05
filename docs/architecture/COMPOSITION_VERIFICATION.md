# v0.6 candidate composition evidence

All fixtures use synthetic identities, locally generated signing keys and disposable
files. MySQL runs with `--no-defaults`, `--skip-networking`, a private temporary
socket and temporary data directory. No provider account or production record is
used. Tests exercise project adaptation explicitly; module installation never
runs the templates.

| Required scenario | Executable evidence |
| --- | --- |
| Static site with apex/`www` domain | `test/static-kits.test.js`: install both kits, render neutral routing, exercise real local Apache redirects, assets and error boundaries. |
| Node without a database | `test/node-kit.test.js`: installed runtime fixture starts on injected port, serves health/readiness, shuts down, preserves an existing application. |
| Node + MySQL + local auth | `test/composition.test.js`: install all selected kits, adapt one HTTP listener, migrate a disposable database, register/login, reconnect storage and verify session persistence, CSRF and logout. |
| Above plus Google identity | Same composition test adds a locally signed OIDC response with injected local keys/exchange, verifies the resulting session through HTTP, rejects replay and disabled provider starts. The public provider is not contacted. |
| Split static/application delivery | `test/deployment-kits.test.js` and `test/module-selection.test.js`: exact destinations and artifact hash, separate identities, dependency gate, manual workflow, restart last and selected target before preview. |
| Customized module upgrade | `test/data-auth-install.test.js` and lifecycle tests retain immutable historical fingerprints and records, then refuse a changed owned file without overwriting it. |
| Failed migration and recovery decision | `test/data-auth-kits.test.js`: actual failing DDL in a disposable database leaves a blocked ledger; no blind retry; changed history and readiness fail closed. |
| Partial delivery and file rollback | `test/deployment-kits.test.js`: injected interrupted transfer, preserved previous artifact, explicit rollback restores prior hashes; no database recovery claim. |
| Existing clone/core and module upgrade | `test/core-update.test.js` verifies explicit guidance; historical-module installation tests verify upgrades. Separately rehearsed a disposable source clone from `v0.5.1` (`39430323984eb08f0e708873c5d4f43a065c2933`) through fast-forward to `754fad3b3a88f3604f694188252b12fc81c977a0`; mature verification passed before/after, followed by doctor. No original checkout changed. |
| Stop before provider approval and resume | ContextKraft `test/capability-flow.cases.ts` and `test/capability-browser.cjs`: resume stage/evidence, clear preview approval, reset provider acknowledgement; waivers remain unverified; changed contracts reset progress. |

Additional matrix tests cover domain-only, Node-only, Node+MySQL, local auth
without durable storage (production refuses), Google without local auth
(dependency refusal), deployment without a selected target and operations without
selected surfaces (blocked preview). Deployment with MySQL never adds SQL or
database credentials to the workflow.

The local release check passes 87 root tests, including generated-kit and real
Apache/MySQL checks, without skipped tests. ContextKraft separately checks its
snapshot and guide behavior. Package installation verification exercises all
eight capability modules from the actual packed candidate.

## Limits and release boundary

These results establish local implementation and fixture behavior. They do not
certify a particular project's adaptation, cPanel plan, MariaDB version, DNS,
Google consent setup, backup restoration, production workload or owner acceptance.
Those remain explicit project/provider procedures in each installed kit.

The package remains `0.6.0-alpha.2` until approved for publication. ContextKraft's
candidate guides show their exact versions and preview status. Its production
workflow refuses activation until the snapshot records a published package whose
integrity matches the public npm registry. Provider work in downstream projects
is never authorized by guide progress or by publishing this toolkit.
