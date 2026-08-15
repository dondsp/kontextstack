# KontextStack Installation

KontextStack uses one clone-first installation with two verification profiles.
The selected profile changes the depth of readiness checks, not ownership of
the user's project and not KontextStack's authority.

## Official installation

Run these commands from the parent directory where you keep local tools:

```bash
git clone https://github.com/dondsp/kontextstack.git
cd kontextstack
npm ci --ignore-scripts
npm test
```

For a small or early-stage project:

```bash
node bin/kontextstack.js install verify --mode simple
node bin/kontextstack.js doctor
```

For an established project with more architecture, environments, deployment,
data or authentication context:

```bash
node bin/kontextstack.js install verify --mode mature
node bin/kontextstack.js doctor
```

Both modes install the same safe handoff core. Mature mode additionally checks
that the clone contains the operational, security, CI, release and module-
authoring records needed for controlled evolution.

## Choosing a mode

Choose `simple` when the project is small, has few deployment surfaces and can
begin with a direct ContextPack-to-Codex handoff.

Choose `mature` when the project has multiple runtime surfaces, database or
authentication decisions, CI/CD, production state, or operational records that
must be preserved. A mature profile does not enable extra modules automatically.

The mode can be changed later. It is a verification and guidance profile, not a
permanent project classification.

## Source traceability

The verifier requires at least one Git remote that resolves to:

```text
https://github.com/dondsp/kontextstack
```

A direct clone normally has this as `origin`. A fork may use its own `origin`
as long as `upstream` points to the canonical repository. The verifier never
changes remotes; when source trace is missing it prints the exact suggested
command for the user to review.

The repository also carries `kontextstack.source.json`, `NOTICE`, `LICENSE` and
`CITATION.cff`. Generated project records retain the exact core source, commit,
module version and module integrity. The target project remains independently
owned.

## Machine-readable guide integration

ContextKraft and other guide surfaces should read the contract through the CLI
instead of maintaining a separate list of commands:

```bash
node bin/kontextstack.js install contract --mode simple
node bin/kontextstack.js install contract --mode mature
```

Both commands are read-only JSON output. This keeps the website guide aligned
with the version of KontextStack that the user actually cloned.

## What verification does not do

Installation verification does not install global packages, write project
files, edit Git remotes, fetch updates, commit, push, deploy, change DNS, access
databases, configure authentication or contact an external service.
