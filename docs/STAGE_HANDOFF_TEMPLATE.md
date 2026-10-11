# Stage handoff template

A stage handoff lets Codex, Claude, Gemini, Hermes or Dots continue the same project without relying on a previous conversation or model.

Use the repository's actual entry and handoff instructions. README.md, DEVELOPMENT.md or a documented nested handoff can be authoritative; root HANDOFF.md is not required. The entry should link to the current stage record when they are separate. Record only observed facts. A Git author or co-author is not proof of the executing Agent or actual model. This template is available in MC; adopting it in another repository requires that repository's existing write authority.

```text
Project: <canonical project ID>
Timestamp: <event time with timezone>
Task: <this exact stage and scope>
Status: <SUCCESS / BLOCKED / PARTIAL>
Last Developer: <actual executing Agent for this stage, or UNKNOWN>
Model: <optional actual model, or UNKNOWN; never guess>
Repository: <canonical repository>
Branch: <confirmed branch>
Baseline SHA: <inspected baseline>
Tested source SHA: <exact source tested; not a future handoff commit>
Entry: <actual entry path and any current-stage handoff path>
Result: <changes, result entry, source fingerprints>
Verification: <commands, checks, outcomes and limitations>
Acceptance: <actual user acceptance with evidence, or PENDING/UNKNOWN>
Next action: <next stage and constraints>
Blockers: <unresolved source conflict / missing field / dependency>
```

Timestamp is the stage record's update time. The reader independently records observed branch HEAD and read time; these are different facts. A documentation commit can follow the tested code commit, so do not invent a self-referential source SHA. Preserve the last confirmed record as stale during an outage; a recent read, successful test or published preview does not establish product acceptance or a running Agent.

Do not inherit an older Agent/model into a newer stage whose handoff omits it. Distinguish a source/deployment reconciliation stage from the authorship of product features. Missing Agent/model fields belong in the next executing Agent's handoff, not a form Joey must reconstruct.

Preserve current edits. Inspect → confirm baseline → implement → test → review → Joey acceptance → commit/push → deploy → final handoff. Execution and release authority must come from the user; this guide grants none. Keep private paths, tokens and local records out of public snapshots.

## Versioned delivery evidence for the receiving Agent

Before claiming full delivery: finish relevant tests, perform only authorized deployment, verify the permitted fixed public URL against the exact deployment/code, consolidate leading current docs/data/migration handoff, then record evidence. v2 registration uses schemaVersion=mc.repository-run.v2 and taskKind; every event has delivery:null or a complete snapshot. Use the copied helper's delivery-template command for run-bound NOT_RECORDED fields, then fill only actual evidence. All assertions remain AGENT_REPORTED; Contents-read is blob integrity only. Missing/blocked required evidence is incomplete; N/A needs applicable project policy and explicit reason. Independent verification and Joey acceptance remain pending. Fixed alias movement makes previous checks historical. See [delivery v2 contract](contracts/REPOSITORY_RUN_DELIVERY_V2.md). Never convert old run headers or append to terminal history; make a new same-scope predecessor run for delivery followup. No copied instruction grants deployment/SQL/access authority.
