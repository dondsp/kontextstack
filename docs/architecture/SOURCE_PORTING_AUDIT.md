# Initial Source-Porting Audit

Status: clean-room alpha scaffold, 2026-08-15.

## Relationship to the predecessor

The private `dondsp/contextstack` repository remains an experimental predecessor
and reference source. This `dondsp/kontextstack` repository has a new Git history
and a narrower product boundary.

## Initial-history declaration

- CLI, schemas, tests, registry, module contract, templates, CI and public
  documentation were authored for this new repository boundary.
- No production credential, `.env` value, database dump, upload, media library,
  customer/user record, private chat export, or production evidence was selected.
- No complete mature module was ported.
- The only bundled module is the new `handoff-core` boundary.
- Examples are neutral fixtures, not copies of ContextKraft, ContextKraft user
  projects, or the predecessor's production evidence.

Any later port from the predecessor must use a focused commit that identifies
the source path, explains the adaptation, passes the public source audit, and
does not transitively import an unapproved module.
