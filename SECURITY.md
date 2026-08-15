# Security Policy

## Supported versions

Only the newest tagged minor release and explicitly identified security fixes
are supported. Alpha versions are evaluation software and must not receive
production credentials or direct production authority.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability or exposed secret.
Use GitHub's private vulnerability reporting for
`https://github.com/dondsp/kontextstack` once enabled. Until that channel is
confirmed, contact the repository owner privately through the verified contact
method on the `dondsp` GitHub profile.

Include the affected version, reproduction steps, impact, and whether any real
secret or private data may have been involved. Never paste an active credential
into a report.

## Product security boundary

KontextStack is local-first. It must not:

- upload project source or context implicitly;
- print secret values;
- write outside the explicitly selected target project;
- execute module scripts during discovery;
- overwrite existing files without an exact, reviewed preview;
- commit, push, deploy, change DNS, migrate data, or create accounts.
