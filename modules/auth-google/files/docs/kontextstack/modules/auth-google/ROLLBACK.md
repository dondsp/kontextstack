# Recovery

Disable Google sign-in and reject new starts and callbacks, including in-flight exchanges. Keep existing local accounts/permissions and stable provider-subject mappings. Disconnect only after authenticated CSRF-protected approval and proof of another sign-in method; revoke affected sessions. Client-secret rotation, consent changes and identity-data removal are separate approved actions. Do not delete users to undo provider configuration.
