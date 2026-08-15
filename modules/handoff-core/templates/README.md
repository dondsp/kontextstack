# Template contract

The alpha renderer constructs five deterministic project-owned records from
validated Handoff Pack fields and a read-only project snapshot. No source code
or secret-bearing value from the Handoff Pack is copied into generated output.

The template identifiers and target paths are declared in `module.json`; the
renderer implementation lives in `src/modules/handoff-core.js` and is covered
by snapshot-independent behavioral tests.
