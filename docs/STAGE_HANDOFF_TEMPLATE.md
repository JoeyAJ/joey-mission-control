# Stage handoff template

A stage handoff lets Codex, Claude, Gemini, Hermes or Dots continue the same project without relying on a previous conversation or model.

Use the repository and canonical handoff instructions. Record only observed facts. A Git author or co-author is not proof of the executing Agent or actual model.

```text
Project: <canonical project ID>
Timestamp: <event time with timezone>
Task: <this exact stage and scope>
Status: <SUCCESS / BLOCKED / PARTIAL>
Executed by: <actual Agent explicitly known for this stage>
Model: <actual model, when explicitly observable>
Model missing reason: <if unavailable, explain; never guess>
Repository: <canonical repository>
Branch: <confirmed branch>
Baseline SHA: <inspected baseline>
Result: <what changed, result entry, source fingerprints>
Verification: <commands, checks, outcomes and limitations>
Acceptance: <actual user acceptance or PENDING>
Next action: <next stage and constraints>
Blockers: <unresolved source conflict / missing field / dependency>
```

Do not inherit an older Agent/model into a newer stage whose handoff omits it. Distinguish a source/deployment reconciliation stage from the authorship of product features. Missing Agent/model fields belong in the next executing Agent's handoff, not a form Joey must reconstruct.

Preserve current edits. Inspect → confirm baseline → implement → test → review → Joey acceptance → commit/push → deploy → final handoff. Execution and release authority must come from the user; this guide grants none. Keep private paths, tokens and local records out of public snapshots.
