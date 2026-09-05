# v0.6 implementation baseline

Verified 2026-09-05 before implementation, from a fresh clone of public main.

| Evidence | Exact value |
| --- | --- |
| Public repository | https://github.com/dondsp/kontextstack |
| Public main and peeled v0.5.1 tag | 39430323984eb08f0e708873c5d4f43a065c2933 |
| Annotated tag object | 1ca44a2a978cfd24ff40256044d6a2c4fe69ae81 |
| npm latest and package version | 0.5.1 |
| Published package file count | 71 |
| Published unpacked bytes | 190835 |
| Published tarball SHA-1 | b3bb8b91e52a65e6a802a7e45f420a75342bb5fa |
| Published and local dry-run integrity | sha512-02Yv4r0qBTcOeX+bMN4i1du2+GGSIgbQsLjSzdxVPYuvHmPe/bNDD9B6zJ4xlGw14bDd5iUlRCQSRfgvzaR4ew== |
| Predecessor specification revision | 9f2a29c4e56c72ef40c21eba58c98b8c6843f31b |
| Specification path | docs/KONTEXTSTACK_END_TO_END_CAPABILITY_IMPLEMENTATION.md |
| Specification SHA-256 | 2dea71a9ede403849ffa66052be3e727a003880794213d769fb9664aff3d9c5f |
| Implementation branch | codex/implementation-kits-v06 |

npm does not expose gitHead for this release. Instead, public main equals the
peeled release tag and npm pack --dry-run from that clean commit exactly matches
the published tarball SHA-1, SHA-512, count and unpacked size. The retrieved
published tarball was installed offline with scripts disabled in an isolated
temporary prefix; about returned 0.5.1 and doctor passed. Packaged about has no
Git commit because npm does not contain .git; this is not evidence of another
source commit.

The clean baseline passed npm ci, all 28 existing tests, npm run audit:source,
doctor, install verify --mode mature, and npm pack --dry-run. Mature installation
verification applies to the full source clone; the npm artifact intentionally
does not ship maintainer Git/CI/test records.

No supporting product repository was inspected in Phase 0/1, so there are no
supporting-project revisions to attribute yet. Their eventual focused inspections
must add exact revisions before any pattern is ported.

## Predecessor source caveat

The cited adaptive-handoff documents exist as untracked working-tree inputs at
the predecessor revision above. They must not be described as committed contents
of that revision. Porting records retain path plus exact SHA-256 and mark
state working-tree. Tracked preset files are clean at that revision. Existing
predecessor edits and the stale nested public checkout were left intact.

## Phase 1 adaptation

Source: the specification at the exact path/revision/hash above and public
src/modules/bundle.js, lifecycle.js, cache.js, and docs/architecture at the public
baseline. New schema/validation code is authored here; no product code, account
record, customer data or provider secret is copied.

Reusable pattern: reviewed local contracts, inert references, explicit gates,
source identity and additive upgrade provenance. Placeholders use neutral named
inputs. Writes remain confined to the two module-owned namespaces. Tests cover
malformed and unsupported contracts, missing files, source/content integrity,
dependency compatibility, traversal, symlinks, secret-like input, exact approval,
and legacy upgrade conflicts. Run the public source audit for each porting commit.
