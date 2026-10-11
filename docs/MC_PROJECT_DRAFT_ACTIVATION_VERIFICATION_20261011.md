# Owner cloud draft activation and eight-step acceptance gaps

Updated: 2026-10-11T07:24:53.673Z

## Approved and applied milestone

Joey explicitly approved the bounded install at 2026-10-11T07:05:55Z, then requested speed at 07:06:11Z. This supersedes the earlier dormant checkpoint only for the exact reviewed proposal SHA256 `1dc75176ef7e837dd4364aacbb82db93c25118861806553a5a2d1aa850185433`, existing Supabase `scmvedfqwlhkyvljymjj`, new private draft table, two private helpers and two public Owner list/save RPCs. The original reviewed SQL bytes remain unchanged. Existing credentials/Auth/membership are reused; no new persistent role access or existing ledger change was required.

Exact SQL installed successfully. Before/after checks found identical contents of all eight existing MC tables, definitions/ACLs of sixteen existing functions and both existing postgres→executor membership records. Temporary schema CREATE and role SET capabilities were restored. New table is executor-owned with forced RLS; private helpers have no PUBLIC/anon/authenticated/service-role EXECUTE; authenticated EXECUTE exists only on the new list/save RPCs, each gated by existing exact Owner/AAL2/current Auth metadata/membership before and after work. Table direct access is denied to all three client roles.

Native isolated official PostgreSQL 17.11: thirteen check groups PASS, including observed database lock across two native connections, distinct-payload CAS conflict, exact retry single stored row, concurrent 12/13 capacity, all 21 URL fixtures plus seven Unicode/UTF16/UTF8/ref/repo cases. Docker had network none, no ports/host mounts, tmpfs data; task container and test data were removed afterward. Live rollback-only checks PASS against the installed functions with existing valid Owner/AAL2 session metadata, all 28 parity cases, save/list/readback/CAS/retry/denials/capacity. No Auth mutation or token read; zero retained test drafts; existing data/helpers/grants unchanged after rollback. PostgREST schema reload notification sent.

**Live check qualification: SQL_ADMIN_EMULATED_CLAIMS_WITH_EXISTING_SESSION_METADATA.** SQL context was emulated by the existing SQL admin; this does not prove a real signed Owner JWT/HTTP/browser call. Native session fixtures are synthetic. These limitations remain explicit in the receipts, and served Owner/device acceptance is pending.

Server-only activation is now ON after the approved install and these gates; client/env/imported flags cannot activate it. Cloud controls appear only after the same current Owner session and a successful private capability/list probe. Save and fresh readback/reload are available through the existing API; failure keeps private session/download/import fallback. Fixed Preview publication/identity evidence follows in HANDOFF and the delivery receipt. Production is unchanged.

Reproduced dirty-refresh defect fixed: local changes followed by refresh of an unchanged remote baseline previously showed an unnecessary conflict. Fresh comparison now preserves those local edits, leaves them explicitly unsaved and permits a CAS save. An actually changed remote baseline still requires explicit conflict resolution. Unit and actual-app synthetic browser regressions cover both cases.

Evidence: [native receipt](contracts/repository-reporting/receipts/project-draft-postgres-20261011.native.json), [live install/check receipt](contracts/repository-reporting/receipts/project-draft-postgres-20261011.live.json), [canonical reviewed SQL](contracts/sql/private-project-drafts.pending.sql). Reproducible checks: `scripts/verify-project-drafts-isolated-postgres.mjs` and `scripts/build-project-draft-live-verification.mjs`. The latter generates a ROLLBACK-only test, keeps existing session IDs inside SQL and emits no credentials.

## What the eight-step use case currently supports

Cloud draft storage is a project-idea milestone. It does not create a durable execution task, register a new source, start an Agent, observe a PR, approve it, merge it or deploy it.

| Step | Current code/evidence | Remaining functional gap |
|---|---|---|
| 1. Select an existing project | Implemented; fresh private `remote-handoff-server.mjs`, source-bound route/track and existing Owner QA | Real clipboard/iPhone one-tap acceptance remains pending |
| 2. Enter a natural-language task in MC | New-project PRD draft and bootstrap implemented; existing task workbench reads reported tasks | Existing-project task authoring, durable task ID/spec/acceptance, queued state and followup binding are missing; a cloud project draft is not that task |
| 3. Hand to NexAeon/Codex/Claude | Source-bound copy/manual instruction and portable `report-repository-run.mjs` usable by an already authorized external Agent | A direct in-MC executor is absent and outside this approval; smallest route keeps the explicit external handoff |
| 4. Agent develops | Actual external Codex/Claude MC/Asset report evidence exists; signed report identity is distinguished from unsigned documents | MC does not execute or watch every external Agent; recipient must follow the task and existing access scope |
| 5. Tests and GitHub PR | Agents can run tests and report results; strict run result includes tests and source SHA | No automatic PR creation/binding/CI status review in MC; PR number/head/checks/reviews need a fixed-repo read adapter and schema |
| 6. Auto-sync task/Agent/PR/tests/handoff | Source/run metadata read every ~30s while visible; guarded report branches, run activity and fresh takeover implemented | Sync depends on Agent reports; no universal tool stream or full PR/CI sync. Existing reporting budgets/scopes remain bounded |
| 7. Owner approves or requests changes in Dashboard | Historical coordinator decision code exists for bound coordinator receipts (`executionAuthorized:false`); current repository delivery view explicitly keeps Joey acceptance PENDING | No current repository-run/PR-specific actionable acceptance or request-changes flow; existing coordinator decision does not authorize a merge |
| 8. Approved merge/deploy/final handoff | Delivery evidence records code/tests/READY/served/data/current handoff separately; actual MC writer can close its authorized branch/Preview | No automatic exact-PR-head merge/approved deployment/closure pipeline. READY and Agent completed do not establish acceptance |

Code anchors: `api/index.mjs`, `public/task-workflow-config.js`, `src/onboarding/project-onboarding-client.mjs`, `src/continuity/remote-handoff-transport-view.mjs`, `src/reporting/repository-run-view.mjs`, `src/reporting/delivery-evidence.mjs`, `src/continuity/owner-coordinator-decisions.mjs`. The API's active Preview routes are private handoff/report/project-entry/onboarding/drafts; historical public snapshot continues to fail closed for writes. Direct dispatch, model selection and AWS remain excluded.

## Smallest useful next route

1. Add an existing-project task form with full task/acceptance, immutable task ID and source/track binding; reuse the verified entry and external-copy handoff. Extend only explicitly approved task persistence/report scope, rather than another runtime.
2. Have the receiving Agent use the existing reporter for start/progress/test/PR-head/final receipts. Add bounded read-only GitHub PR/CI synchronization for the explicitly named repo/ref/PR; refuse stale or changed head.
3. Add Owner accept/request-changes tied to that exact task/run/PR head, with durable acknowledgement and freshness checks. Keep merge/deploy authority separate until the named operations are explicitly approved.
4. Within that later approved scope, let the receiving Agent perform the exact merge/target deploy, then report fresh provider identity, served functional result, migration state and current handoff. MC independently reads/verifies each receipt and preserves incomplete gates.

Planning estimate for this bounded route: 2–4 working days for task/report/PR/decision/closure code and necessary integration checks after exact named access and operation approval; an initial task-to-external-Agent path is roughly 4–8 focused hours. Actual requested product development, PR review wait and unavailable provider/Owner-device access are excluded. These are estimates, not an existing completion claim or authorization to begin those operations. Full direct dispatch would be separate and is unnecessary for the current requested takeover route.
