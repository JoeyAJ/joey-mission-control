# Joey Mission Control — current entry

Start with [HANDOFF.md](HANDOFF.md), then the current decision in [PRODUCT_CHARTER.md](docs/PRODUCT_CHARTER.md). These are the current handoff and product authority. [Phase plan](docs/MC_PHASE_PLAN.md) and [acceptance matrix](docs/MC_COMMAND_CENTER_ACCEPTANCE.md) qualify implementation, fixtures, real runtime and Joey acceptance separately.

Current private branch: `codex/mc-command-center-checkpoint-20261006`. The latest functional baseline `cd8f5c4590f10c7d2691b475f194c6fbe396d40f` is already remote and fixed Preview READY. [Release verification and approved visual-reference locators](docs/MC_RELEASE_VERIFICATION_20261009.md) is the canonical in-repository evidence entry. Later docs-only commits clarify this release; they do not create a new functional baseline or require republishing it. Production remains unchanged.

The current direction is source-backed project memory and one-click portable takeover. Real Owner four-project/candidate runtime reads and final visual/device/new-Agent acceptance remain pending. Independent changes stop at that evidence boundary.

## Preserved V0.2 / V0.3 release history

Everything below describes earlier releases. Old branch/version numbers, Mac-local check-in and cloud-sync exclusions are historical, not current continuation instructions. They do not override the current HANDOFF/PRODUCT_CHARTER or require Mac access before authorized cloud-repository work. Existing privacy and permission boundaries still apply.

> V0.3-E public-test release authorized 2026-10-06: shared liquid-glass UI and four-project navigation. Public Production stays read-only and excludes private Ideas/proposals/Asset classification; local registration and same-record editing remain on Joey Mac. Public testing approval is recorded separately from final Joey feedback. See docs/V0.3-E_RELEASE_CHECKPOINT.md; the pre-release acceptance report is historical.

> E public progress correction: JoeyAsset now shows the separately approved university child-case 0.4 summary. This manually curated public snapshot is separate from private Ideas and does not auto-sync local data. See docs/V0.3-E_PUBLIC_CASE_PROGRESS.md.

> V0.3-D accepted 2026-10-06: handoff-first five project readouts, last-confirmed stage Fleet navigation and any-Agent continuation guide. Parent accepted C 150adbf7263b572465f4645869edda7be76e0f11. See docs/V0.3-D_RELEASE_CHECKPOINT.md.

# Joey Mission Control

V0.3-C accepted 2026-10-06: source-backed Operations in Joey View.
Parent baseline `d8b3fdf4f786228a35a485fab39ba30d00084566`; Joey acceptance **PASSED**.
C commit/push/deploy explicitly authorized. Production remains read-only.
See [current release checkpoint](docs/V0.3-C_RELEASE_CHECKPOINT.md). Earlier acceptance reports remain historical evidence.

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

### Portable verification and public case QA

`npm test` now uses authored synthetic canonical documents, planned/registered Asset catalogs and four temporary Git repositories. No Joey workstation canonical files, owner records or sessions are needed. Fixtures clean up only their own temporary directory. Runtime defaults remain unchanged.

Run `npm run verify:portable` for the complete guarded test suite, build, schema validation and static safety check. The guard rejects workstation canonical/project/local-data reads and Git subprocess working directories; each process reports `PORTABILITY_GUARD forbiddenAttempts=0` on success. Direct `npm run validate` remains the local runtime inspection command; use the portable harness for isolated verification.

For actual-server browser QA, start `node --import ./tests/test-environment.mjs src/server.mjs --port 4352` with synthetic roots, and `npm run qa:public-case` for the saved public API adapter on port 4353. In one dedicated Playwright session run `tests/browser/actual-server-startup-flow.js`, then `tests/browser/public-case-flow.js`. Static modules and the UI come from the actual local server; the public phase substitutes saved API responses. Tests cover native local initialization, delayed health, first case-source failure/recovery, 1440/390/320 layouts, three languages, privacy and confirmed-refresh retention. Formal owner/session data is not read. Stop both QA servers and close the session afterward. See [portable verification handoff](docs/V0.3-E_PORTABLE_PUBLIC_CASE_HANDOFF.md).
