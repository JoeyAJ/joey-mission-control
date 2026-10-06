# Joey Mission Control

Mission Control V0.2 is Joey's local Multi-AI Project Control Center. It answers four questions:

- **WHERE** — canonical Local Master, repository, branch, commit, production, database, and relevant documents.
- **WHAT** — verified current state, phase, completed work, current task, blocker, and next action.
- **WHO** — last AI, model, workspace, and locally observed session.
- **NEXT** — a source-backed Continue context that does not depend on chat history.

## Authority boundary

Mission Control is an independent projection and orchestration layer. It does not replace or edit Canonical Memory, Project Registry, per-project Current State, Decisions, or canonical Handoff files from the browser. Those files remain authoritative.

Writable local data is limited to local Inbox records, AI/workspace observations, and proposal state. Canonical promotion is performed by Hermes after Joey's explicit decision.

## Start

```bash
npm test
npm run sync
npm start
```

Then open the loopback URL printed by the server. The terminal also prints a local write token that remains valid for the server process lifetime; paste it into **Local write token** in the header and select **Save token** to enable Inbox and Continue writes for that browser session.

## Scope

Included: Dashboard, AI/workspace tracking, Resume/Continue, natural-language Inbox capture and interpretation preview, and source-backed Handoff views.

V0.2 adds persistent Inbox history/state filters, explicit local proposal confirmation, validated local progress/resolution/reopen, terminal session observations, and version/parent-baseline evidence. No data migration is required.

Public production is a read-only verified release snapshot on Vercel. Local authorized Inbox/session writes remain on the Mac; cloud writes are refused and live continuation inspection is unavailable remotely. See docs/V0.2_PRODUCTION_HANDOFF.md.

Excluded: cloud sync, Gantt charts, KPI/time tracking, team workflows, calendar automation, enterprise permissions, database migrations, arbitrary shell execution, commit/push/deploy actions.

## Project lifecycle

`IDEA → DISCOVERY → SPEC → BUILD → TEST → DEPLOY → MAINTAIN`

Dashboard status is separate:

`Active | Paused | Idea | Planned | Completed`

## V0.2 release and continuation

See [V0.2 plan](docs/V0.2_PLAN.md) and [continuation package](docs/V0.2_CONTINUATION.md). Joey Acceptance is PASSED under the explicit 2026-10-05 production release instruction, superseding earlier pending gates. Historical Round 1/2 records remain historical. Exact publication/deployment and baseline evidence are recorded in the final output package; verify the live Git chain before continuing.

Inbox states are local workflow records. Resolving an item does not complete a canonical task. Recording a session as stopped/failed does not stop an AI process. Reopening an Inbox item invalidates its prior interpretation and confirmation.

## V0.3 acceptance candidate

Development branch: `codex/mission-control-v0.3`, based on accepted production V0.2
`2efd329c56d0eaae36ab78f5a820b778a6a10dbb`. Joey Acceptance is **PENDING**.
The V0.2 release module/package version retains baseline evidence; local health and
UI separately identify the V0.3 candidate. Production remains V0.2.

V0.3 adds one derived runtime schema, recorded Agent Activity and an authenticated
local mission ledger to the existing projection, with three-language detail UI.
It never creates a second Registry or executes agents/deployments.

`npm test`, `npm run validate`, `npm run check`, `npm run build` verify the candidate.
Build checks modules and runtime/activity schemas and packages static assets into
ignored `dist/public`; the local server uses `public` directly. No framework compiler
is needed and build does not refresh the accepted production snapshot.

Local preview: `npm run start -- --port 4314 --data-root /private/tmp/joey-mission-control-v03-acceptance`.
Use the printed process token only for local ledger/Inbox/session writes.
See [Agent entry](AGENT_CONTROL.md), [baseline verification](docs/V0.3_BASELINE_VERIFICATION.md),
and [candidate handoff](docs/V0.3_DEVELOPMENT_REPORT.md).

## V0.3 Joey View + Agent Control Layer extension

Joey View is now the default landing at `http://127.0.0.1:4314/#joey`.
`#dashboard` retains the engineering console as **Agent console**, with all existing
Inbox, Workspace, Handoff/evidence, runtime/activity and Continue interfaces.

Joey View presents source-backed current-purpose/stage/next-feature summaries,
explicitly pending original-intent/blueprint reconstruction, weighted blueprint progress,
and Joey-owned lifecycle choices. Expand **Project lifecycle board** for six lifecycle
columns and an unrecorded-choice tray. Use the status move controls; no drag library.
Purpose/blueprint/human-next edits create proposals and require explicit approval.
Completion claims require evidence and owner approval; project completion is independent
from blueprint percentage. Local owner records are separate from canonical Registry truth.

Source summaries are fingerprint-bound presentation metadata, not historical reconciliation.
No historical milestones or percentage estimates were invented. Local writes require the
existing process token; public snapshot controls remain read-only.
See [pre-acceptance report](docs/V0.3_JOEY_VIEW_PRE_ACCEPTANCE.md).

### V0.3 historical reconciliation acceptance candidate

Four registered projects now have fingerprint-bound, read-only historical capability maps and a scoped Joey cockpit. Unconfirmed scope/weights display no percentage; source drift withdraws reconstruction. Joey can add/remove/reorder milestones and revise weights through explicit owner proposals. Agent runtime and Evidence remain separate. See [Historical reconciliation pre-acceptance report](docs/V0.3_HISTORICAL_RECONCILIATION_PRE_ACCEPTANCE.md). No commit/push/deploy is authorized.

### V0.3-B project state candidate

Joey View now derives its panels from one `CanonicalProjectState`, persisted in the
existing local owner JSON store through `ProjectStateRepository`. Mission status,
Idea creation/conversion, real Decision resolution, explicit next action, lifecycle,
source provenance and factual confirmation controls share one revision and audit log.
Unknown/partial source data remains explicit; no automatic Agent or external sync occurs.
See [V0.3-B acceptance report](docs/V0.3-B_PROJECT_STATE_ACCEPTANCE_READY.md) and
[migration report](docs/V0.3-B_MIGRATION_REPORT.md). Preview: `http://127.0.0.1:4314/?visual=v03b-ready#joey`.

### V0.3-B release closeout

Joey authorized V0.3-B commit/push/production release on 2026-10-05 and explicitly
confirmed local-first operation: authenticated mutations and durable JSON history
remain local; Vercel serves a sanitized, immutable canonical-state snapshot.
Production writes stay disabled. Prior acceptance-candidate notes describe historical
checkpoints and are superseded by this release authorization.
