# Mission Control — current Agent entry

Read the current stage of [HANDOFF.md](HANDOFF.md) first, then [PRODUCT_CHARTER.md](docs/PRODUCT_CHARTER.md), [phase plan](docs/MC_PHASE_PLAN.md) and [acceptance matrix](docs/MC_COMMAND_CENTER_ACCEPTANCE.md). HANDOFF and the current product decision govern continuation; prior stage instructions below are historical. Follow Joey's latest authorized scope and verify the actual repository HEAD without overwriting unrelated work.

Use the existing private branch `codex/mc-command-center-checkpoint-20261006`. Functional baseline `cd8f5c4590f10c7d2691b475f194c6fbe396d40f` is already remote / fixed Preview READY; see [release verification and reference index](docs/MC_RELEASE_VERIFICATION_20261009.md). A later docs-only HEAD updates handoff integrity, not application behavior. Do not republish the functional checkpoint, repeat a pilot or run unrelated full suites merely to start.

Keep source/runtime qualifications intact: unknown Agent/model stays unknown; deployment READY is not Owner runtime or final acceptance. Stop independent modifications while normal Owner four-project/candidate source reads, actual device/new-Agent takeover and Joey visual acceptance remain pending. This entry grants no new access, SQL, credentials, model, infrastructure or Production authority.

## Preserved V0.3 Agent protocol — historical

The old V0.3 branch, loopback Mac mission check-in/out and former cloud-sync exclusions below describe that release's operating model. They are not prerequisites for this saved-cloud continuation and do not supersede the current entry. Do not use them to collect a token, access Joey's Mac or repeat an old workflow.

# Mission Control V0.3 agent entry

This checkout develops V0.3 from accepted V0.3-B SHA
`d8b3fdf4f786228a35a485fab39ba30d00084566` on `codex/mission-control-v0.3`.
Joey accepted V0.3-C on 2026-10-06 and authorized its release. Later stages require their own acceptance.

## Discover and inspect
GET /api/projects lists normalized project manifests. GET /api/projects/:id/manifest
and /state return the same normalized view, with private local mission history on Mac.
GET /api/projects/:id retains the V0.2 projection for compatibility.
Public deployment adapter supports the normalized equivalents, using the release snapshot;
it cannot inspect Mac, publish local missions, or authorize execution.

Canonical source: GitHub repository, canonical branch, Registry recorded baseline,
production URL and source-backed Handoff. Execution workspace: a Mac location and a
local Git observation. Observed HEAD never replaces the canonical baseline.
Mission Control and individual chat histories do not own canonical project truth.

Read latest Handoff referenced by local manifest, Registry, CURRENT_STATE and NEXT_ACTIONS.
Public path references are private; request authorized access to the canonical handoff
through the project repository/owner when unavailable. Never continue without it.
Fields carry provenance. Null means no verified source, not permission or success.
A source task without a registered mission is UNREGISTERED; no current task is
NOT_ESTABLISHED. Agent history is only source-recorded, never inferred from commits.

## Check in
1. Select project; read manifest and latest Handoff.
2. Verify origin, branch and exact baseline SHA against canonical records.
3. Inspect workspace HEAD/status/upstream and source fingerprints; preserve pending edits.
4. Check permission classes and Joey authorization for the concrete action.
5. On loopback Mac, with the existing local write token, POST /api/missions using
   project_id, task, assigned_agent, model, baseline_sha and optional next_action.
6. PATCH /api/missions/:id with expected_revision and status READY, then RUNNING
   with check_in: {verified:true}. This is an agent attestation, not automated Git
   verification or authority. Only attest after steps 1–4; the V0.2 continue inspection
   remains the separate fail-closed live safety check.
7. Only then modify the authorized workspace.

## Check out
Run required tests. PATCH with expected_revision, COMPLETED, result, tests (string array),
resulting_commit (exact SHA if created), blockers, next_action and approval state.
Record relevant handoff changes as a reviewable proposal. Local mission records do not
promote into canonical Memory/Registry. Joey must explicitly authorize that promotion.
ACCEPTED requires approval.joey_accepted=true attesting Joey's actual acceptance; then CLOSED.
Transitions keep revision and event history; duplicate open missions and stale writes fail.
GET /api/missions reads the local durable ledger. The local token controls ledger writes,
not repository/deploy/canonical authority. Never upload the token or ledger to production.

## Permission boundary
READ_ONLY is public allowed. LOCAL_WRITE, REPO_WRITE, DEPLOY, CANONICAL_STATE_WRITE and
DESTRUCTIVE require explicit applicable Joey authorization. A classification or mission
status does not execute anything or grant permission. No public write API, remote shell,
automatic push/deploy, cross-project execution or frontend reusable credentials exist.
Do not expose secrets or private environment/machine configuration. Do not invent
historical Agent/model, treat local paths as canonical source, or rewrite accepted baselines.

