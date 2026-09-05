# Certificate and root worksheet

Record hostname, exact approved public document root, private runtime root (if any), DNS owner, certificate issuer, covered names, expiry, verification time and rollback owner.
Keep provider session URLs, usernames and private home paths out of shareable evidence.
Use project-local restricted records for exact operational targets when necessary.

- A public document root must contain only approved public artifacts.
- A Node application root remains private and distinct from the hostname's public root.
- Sharing an account is not isolation: enumerate unrelated roots to preserve.
- Record the prior domain mapping before any creation or edit.
- TLS must cover each alias before an HTTPS request can reach its redirect.
- DNS resolution, certificate issuance and application acceptance are separate checks.
- Recheck certificate renewal ownership and expiry after cutover.
