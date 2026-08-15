# Modules and Updates

A module is an independently versioned, source-traceable unit of documentation,
workflow, validation, template, or bounded technical foundation.

## Discovery and installation

The public registry contains metadata, compatibility ranges, immutable version
identifiers, manifest locations, integrity values and security status. Discovery
does not execute module code.

The v0.1 filesystem update flow is explicit:

```text
obtain a reviewed bundle and canonical release fingerprint
→ modules fingerprint verifies the local directory identity
→ modules import validates and atomically caches one exact version
→ modules available shows bundled and imported compatible versions
→ modules inspect exposes permissions, dependencies and conflicts
→ modules preview classifies every target without writing
→ exact approval is required
→ modules apply updates only locked, unmodified module-owned files
→ modules verify checks project-owned integrities
```

A later remote-registry release may add this separate explicit discovery flow:

```text
modules refresh
→ validate a temporary registry index
→ retain the last valid cache on failure
→ modules available shows compatible exact versions
→ inspect/preview/approval/apply/verify runs against the target project
```

Older core installations can discover newly released modules when their
declared core range is compatible by importing a local bundle. Updating the
core uses a separate source-traced, fast-forward-only guide. KontextStack core
is never silently upgraded to satisfy a module.

## File ownership

Every proposed file is classified as preserve, add, adapt, conflict, or block.
An existing differing file is never treated as an arbitrary overwrite target.
Updates preserve user work; when deterministic adaptation is impossible, the
module produces a conflict or migration guide.

Project locks record exact core/module source, version, commit and integrity so
another machine can reproduce the selected foundation.

Portable v0.1 modules cannot request network access or command execution. Their
write targets are restricted to their own `.kontextstack/modules/<name>/` and
`docs/kontextstack/modules/<name>/` namespaces.
