# Joey Mission Control

Mission Control V0.1 is Joey's local Multi-AI Project Control Center. It answers four questions:

- **WHERE** — canonical Local Master, repository, branch, commit, production, database, and relevant documents.
- **WHAT** — verified current state, phase, completed work, current task, blocker, and next action.
- **WHO** — last AI, model, workspace, and locally observed session.
- **NEXT** — a source-backed Continue context that does not depend on chat history.

## Authority boundary

Mission Control is an independent projection and orchestration layer. It does not replace or edit Canonical Memory, Project Registry, per-project Current State, Decisions, or canonical Handoff files from the browser. Those files remain authoritative.

Writable V0.1 data is limited to local Inbox records, AI/workspace observations, and proposal state. Canonical promotion is performed by Hermes after Joey's explicit decision.

## Start

```bash
npm test
npm run sync
npm start
```

Then open the loopback URL printed by the server. The terminal also prints a local write token that remains valid for the server process lifetime; paste it into **Local write token** in the header and select **Save token** to enable Inbox and Continue writes for that browser session.

## Scope

Included: Dashboard, AI/workspace tracking, Resume/Continue, natural-language Inbox capture and interpretation preview, and source-backed Handoff views.

Excluded: public deployment, cloud sync, Gantt charts, KPI/time tracking, team workflows, calendar automation, enterprise permissions, database migrations, arbitrary shell execution, commit/push/deploy actions.

## Project lifecycle

`IDEA → DISCOVERY → SPEC → BUILD → TEST → DEPLOY → MAINTAIN`

Dashboard status is separate:

`Active | Paused | Idea | Planned | Completed`
