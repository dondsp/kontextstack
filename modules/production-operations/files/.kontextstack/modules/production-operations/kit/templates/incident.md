# Incident record

Release/incident reference: <REFERENCE>
Observed boundary and time: <BOUNDARY_AND_TIME>
Severity, response owner and support window: <OWNER_AND_WINDOW>
Customer communication owner/channel: <OWNER_AND_CHANNEL>
Containment proposal, exact target and expected impact: <PROPOSAL>
Separate owner authorization: <APPROVAL_REFERENCE>

Start with the first failing boundary: DNS/TLS; redirect ownership; artifact and
MIME; runtime startup/dependencies; API fallback; cookie/CSRF/session; database
connection versus schema; partial transfer; provider timeout/consent.
Capture minimal redacted observations. Do not paste raw logs, request bodies,
database rows, customer records or credentials. Do not change several layers at
once or repeatedly deploy an unchanged broken revision.

Recovery decision: <FILE_ROLLBACK_OR_RUNTIME_OR_DNS_OR_DATA_OR_IDENTITY>
Compatibility with current schema/provider contract: <REVIEW_REFERENCE>
Expected data loss, service interruption and observation window: <ASSESSMENT>
Recovery verification and remaining risk: <NON_SECRET_REFERENCE>
Source reconciliation for any emergency edit: <COMMIT_REFERENCE>
Owner acceptance/rejection and follow-up owner/date: <DECISION_REFERENCE>
