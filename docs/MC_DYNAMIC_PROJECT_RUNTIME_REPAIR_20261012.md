# Coherent dynamic-project runtime and independent HOLD repair

Project: MISSION_CONTROL
Timestamp: 2026-10-12T23:30:37.000Z
Status: LOCAL_SYNTHETIC_VERIFIED_REVIEW_REQUIRED_NOT_ACTIVATED
Canonical baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
HOLD candidate: 0e60883249dc1fa76014be79ca82e7b1789051a6
Local branch: codex/mc-dynamic-project-scope-local-20261012
Private review destination: codex/mc-owner-rework-handoff-20261012

## Correction of earlier evidence

The prior fixture mounted the real picker/task components but called ui.update directly. It did not prove public/app.js accepted a dynamic project route. Its Docker migration run was superuser-led and did not establish the recorded restricted ownership protocol. Those claims are superseded here; do not count them as current router or migration acceptance.

## Four finite repair groups

1. **Actual routing and mounting.** public/app.js shares the authenticated connection client with the picker and the real readContext/contextHash resolver. Only currently selectable private IDs may round-trip through the simple project route. Registration-only, absent and revoked IDs cannot become private source scopes. Same project/config binding reuses the mounted dynamic task form across locale/state updates. Unsupported advanced workspace actions stay unavailable for new projects; the existing five choices/paths are preserved.
2. **Catalog freshness.** Each refresh has a request epoch; clear/denial invalidates pending completions and a newer request supersedes an older one. Stale replies cannot refill cleared private rows or revoke a newer result. Grant revision/approval/registration digest are part of the browser source binding. Server catalog checks current Owner and grant again before return.
3. **Global task-list isolation.** The trusted boundary validates structural/privacy limits and global size/duplicate constraints for all returned tasks before scope filtering. Legacy clients receive only legacy tasks; each new-project client/server/port gets only its exact selected project. No second dynamic project's validator failure breaks the first. Request scope is checked independently of task ID. Native global physical counts and CAS are unchanged, including revoked projects' stored history.
4. **Database authorization and restricted ownership.** CHECK validators stay structural and IMMUTABLE. Public native list RPCs filter unauthorized/revoked scopes; review list also denies a revoked task scope. Writes use grant-aware WITH CHECK and explicit fresh Owner/grant validation after advisory/row locks and immediately before mutation. The predicate is VOLATILE and uses clock_timestamp(), avoiding statement-time expiry across waits. Existing internal exact-Owner SELECT policy remains for capacity/CAS; authenticated/anon/service_role gain no table access. The grant table has no public writer; only the existing administrative postgres role may provision reviewed grant records. No grant rows are inserted by migration.

The apply/rollback protocol verifies existing restricted owners and function source bodies, records exact definitions/ACL/volatility and policy checks, temporarily enables only the recorded executor SET/CREATE path, then restores SET/INHERIT/CREATE boundaries. Rollback runs as the owning restricted role for its functions/policies, refuses dynamic history without an explicit recovery plan, and never deletes task/review data. Existing verified Owner context is required for a history inspection when rows exist; RLS is never disabled. Test fixture data cleanup is outside the migration and only inside the disposable database.

## Runtime and review wiring

The new route dispatcher composes the same source/report/task/reconciliation/review services. Authorization occurs before any private catalog/repository read. Combined native read ports return current live Owner/session and per-project grant; the server compares the grant to the private registry's immutable numeric repository ID/ref/registration digest. Every private operation gets fresh authorization; writes are independently checked by native SQL at the write boundary. The factories use only the existing explicit MC_GITHUB_READ_TOKEN and caller JWT paths, without ambient token fallback.

The review/reconciliation contracts, browser clients/controllers and server/RPC ports carry the trusted optional scope authority. Reconciliation ties completed report/code/work head/canonical head and requirements to bounded PR/test metadata. Owner request-changes and approval remain dated records, not execution grants. Rework preserves the task ID/request fields and creates the next revision through existing explicit save. Final handoff rereads native review history and includes only a record matching the exact current task requirements, source head, report head/blob/sequence, work ref and code SHA; historical decisions stay historical. Automatic Agent, merge, deploy and productAccepted remain OFF/false.

`projectRuntimeActivation.enabled` is FALSE in source. Neither environment/browser data nor registration can enable it. The public route dispatcher is connected but its deployed factory returns a closed response without reading credentials or opening providers. Existing scopes still use their original factories. No live database or runtime binding was activated.

## Reproducible evidence

- `node tests/browser/dynamic-project-runtime-qa.mjs`: actual public/app.js/router and official SDK against localhost synthetic auth/providers; one fixed + two authorized dynamic tasks; save, completed report/PR/tests, request changes rev1, explicit rework/save rev2, exact-revision approval, current-review final handoff, same mounted locale update, registration-only denial and revocation purge. Old reports remain in the fixture history. External requests and real task/Agent execution: zero. Receipt: docs/qa/DYNAMIC_PROJECT_RUNTIME_RESULT_20261012.json.
- Related unit regression covers project runtime, race fencing, multi-project lists, tasks/storage/cloud/review/rework/reconciliation and all existing source/report scope profiles. 156 related tests pass; portability guard forbiddenAttempts=0. The existing full suite passed 1108/1109 before the root document status enum was corrected; all 19 root-reader tests then passed. The final runtime authorization boundary/review/reconciliation subset passes 38/38. Build passes.
- Maintained existing UI QA passes four cases, external requests/writes/cloud writes zero. The outdated four-project UI harness is not counted and was not polished.
- `node scripts/qa-dynamic-project-scopes-postgres.mjs`: isolated PostgreSQL16, no network/ports/host mounts, 256MiB/one CPU. Fixture initializer builds the recorded baseline; apply and rollback actually use NON-SUPERUSER postgres, NOBYPASSRLS, ADMIN membership with SET/INHERIT false initially/finally. Native public RPCs exercise three projects, review binding, revoked read denial, immutable CHECK independent of grants, Owner-global 12-task capacity/CAS, and a writer starting before expiry then waiting past expiry on the existing Owner advisory lock and being rejected. Rollback protects dynamic history and restores exact owners/ACL/volatility/role/schema permissions. Session/auth helpers are synthetic stand-ins, so this is not installed-schema/live-Owner proof.

## Exact SQL contracts — unexecuted on Supabase

Apply: dynamic-project-scopes.pending.sql, then dynamic-project-runtime-authorization.pending.sql under docs/contracts/sql. Rollback: runtime-authorization.rollback.sql first, then dynamic-project-scopes.rollback.sql. All are REVIEW ONLY and require exact approval. Source-body/owner/membership preconditions intentionally stop on installed drift. No Supabase migration, ACL/grant insertion, credentials or real repository/task work occurred.

## Review and activation boundary

Review this coherent candidate once. Verify exact installed schema/preconditions and approve the named SQL/rollback; provision only one explicitly named project's grant/read/report scope; complete the separately approved secure MC registry writer binding; flip the reviewed source activation only after those checks. Then one canonical integration/Preview release, actual served-page/Owner/receiving-Agent acceptance and real first-report/deployed-result/current-handoff verification. Morning credential setup is a connection dependency, not a reason to stop local code.

**Review deployment guard must never enter canonical.** Build the eventual canonical tree from the exact canonical base, selecting reviewed source changes while retaining canonical vercel.json. Do not merge review guard commits/ancestry blindly. Production stays at its prior release; canonical e1a5c88 and its fixed rework Preview are unchanged by this review publication. Eleven current reports/history and the real saved-only task remain untouched.
