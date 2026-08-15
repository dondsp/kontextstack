# KontextStack Module Lifecycle

KontextStack separates core updates from project module updates. Neither path
runs automatically.

## 1. Inspect the installation

From the local KontextStack clone:

```bash
node bin/kontextstack.js modules available
node bin/kontextstack.js modules installed --project /path/to/project
```

`modules available` combines the versioned bundled registry with valid modules
in the local filesystem cache. `modules installed` reads only the selected
project's `.kontextstack/modules.lock.json`.

## 2. Import a new local module bundle

KontextStack v0.1 does not contact a remote module registry. Download or copy a
reviewed module directory from a trusted canonical release, then fingerprint it:

```bash
node bin/kontextstack.js modules fingerprint --from /path/to/module-bundle
```

Compare the printed integrity with the release record. Then import it:

```bash
node bin/kontextstack.js modules import --from /path/to/module-bundle
```

The default cache is `~/.kontextstack/module-cache/v1`. Tests and managed
workflows can pass `--cache /explicit/path`. Import is idempotent for identical
content and refuses the same name/version when the content differs.

A local integrity match proves that content did not change after its recorded
fingerprint. It does not by itself prove who published the original directory;
obtain bundles and release fingerprints from the canonical repository.

## 3. Inspect compatibility and permissions

```bash
node bin/kontextstack.js modules inspect \
  --module domain-guide \
  --project /path/to/project
```

Inspection reports the exact version, source, integrity, core compatibility,
project types, dependencies, conflicts, permissions and declared files.
Portable v0.1 modules must remain filesystem-only: no network access and no
commands. They may write only inside their own project-owned namespaces:

```text
.kontextstack/modules/<module-name>/
docs/kontextstack/modules/<module-name>/
```

## 4. Preview before writing

```bash
node bin/kontextstack.js modules preview \
  --project /path/to/project \
  --module domain-guide \
  --version 1.0.0
```

The project must already contain a valid handoff-created module lock and have a
clean Git baseline. Preview is deterministic and read-only. Every target is
classified as `add`, `preserve`, `update`, `conflict` or `block`.

## 5. Apply the exact preview

```bash
node bin/kontextstack.js modules apply \
  --project /path/to/project \
  --module domain-guide \
  --version 1.0.0 \
  --approve sha256-<preview-id>
```

Apply recomputes the plan and refuses a stale or different approval ID. It
updates the project lock with exact core/module source, version, integrity,
preview and per-file integrity. KontextStack prints suggested Git commands but
does not commit or push the project.

## 6. Verify the installed files

```bash
node bin/kontextstack.js modules verify --project /path/to/project
```

Exact locked integrities detect missing or customized module files. Legacy
handoff-core records without per-file integrity remain verifiable through their
canonical provenance markers.

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
