# Browser and hosted checks

After local artifact startup, open the injected loopback URL. Check the intended
title, stylesheet MIME, navigation, direct deep link, keyboard focus and narrow
viewport. Check /api/health and /api/ready separately; unknown API and missing
assets must return JSON failures rather than an HTML success page.

After an explicitly authorized provider restart, repeat the same journey over
valid HTTPS. Inspect console and network failures, released artifact identity,
proxy behavior, log redaction and restart recovery. Test secure-cookie/session
behavior only when authentication is separately implemented. Never mark it passed
for this no-auth runtime fixture. Retain sanitized evidence only.
