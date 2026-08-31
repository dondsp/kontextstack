# ChatGPT Sites handoff example

This synthetic example shows the decision required when a public surface began
in ChatGPT Sites but belongs to the same customer journey as an existing
application.

The approved outcome reuses `example/learning-platform` as the canonical
implementation and release repository. The old builder mirror is recorded as
rollback evidence, not an active release target. This is an example, not a rule
that every ChatGPT Site must be unified: a genuinely standalone surface may use
`new-standalone` when independent ownership and release behavior are approved.

Validate it locally:

```bash
node bin/kontextstack.js validate \
  --handoff examples/chatgpt-sites-handoff/handoff.json
```

The pack contains no credentials, private repository names or production data.
