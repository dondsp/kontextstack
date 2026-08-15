import { stableStringify, integrity } from "../core/json.js";
import { CANONICAL_SOURCE, GENERATED_PATHS } from "../core/constants.js";

function jsonFile(value) {
  return `${stableStringify(value, 2)}\n`;
}

function bulletList(values, fallback = "None recorded.") {
  if (!values?.length) return `- ${fallback}`;
  return values.map((value) => `- ${String(value).replaceAll("\n", " ")}`).join("\n");
}

export function renderHandoffCore({ handoff, snapshot, metadata, previewId }) {
  const baseline = {
    repository: snapshot.git.remoteRepository,
    branch: snapshot.git.branch,
    commit: snapshot.git.commit,
    dirty: snapshot.git.dirty
  };

  const projectRecord = {
    schemaVersion: "1.0.0",
    project: {
      name: handoff.project.name,
      repository: handoff.project.repository,
      baseline
    },
    core: {
      name: metadata.name,
      version: metadata.version,
      source: metadata.source,
      commit: metadata.commit
    },
    handoff: {
      artifactId: handoff.artifactId,
      contentHash: handoff.contentHash
    },
    createdAt: handoff.createdAt
  };

  const moduleLock = {
    schemaVersion: "1.0.0",
    core: {
      version: metadata.version,
      source: metadata.source,
      commit: metadata.commit
    },
    modules: [
      {
        name: metadata.module.name,
        version: metadata.module.version,
        source: metadata.module.source,
        integrity: metadata.module.integrity,
        appliedFromPreview: previewId,
        files: GENERATED_PATHS
      }
    ]
  };

  const receipt = `# KontextStack Handoff Receipt

This project received the **${metadata.module.name}** foundation through an
exact, local KontextStack preview.

## Provenance

- Canonical source: ${CANONICAL_SOURCE}
- Core version: ${metadata.version}
- Core commit: ${metadata.commit ?? "uncommitted local scaffold"}
- Module: ${metadata.module.name}@${metadata.module.version}
- Module integrity: ${metadata.module.integrity}
- Preview ID: ${previewId}
- Handoff Pack: ${handoff.artifactId}
- Handoff content hash: ${handoff.contentHash}

## Project baseline

- Repository: ${handoff.project.repository}
- Branch: ${baseline.branch}
- Commit: ${baseline.commit}
- Working tree was clean: ${baseline.dirty === false ? "yes" : "no"}

## Applied boundary

Only project context, continuation, lock, receipt, and source-notice records
were proposed. No application source, dependency, Git state, deployment, DNS,
database, authentication, credential, or external account was changed.

## Remaining handoff context

Conflicts:
${bulletList(handoff.reconciliation.conflicts)}

Unknowns:
${bulletList(handoff.reconciliation.unknowns)}

Review the generated files and commit them from this project repository only
when they accurately represent the intended handoff.
`;

  const continuation = `# Continue This Project in Codex

Open a new Codex task from this project folder. Ask Codex to read the project
instructions and the KontextStack records before proposing changes.

## Copy-ready prompt

> Continue work on **${handoff.project.name}** from its current local repository.
> Start read-only. Read the project instructions, this repository's current Git
> state, \`.kontextstack/project.json\`, \`.kontextstack/modules.lock.json\`, and
> \`docs/kontextstack/HANDOFF_RECEIPT.md\`. Treat repository evidence as observed
> implementation and the handoff goal as approved direction; keep conflicts and
> unknowns visible. Do not print secret values, deploy, change DNS, migrate data,
> create accounts, commit, or push unless I explicitly request that separate
> action. Current goal: ${handoff.goal.statement.replaceAll("\n", " ")}

## Expected outcomes

${bulletList(handoff.goal.outcomes)}

## Acceptance evidence

${bulletList(handoff.goal.acceptance)}

## Authoritative project records

${bulletList(handoff.authority.projectRecords)}

Generated with KontextStack from ${CANONICAL_SOURCE}.
`;

  const notice = `KontextStack generated foundation notice

Canonical source: ${CANONICAL_SOURCE}
Core version: ${metadata.version}
Module: ${metadata.module.name}@${metadata.module.version}
Module integrity: ${metadata.module.integrity}
Handoff Pack: ${handoff.artifactId}
Preview ID: ${previewId}

This notice identifies the source of the generated handoff foundation. The
user project remains independently owned and is not automatically licensed as
part of KontextStack merely because these records are present.
`;

  return new Map([
    [".kontextstack/project.json", jsonFile(projectRecord)],
    [".kontextstack/modules.lock.json", jsonFile(moduleLock)],
    ["docs/kontextstack/HANDOFF_RECEIPT.md", receipt],
    ["docs/kontextstack/CONTINUE_IN_CODEX.md", continuation],
    ["KONTEXTSTACK-NOTICE.txt", notice]
  ]);
}

export function renderedIntegrity(rendered) {
  return Object.fromEntries(
    [...rendered.entries()].map(([target, content]) => [target, integrity(content)])
  );
}
