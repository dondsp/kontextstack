# KontextStack

KontextStack is a local-first, modular handoff toolkit that connects structured
project context from [ContextKraft](https://contextkraft.com) to safe, continued
work in Codex or another local coding agent.

This repository is a clean-room successor to the private experimental
`dondsp/contextstack` repository. It intentionally starts with a small handoff
core instead of publishing every mature internal module at once.

> Status: `0.1.0-alpha.1` local foundation. Do not use it to make production,
> DNS, database, authentication, deployment, Git, or account changes.

Start with the pinned [KontextStack sequence](docs/guide/START_HERE.md). It
lists the complete order from installation and mandatory Current-State capture
through local validation, Codex continuation and later safe updates.

Before cloning, [star the canonical repository](https://github.com/dondsp/kontextstack)
to support its public visibility and choose **Watch → Custom → Releases** to
receive GitHub release notifications. A star alone does not guarantee update
notifications.

## Why KontextStack

- The user's project repository remains the source of truth.
- Inspection and preview are read-only.
- Apply requires the exact preview ID and stays within the selected project.
- Modules are independently versioned and source-traceable.
- Existing installations can discover later compatible modules through an
  explicit registry refresh; core is never silently upgraded.
- Generated records point back to the canonical source and exact versions.

## Clone-first installation

```bash
git clone https://github.com/dondsp/kontextstack.git
cd kontextstack
npm ci --ignore-scripts
npm test
node bin/kontextstack.js install verify --mode simple
node bin/kontextstack.js doctor
```

No hosted KontextStack account is required. The alpha uses Node.js 20 or newer
and only Node.js built-ins.

Use `--mode simple` for a small or early-stage project. Use `--mode mature` for
an established project with architecture, environment, deployment, data,
authentication or operational context that needs deeper readiness checks. Both
modes install the same handoff core and remain local-first. See
[the installation guide](docs/guide/INSTALLATION.md).

## First handoff

Start with a local project clone and a reviewed Handoff Pack created from the
mandatory Current-State ContextPack. An original ContextKraft Starter
ContextPack is useful historical intent, but it never replaces current
repository extraction. See the [first handoff guide](docs/guide/FIRST_HANDOFF.md).

```bash
node bin/kontextstack.js validate --handoff /path/to/handoff.json
node bin/kontextstack.js inspect --project /path/to/project
node bin/kontextstack.js preview \
  --project /path/to/project \
  --handoff /path/to/handoff.json
```

Preview prints an approval ID without writing target files. Apply only after
reviewing the exact plan:

```bash
node bin/kontextstack.js apply \
  --project /path/to/project \
  --handoff /path/to/handoff.json \
  --approve <preview-id>

node bin/kontextstack.js verify --project /path/to/project
```

KontextStack never commits or pushes the target project. It prints suggested
Git commands for the user to review.

## Commands

| Command | Purpose | Writes files |
| --- | --- | --- |
| `about` | Show version, canonical source and local Git identity | No |
| `doctor` | Check the local runtime and bundled artifacts | No |
| `install contract --mode <simple\|mature>` | Print the official, version-matched installation contract | No |
| `install verify --mode <simple\|mature>` | Verify clone integrity, attribution and canonical source trace | No |
| `validate` | Validate a Handoff Pack without printing secret values | No |
| `inspect` | Summarize a target project read-only | No |
| `preview` | Render the exact proposed handoff plan and approval ID | No |
| `apply` | Apply only the approved, safe project-owned records | Yes |
| `verify` | Check installed provenance and expected records | No |
| `modules available` | List bundled/compatible modules | No |
| `modules installed --project <directory>` | Read the selected project's module lock | No |
| `modules inspect --module <name>` | Show compatibility, permissions and declared files | No |
| `modules fingerprint --from <directory>` | Compute a portable local bundle identity | No |
| `modules import --from <directory>` | Validate and cache one exact local module version | Local cache only |
| `modules preview` | Classify an exact project module plan | No |
| `modules apply` | Apply only an exact approved module plan | Yes |
| `modules verify --project <directory>` | Verify installed module provenance and files | No |
| `update guide --mode <simple\|mature>` | Print a source-traced, fast-forward-only core update guide | No |

## Module roadmap

The alpha bundles only `handoff-core`. Later releases can add domain, static
hosting, Node.js/cPanel, MySQL, authentication, GitHub deployment, and operations
modules after their individual safety and compatibility gates pass.

Module discovery does not authorize module execution or installation. Every
module follows inspect → preview → approval → apply → verify.

The alpha can import reviewed portable modules from the local filesystem. It
does not contact a remote registry. Portable modules cannot use the network or
execute commands and may write only within their own project-owned documentation
and metadata namespaces. See the [module lifecycle guide](docs/guide/MODULE_LIFECYCLE.md).

## Source and ownership

The canonical source is <https://github.com/dondsp/kontextstack>. The Apache-2.0
license permits use and modification while requiring preservation of applicable
license, copyright and NOTICE attribution when redistributed. Generated
project records also retain the core and module source/version.

Direct clones retain the canonical repository as `origin`. Fork-based installs
remain traceable when `upstream` points to the canonical repository. The
read-only installation verifier detects both layouts and suggests a reviewed
`git remote` command when canonical trace is missing; it never edits remotes.

See [NOTICE](NOTICE), [LICENSE](LICENSE), [SECURITY.md](SECURITY.md), and
[CONTRIBUTING.md](CONTRIBUTING.md). Machine-readable ownership and provenance
are recorded in [kontextstack.source.json](kontextstack.source.json).
