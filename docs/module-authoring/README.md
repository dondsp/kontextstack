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

The registry bundles `handoff-core` plus independently reviewed roadmap
modules. Every later module must still be added individually through review,
fingerprint verification, and compatibility fixtures.

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
production data or binary assets. Implementation kits may contain inert source
templates, but core never executes them. See
[Implementation kits](../architecture/IMPLEMENTATION_KITS.md) for the v0.6
schemas, guide fingerprint, compatibility and upgrade rules.
