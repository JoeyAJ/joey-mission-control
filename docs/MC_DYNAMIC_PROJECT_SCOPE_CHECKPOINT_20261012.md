# Minimal dynamic project connection — local checkpoint

Project: MISSION_CONTROL
Timestamp: 2026-10-12T22:33:28.000Z
Status: LOCAL_TESTED_NOT_PUBLISHED_NOT_ACTIVATED
Canonical base: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Local equivalent base: b1aec83acc2ea18faa03029eaa8ba0ad8c725303

## Delivered slice

`createAuthorizedProjectConnections()` consumes a trusted, validated private registration catalog projection, a separate explicit per-project grant projection, the existing live Owner verifier, and a private numeric repository identity verifier. It has no deployed factory, route, credential discovery, external writer or executor. `selectable()` and `select()` provide selectable local connections; they do not modify the deployed picker.

One grant document binds Owner subject, project ID, immutable repository numeric ID, repository name/ref, registration request digest, approval reference, monotonic grant revision, expiry/revocation and five required capabilities: sourceRead, reportRead, reportWrite, task and review. Registration alone enables none. All five are required for this deliberately bounded complete connection; partial grants remain unselectable. Existing project IDs and their reserved repository numeric IDs cannot be shadowed.

The connection reuses existing source/report readers and task/review contracts through an optional process-local scope authority. Default legacy callers retain their existing fixed project behavior. An authority is opaque, cannot survive JSON serialization and is accepted only as a trusted composition option, never from a request or registration field. The capability factory is not a standalone authentication mechanism; deployable handlers must retain the existing request/origin/token checks.

Every connection operation verifies current Owner/AAL2/live session, private repository numeric identity and the exact live grant binding, and checks Owner/grant again before returning private data. A revoked/expired/revised grant or repository replacement invalidates a retained connection. The synchronous `currentGrant` adapter must provide a current authoritative projection with immediate invalidation; a stale cache is not a conforming runtime adapter. Such a runtime adapter is NOT implemented or activated in this checkpoint.

Source reads remain bounded to HANDOFF.md and the registered profile's four fixed context paths. Reports remain on mc/progress and existing bounded directories. Report and review validation binds project/repository/ref plus task ID and exact requirements digest. Local task creation/revision and requirements hashing use the same scope authority. `cloudPersistenceReady:false` and `executionAuthorized:false` remain explicit.

## Verification

- 10 new behavior tests pass, including registration-only denial, all explicit capabilities, task/report/review binding, real synthetic Git-byte source/report consumption, revoked/expired grant and Owner loss, repository replacement, JSON authority forgery, legacy behavior and grant-port failure propagation.
- 121 affected-scope tests pass across development tasks, task requirements/cloud/review/rework, project entry source and repository reports. Portability guard: forbiddenAttempts=0.
- Build passes. Generated browser/reporter artifacts are included; new server composition is not routed or enabled.
- No actual Owner, receiving Agent, repository creation, task execution, private source writes, cloud RPC persistence, database migration or deployed acceptance was performed.

## SQL review package — not applied

`docs/contracts/sql/dynamic-project-scopes.pending.sql` and its rollback are exact review contracts for target scmvedfqwlhkyvljymjj. They create an empty private explicit-grant table and a SECURITY INVOKER predicate, retaining existing Owner/AAL2/live-session verification and existing fixed project behavior. No public grant-writing RPC or INSERT/UPDATE/DELETE grant is introduced; zero project grants are inserted. Only the restricted existing executor receives SELECT and predicate EXECUTE. The two task/review validators gain the predicate and STABLE volatility; original definitions/ownership/ACL are captured. Exact source-body preconditions fail closed if the installed validators differ from the repository baselines. No other SQL scope or public RPC is widened.

Rollback restores exact captured validator definitions and checks ownership/ACL/volatility. It refuses if dynamic task rows require a recovery decision; it never deletes task/review/report rows or uses CASCADE.

No Supabase CLI or PostgreSQL executable is installed in this environment. These SQL contracts are unexecuted and not a CLI-generated migration. Isolated PostgreSQL validation and independent review remain required; do not apply merely because JavaScript tests pass.

## Next bounded dependency

Implement the runtime authorization grant port and connect this selection to the existing private picker/source/report/task/review transports, explicitly threading the scope through remaining RPC reply/reconciliation/handoff consumers. The old deployed consumers remain fixed-scope and reject new IDs. Review/test the SQL contracts against an isolated installed-schema baseline before requesting an exact migration approval. Then activate only one specifically named authorized private project and verify its first real external-Agent report. Registry writer binding is separately pending. This checkpoint alone does not complete the new-project workflow.

No canonical push, Vercel release, Library transfer or live setup occurred. Nonblocking polish remains frozen.