## Source resolution
Explicit canonical claim -> Registry -> validated current Handoff/Continuation -> repository
metadata -> verified deployment -> local observation -> null. Existing V0.2 adapters
read Memory, Registry and Handoffs and retain their evidence. The normalized resolver
accepts ordered claim candidates; only verified records belong in that list. The
implementation currently normalizes the source-backed V0.2 projection; it does not
crawl GitHub documentation or invent missing canonical baselines from observed HEAD.
Local mission state is a separate operational overlay, never an implicit canonical claim.

## Stable V0.3 runtime and activity interface

- GET `/api/projects`: discovery manifests with the same runtime/activity as detail.
- GET `/api/projects/:id/runtime`: `schemas/project-runtime.schema.json`.
- GET `/api/projects/:id/activity`: array of `schemas/agent-activity.schema.json` records.
- GET `/api/projects/:id/manifest` (or `/state`): both plus canonical/workspace evidence.
- POST `/api/missions`, PATCH `/api/missions/:id`: durable local record updates;
  protected by the existing loopback Host and local write token boundary.

Runtime uses camelCase fields (projectId/currentMission/missionStatus/currentAgent/
lastAgent/currentModel/lastModel/lastCompletedAction/lastCompletedAt/nextAction/
blocker/approvalRequired/approvalStatus/handoffRef/sourceRepo/sourceBranch/baselineSha/
productionUrl/localWorkspace/lastSyncedAt/stateSource). `fields` carries provenance,
missing state and reason. Null fields never mean approval or verified completion.
States: Active, Not recorded, Awaiting sync, Awaiting Joey approval, Blocked, Completed.
Approved/rejected/blocked approval records use the five explicit approval statuses.
Canonical prohibitions are separately retained as restrictions; incomplete decision
candidates do not become actionable pending requests. All existing Continue gates remain.

Writes require expected_revision. Approval patch: {required:boolean,
status: NO_APPROVAL_REQUIRED | AWAITING_JOEY_APPROVAL | APPROVED | REJECTED | BLOCKED,
joey_accepted?:boolean}; string truthiness is rejected. `required` remains true for
pending, rejected or blocked requests. ACCEPTED needs actual Joey acceptance attested
with joey_accepted=true. This is a local attestation, not authenticated Joey identity.
Optional handoff_ref is a recorded reference, never an arbitrary file-read request.

A planned assignment is not historical execution; only an explicit completed result supplies
last Agent/model. Canonical activity backfill uses validated entity Handoffs with
explicit Agent/model only, preserving timestamps, commit/reference and source.
Missing Agent/model stays null. Public runtime/activity omit private paths and use
release snapshot time, never the local private ledger. Public writes always refuse.

## Joey View / product-owner boundary (V0.3 extension)

The same canonical project identity now exposes `product` alongside `runtime` and
`activity` in /api/projects and /manifest. GET /api/projects/:id/product reads purpose,
blueprint, weighted progress, lifecycle choice, human next feature and evidence.
Technical next action remains independent in runtime/technicalNextAction.

Private `product-owner.v03.json` contains only Joey choices, proposals and decision
history keyed to existing Registry IDs; it is not a second Registry or canonical
source replacement. Approved purpose and blueprint revisions remain durable; canonical
files and managed product code are never changed by these endpoints.

POST /api/projects/:id/owner-proposals:
{type: PURPOSE | BLUEPRINT | HUMAN_NEXT_STEP | BOOTSTRAP, value, reason}.
This never applies the proposal. Agents may propose changes, not silently rewrite
original intent or decide whole-project completion/archive.

POST /api/projects/:id/owner-decisions:
{actor:"joey", confirmation:projectId, explicitDecision:"JOEY_APPROVES",
 expectedRevision, lifecycle OR proposalId}.
Loopback + the existing local write token, exact explicit attestation, revision check,
and recorded decision are mandatory. Agent actor/direct property patches are refused.
Joey View uses explicit move/approve buttons and completion/archive confirmation.
This retains the existing local attestation model; it is not an identity-backed Joey
login. Any authorized writer must attest only to an actual Joey decision.

Blueprint completion requires item-matched VERIFIED evidence with reference/time,
plus Joey approval of the blueprint proposal. Verification status is supplied evidence
reviewed by Joey, not an automatic GitHub/test/deployment probe. Public writes refuse.
Optional/deferred milestones/features are outside the progress denominator. In-progress
and awaiting-acceptance features get no guessed completion credit. Milestone and feature
weights are independent; lifecycle COMPLETED never changes blueprint progress.

Original intent, original project creation date and historical blueprint remain missing
until reconstructed/approved. Purpose.createdAt is the purpose-record creation time,
not a fabricated original project founding date. Reviewed current-purpose/stage/next
summaries require matching source fingerprints; mismatch falls back to pending.

Future bootstrap contract: Idea -> purpose/outcome/success -> initial blueprint ->
repository rule + registry/memory + Handoff + deployment decision -> Mission #001.
Ideas need no infrastructure. An Idea entering formal development must pass readiness;
mission registration checks that gate for Idea-origin records. Existing Registry projects
keep their established mission interfaces during historical reconstruction. This change
does not implement repository creation, deployments or autonomous project bootstrapping.
