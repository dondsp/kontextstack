# Authorized operator: cPanel Node setup

Before mutation record exact account, application hostname, private root, startup
file, tested runtime, artifact identity, environment names, operator, expected
result, verification and rollback. Obtain explicit approval for application
creation/editing, dependency installation, environment changes and restart.

1. Inspect the approved account and domain mapping. Keep public document root
   separate from the private application root and preserve unrelated projects.
2. Inspect the host's actual Node controls. Some hosts expose Application Manager;
   others provide a Node selector. Confirm tested Node major, production mode,
   application URL, private root and actual startup filename before saving.
3. Place only the approved runtime artifact in that private root. Verify package
   manifest and lockfile location before authorized dependency installation.
   Review native-library compatibility on dependency changes; never weaken
   authentication or TLS to bypass an incompatible dependency.
4. Store exact production environment values in the provider's approved store.
   This record lists names only. Confirm save/restart behavior in the current
   interface; never capture screenshots with visible secret values.
5. Restart only the approved application through its supported control. Use a
   restart marker only after verifying that the host supports it.
6. Check public health/readiness, real UI, APIs and assets after restart. A default
   host placeholder proves binding only. Inspect current sanitized logs and
   stop for recovery if the artifact or runtime differs.

Reference interfaces checked 2026-09-05:
[cPanel Node installation](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
and [Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/).
Provider behavior and enabled controls vary; confirm the actual account first.
