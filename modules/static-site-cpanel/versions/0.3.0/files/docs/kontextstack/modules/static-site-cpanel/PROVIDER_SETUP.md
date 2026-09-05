# Authorized operator: static publication

Prepare a reviewable release record before asking for provider authorization:
exact account/domain/root, artifact hash, list of changed public files, protected
paths, backup outside the public root, operator, verification and recovery owner.
Obtain explicit approval for the upload/extraction and any removal or overwrite.

1. Open the known cPanel portal and confirm the approved domain/document root.
   Do not retain session URLs. Stop if the root or account differs.
2. Inspect current root contents and provider-managed paths such as .well-known.
   Identify application subdirectories and exclude them from this release.
3. With approval, retain the previous public release outside the public root.
   If it includes user-generated files, stop for a separately approved data
   backup procedure; a file release does not grant production data authority.
4. Upload only the reviewed archive, inspect its layout, and extract into the
   approved scope. Do not select a whole-account or unrelated directory target.
5. Confirm index.html and approved assets are at the correct level. Remove the
   uploaded archive from public reach within the approved cleanup scope.
6. Run the hosted verification matrix and compare released assets with the
   approved artifact. Record upload success separately from acceptance.
7. Stop on mismatch; follow ROLLBACK.md with the recovery owner's authorization.

Provider controls and archive behavior vary. Confirm the current file-manager
interface and host policy before mutation. Reference:
[cPanel File Manager](https://docs.cpanel.net/cpanel/files/file-manager/).
No provider action has occurred merely because this checklist is read.
