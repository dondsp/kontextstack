# Handoff Core Decisions

- Generated records belong to the target project and should be committed only
  after user review.
- The source Handoff Pack is referenced by ID/hash and is not copied into the
  project automatically.
- Preview renders in memory and writes nothing.
- Apply requires the exact deterministic preview ID.
- Existing differing files are conflicts, not overwrite candidates.
- Generated records contain no secret values and retain canonical provenance.
