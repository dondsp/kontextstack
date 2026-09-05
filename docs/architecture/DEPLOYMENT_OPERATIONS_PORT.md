# Deployment and operations implementation port

Candidate: 0.6.0-alpha.2, Phase 5. No provider or production action performed.

The primary predecessor revision is
9f2a29c4e56c72ef40c21eba58c98b8c6843f31b. Exact selected paths, snapshot states
and SHA-256 values are recorded in implementation.sources for both modules:
the adaptive-handoff deployment/go-live/operations guides, the deployment-cpanel
workflow and its backup/restore runbook. Working-tree inputs are distinguished
from committed source.

Read-only supporting evidence: EIP revision
26df79281636f003def848225f25f38693d0bd89, operational sections of
docs/contextstack/GITHUB_ACTIONS_AUTO_DEPLOYMENT.md and PRODUCTION_HOSTING.md.
Only reusable requirements were retained: separate server-confined identities,
exact artifacts, lockfile dependencies, asynchronous Passenger restart,
bounded smoke checks, partial transfer and independent file/data recovery.
No product implementation, hostname, account identifier, hosted path, provider
state, business checks or private evidence was copied. The supporting
repository was not modified.

## Adaptation and ownership

github-cpanel-deploy 0.6.0 installs a manually dispatched protected-environment
workflow and finite project-owned staging, FTPS delivery and smoke references.
production-operations 0.6.0 installs readiness, monitoring, incident, backup,
restore rehearsal, credential review, acceptance and file-recovery references.
The original 0.5.0 planning bundles remain immutable.

The original push trigger, cancellation of in-flight uploads, fallback npm
install, broad source-folder copy, tag-only third-party transfer action and
product-specific smoke routes were removed. Exact artifact manifests and
destination identities are approved together. Credential values enter only the
upload step and curl stdin; TLS certificate checks stay enabled. The transfer
has bounded retries, does not delete remote files, and sends restart markers
only after every selected artifact succeeds. A failed transfer stops for
inspection/recovery, not repeated deployment. Node delivery requires an exact
lockfile fingerprint for separately verified host dependencies.

The workflow is not an arbitrary command facility in the core. Project owners
review and adapt their check/build scripts and use their own GitHub/cPanel
authority. No database, bootstrap, restore, secret rotation or provider
activation is performed by the toolkit or included in the delivery commands.
The environment protection acknowledgement is not provider proof; the guide
requires actual reviewer and branch restriction verification before activation.
If required reviewers are unavailable for the selected repository/plan, retain
manual delivery until a suitable approved gate exists.

## Owner selection boundary

Before preview, deployment requires an explicit static/node/split selection;
operations requires an explicit list of real release surfaces. A new manifest
selection contract permits only bounded enumerated non-secret choices at the
fixed module-owned selection.json path. The owner creates this record. The
module cannot write/overwrite it or request another input path. Core reads it
without network access, rejects symlinks/unknown keys/unsafe values, and binds
its exact bytes to the preview. Changing an ignored selection file still makes
the prior approval stale. Missing evidence blocks preview and inspection lists
the valid choices. This never constitutes production approval.

## Review references

Reviewed 2026-09-05:

- [GitHub protected environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [curl TLS/FTPS options](https://curl.se/docs/manpage.html)
- Official actions/checkout v4 resolved to
  11d5960a326750d5838078e36cf38b85af677262.
- Official actions/setup-node v4 resolved to
  49933ea5288caeca8642d1e84afbd3f7d6820020.

The new transfer uses the runner's maintained curl rather than a third-party
deployment action. Action revisions, runner runtime and transport behavior must
be reviewed again for each actual project adoption.

## Verification and limits

Synthetic tests cover staged allowlists, hashes, symlink/path refusal, exact
destination approval, dependency gates, static/Node split delivery, restart
ordering, partial failure, prior file recovery, YAML/action/secret boundaries,
wrong product/status/route/auth/asset smoke checks, selected readiness surfaces,
stale evidence and the absence of inferred owner acceptance. No provider
credentials or external transfer is used in tests. Real FTPS confinement and
hosted acceptance remain owner-operated gates.

File recovery explicitly identifies leftover newer files for separate reviewed
removal. It never declares data/identity restoration. Operations evidence is
reported evidence supplied by the project, not proof of unseen production work.
No record evaluator can grant production authority or accept a release.

Required phase gates: full suite, source/privacy audit, doctor, mature install
verification, package inspection, all eight installed kit lifecycles and public
Node 20/22 CI. ContextKraft activation and the full release matrix follow these
gates and are not implied complete by this port.
