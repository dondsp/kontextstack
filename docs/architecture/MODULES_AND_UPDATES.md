# Modules and Updates

A module is an independently versioned, source-traceable unit of documentation,
workflow, validation, template, or bounded technical foundation.

## Discovery and installation

The public registry contains metadata, compatibility ranges, immutable version
identifiers, manifest locations, integrity values and security status. Discovery
does not execute module code.

The planned update flow is explicit:

```text
modules refresh
→ validate a temporary registry index
→ retain the last valid cache on failure
→ modules available shows compatible exact versions
→ modules add downloads and verifies one immutable module
→ inspect/preview/approval/apply/verify runs against the target project
→ update the project-owned lock and receipt
```

Older core installations can discover newly released modules when their
declared core range is compatible. KontextStack core is never silently upgraded
to satisfy a module.

## File ownership

Every proposed file is classified as preserve, add, adapt, conflict, or block.
An existing differing file is never treated as an arbitrary overwrite target.
Updates preserve user work; when deterministic adaptation is impossible, the
module produces a conflict or migration guide.

Project locks record exact core/module source, version, commit and integrity so
another machine can reproduce the selected foundation.
