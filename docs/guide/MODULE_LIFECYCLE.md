# KontextStack Module Lifecycle

KontextStack separates core updates from project module updates. Neither path
runs automatically.

## 1. Choose a bundled release module

The public npm package and source clone include the approved release modules.
List them before choosing one:

```bash
kontextstack modules available
kontextstack modules installed --project /path/to/project
```

`modules available` combines the versioned bundled registry with valid modules
in the local filesystem cache. `modules installed` reads only the selected
project's `.kontextstack/modules.lock.json`.

The v0.5 release line bundles these optional planning modules:

| Module | Version |
| --- | --- |
| `domain-cpanel` | `0.2.0` |
| `static-site-cpanel` | `0.2.0` |
| `node-cpanel` | `0.3.0` |
| `mysql-storage` | `0.4.0` |
| `auth-local` | `0.4.0` |
| `auth-google` | `0.4.0` |
| `github-cpanel-deploy` | `0.5.0` |
| `production-operations` | `0.5.0` |

## 2. Inspect compatibility and permissions

Use the exact selected name and version. For example:

```bash
kontextstack modules inspect \
  --module domain-cpanel \
  --version 0.2.0 \
  --project /path/to/project
```

Inspection reports the exact version, source, integrity, core compatibility,
project types, dependencies, conflicts, permissions and declared files.
Portable modules must remain filesystem-only: no network access and no
commands. They may write only inside their own project-owned namespaces:

```text
.kontextstack/modules/<module-name>/
docs/kontextstack/modules/<module-name>/
```

## 3. Preview before writing

```bash
kontextstack modules preview \
  --project /path/to/project \
  --module domain-cpanel \
  --version 0.2.0
```

The project must already contain a valid handoff-created module lock and have a
clean Git baseline. Preview is deterministic and read-only. Every target is
classified as `add`, `preserve`, `update`, `conflict` or `block`.

## 4. Apply the exact preview

```bash
kontextstack modules apply \
  --project /path/to/project \
  --module domain-cpanel \
  --version 0.2.0 \
  --approve sha256-<preview-id>
```

Apply recomputes the plan and refuses a stale or different approval ID. It
updates the project lock with exact core/module source, version, integrity,
preview and per-file integrity. KontextStack prints suggested Git commands but
does not commit or push the project.

## 5. Verify the installed files

```bash
kontextstack modules verify --project /path/to/project
```

Exact locked integrities detect missing or customized module files. Legacy
handoff-core records without per-file integrity remain verifiable through their
canonical provenance markers.

## Advanced: import a separately reviewed bundle

KontextStack does not contact a remote module registry. Bundled release modules
are available immediately and do not need to be imported. Only when using a
separately reviewed portable module should you download or copy its directory
from a trusted source and fingerprint it:

```bash
kontextstack modules fingerprint --from /path/to/module-bundle
```

Compare the printed integrity with the release record. Then import it:

```bash
kontextstack modules import --from /path/to/module-bundle
```

The default cache is `~/.kontextstack/module-cache/v1`. Tests and managed
workflows can pass `--cache /explicit/path`. Import is idempotent for identical
content and refuses the same name/version when the content differs.

A local integrity match proves that content did not change after its recorded
fingerprint. It does not by itself prove who published the original directory;
obtain bundles and release fingerprints from the canonical repository.

## Safe upgrades

An upgrade must explicitly declare the installed version in `upgrade.from`.
KontextStack updates a file only when its current content still matches the
previous lock. Project customization converts the action to a conflict; there
is no force-overwrite option.

## Updating KontextStack core

Core and modules are deliberately separate. Generate the version-matched core
update sequence with:

```bash
node bin/kontextstack.js update guide --mode simple
node bin/kontextstack.js update guide --mode mature
```

The guide identifies the canonical `origin` or `upstream` remote and prints a
reviewed `git fetch` plus `git merge --ff-only` sequence. It does not fetch,
merge, reset, install or delete anything itself. After updating, it instructs
the user to reinstall locked dependencies, verify the installation, run tests
and list newly available compatible modules.
