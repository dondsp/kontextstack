# Node runtime implementation port

Status: Phase 3 local candidate; no provider runtime or production deployment.

Predecessor revision: 9f2a29c4e56c72ef40c21eba58c98b8c6843f31b.

| Source | SHA-256 | State |
| --- | --- | --- |
| docs/adaptive-handoff/06_NODEJS_BACKEND_ON_CPANEL.md | 2aeceaf2f61b06e51a6db0719a1ea6bb135b4c2553657b0ba16e4e0d0f1c7ff8 | working-tree snapshot |
| presets/stacks/node-static-mysql-cpanel/files/start.cjs | 511ab84c3d4c7e6185ac113cad468d456edbaeb90c6bb872898ea0b35bfe41e4 | committed |
| presets/stacks/node-static-mysql-cpanel/files/src/server/index.js | 05daf39984faa2dea15c54f237eeaf026695af205309d3f0f7a1ca520a87c645 | committed |
| presets/stacks/node-static-mysql-cpanel/files/test/health.test.js | 960baee59059499ac5b8c87f07d74768f2ec60899bab5eb3ac4831c2559349da | committed |
| presets/stacks/node-static-mysql-cpanel/files/test/route-security-smoke.test.js | 8659b5e93ef07144652ca22499d53a40c7cccedd266e69fe4a1ab4b285b6c514 | committed |

The focused port reuses the CommonJS-to-ESM startup pattern, one server factory,
API-before-static routing, minimal health, safe errors, private runtime roots,
injected-port verification and recovery ownership. It removes product names,
owner-login routes, demo auth, provider autoloading, settings, maintenance UI,
business routes and unconditional database dependencies. No supporting product
repository was inspected for this phase.

The neutral no-auth runtime is newly adapted code, not a copy of the complete
preset. It adds strict configuration, explicit HTML fallback, missing-asset and
symlink refusal, bounded request headers/timeouts, separate readiness and graceful
shutdown. It stores no environment values. Existing frameworks retain their own
router; the installed adaptation brief maps behaviors into the actual project.
Numeric injected-port hosting is the tested reference path; other host bindings
require a reviewed adaptation. The React/Vite/Express preset remains unscoped.

node-cpanel 0.4.0 requires the v0.6 candidate core and declares upgrade from 0.3.0.
The published 0.3.0 bundle remains immutable under versions/0.3.0. All kit files
stay in module-owned namespaces, with network false and no command permissions.

## Verification evidence

- Installed kit is copied into disposable greenfield and existing-app fixtures.
- The generated test suite checks config rejection, liveness/readiness, API and
  asset failures, hidden files, HTML versus JSON navigation, methods and logs.
- Exact staged CommonJS shim starts in production mode with an injected local
  port, emits minimal health, then exits cleanly on SIGTERM.
- Symlink asset and unsafe-startup tests reject without revealing private inputs.
- Existing application source and installed module integrity remain unchanged.
- Real browser smoke at a disposable loopback origin: root, Details navigation,
  direct-route reload, 390-pixel viewport and visible keyboard focus.
- No session, secure-cookie, database, provider restart or hosted acceptance is
  inferred from the no-auth fixture.
- Source/privacy audit, doctor, mature clone verification, complete core suite
  and isolated candidate package smoke are required before committing this port.

Provider references checked 2026-09-05:
[Node application installation](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
and [Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/).
Instructions require inspection of the actual host controls and separate scoped
approval for creation, dependency installation, environment changes and restart.

## Initiative state

Contracts and domain/static/Node local kits are implemented. MySQL and migration
tooling, local/Google identity, deployment/operations, ContextKraft activation
and the full release/composition matrix remain outstanding. The draft PR and
candidate package do not constitute completion of the v0.6 initiative. Existing
remaining modules continue to expose their planning records until individually
ported and verified.
