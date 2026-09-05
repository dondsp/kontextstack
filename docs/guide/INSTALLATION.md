# KontextStack Installation

This is step 1 in the pinned [Start Here sequence](START_HERE.md).

KontextStack supports a public npm installation and a full source clone. npm is
the direct path for normal use. Clone the source when you need contributor
history or the extended repository-verification profile. Neither path changes
ownership of the user's project or KontextStack's authority.

## Optional GitHub release notifications

Open <https://github.com/dondsp/kontextstack> while signed in to GitHub:

1. Select **Star** to support the public project and keep it easy to find.
2. Select **Watch**, choose **Custom**, enable **Releases**, and apply the
   selection.

Starring helps discovery but does not guarantee update notifications. Watching
releases is the GitHub notification path for published versions. These actions
require a GitHub account, but installing the public npm package does not. Clone
or fork the repository only when you need the source or intend to contribute.

## Recommended npm installation

No npm account is required to install the public package:

```bash
node --version
npm install --global kontextstack@latest
kontextstack about
kontextstack doctor
```

Compare the installed and public versions before applying an update:

```bash
npm list --global kontextstack --depth=0
npm view kontextstack version
npm install --global kontextstack@latest
kontextstack doctor
```

## Full source installation

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

Both modes verify the same source distribution. Mature mode additionally checks
that the clone contains the operational, security, CI, release and
module-authoring records needed for controlled evolution. The deep
`install verify` command requires a Git clone; npm users use `about` and
`doctor`.

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

Installation verification does not write project files, edit Git remotes,
fetch updates, commit, push, deploy, change DNS, access databases, configure
authentication, or contact an external service. The explicit npm install or
update command changes only the user's global npm installation.
