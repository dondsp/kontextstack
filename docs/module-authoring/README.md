# Module Authoring

A KontextStack module is a versioned, source-traceable unit of documentation,
workflow, validation, template, or bounded technical foundation.

Before proposing a module, define:

- one user outcome;
- supported project types and maturity levels;
- compatible core versions;
- complete declared files and permissions;
- dependencies and conflicts;
- non-secret variables;
- deterministic preview and validation;
- add, update and removal ownership rules;
- immutable archive integrity and canonical source.

The alpha repository bundles only `handoff-core`. Later roadmap modules must be
added individually through review and compatibility fixtures.

## Portable filesystem bundle

A v0.1 portable module directory contains:

```text
module.json
files/
  .kontextstack/modules/<module-name>/...
  docs/kontextstack/modules/<module-name>/...
```

Each `files` entry maps a project-owned `path` to a bundle-local `source` under
`files/`. Every target must also appear exactly once in
`permissions.writePatterns`. Portable modules must declare `network: false` and
an empty `commands` list.

The bundle fingerprint is computed from the manifest with
`source.integrity` omitted plus the ordered path/source/content integrities. Use
`modules fingerprint --from <directory>`, place the result in
`source.integrity`, and rerun the command to confirm the same value.

Module updates must list supported prior versions in `upgrade.from`. Files are
eligible for update only while they still match the integrity stored by the
previous apply. Do not use module files for credentials, `.env` values,
production data, binary assets or executable code.
