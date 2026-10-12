# Authorized new-project client connection — private review candidate

Project: MISSION_CONTROL
Timestamp: 2026-10-12T22:48:00.000Z
Status: LOCAL_END_TO_END_SYNTHETIC_VERIFIED_PRIVATE_REVIEW_PENDING
Canonical base: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Previous local checkpoint: ab310937f5ba2768b4a44244939715ff0aa9bc99
Review branch: codex/mc-owner-rework-handoff-20261012

## User-visible slice

The actual project picker accepts the current Owner-authenticated connection catalog. Explicitly authorized registered projects become selectable; registration-only and revoked projects are disabled. Existing fixed project choices remain. Selecting a new project mounts the same source/report transports and development-task form/controllers used for existing projects. Source, report, task RPC request/reply, requirements hashing, cloud reconciliation and project-specific Agent handoff carry the shared bounded scope. The first matching report is displayed against the saved task and immutable requirements digest. No Agent starts.

The default picker reads the catalog only after existing Owner verification; successful catalog reads refresh at 15 seconds. Denial/outage clears dynamic selections with no registration/catalog fallback. The catalog route has no deployed runtime composition yet, so the current deployed app gains no new access. A local injected server composition supplies it in QA. Browser scope authority validates metadata; private server/RPC authorization remains independent and required.

The new authenticated read-only catalog handler composes the shared server authorization model and checks Owner plus each grant again before return. Task storage server/RPC port accepts an optional trusted scope authority; the deployed factory stays unchanged and fixed-scope. There is no new public grant-writing RPC or ambient credential fallback.

## Evidence

- Actual picker + actual task form + task storage server + fixed RPC transport + SHA-verified source/report readers + actual handoff formatter pass at mobile width 390. Synthetic project/task/report and provider responses only. First report/task/requirements/repository bindings match. Registration-only disabled; revocation clears private state and returns to NexAeon. External requests and real execution: zero.
- 123 related unit tests pass, including legacy five-scope parity and all four existing source profiles, storage/review/rework/report behavior, grant/RPC scope mismatch, denial/expiry and revoked browser capability. Portability guard forbiddenAttempts=0.
- Build passes; generated Owner/reporter bundles included. Browser QA fixture export lists track the new public bundle export; no unrelated app styling or polish.
- Disposable PostgreSQL 16 apply/full task+review validator/ACL/scope/revocation/expiry/Owner-denial/rollback checks pass. Image digest: sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea. No network, exposed port or host directory mount; 256 MiB/one CPU. The session helper is a synthetic stand-in, not installed live Supabase authorization. SQL remains NOT APPLIED to Supabase.
- Reproduce local browser: node tests/browser/dynamic-project-connection-qa.mjs. SQL: node scripts/qa-dynamic-project-scopes-postgres.mjs (requires existing Docker/image; script performs no pull). All SQL/fixture inputs are included.
- Older four-project browser script is stale against current email-login/hidden source module UI and was not counted as passing. Its selector/layout repair is deferred. Current maintained UI regression passes four browser cases, with external requests/writes/cloud task writes all zero.

## Exact remaining activation work

1. Independently review this private guarded candidate, including the SQL contracts. Validate SQL against a disposable copy of the installed schema (source-body preconditions may reveal drift); authorize only the exact migration/rollback after that review. No grant rows are inserted by migration.
2. Implement the runtime grant/catalog adapter with authoritative revocation, compose the catalog and project-specific source/report/task routes with the trusted scope authority, and thread review/reconciliation RPC consumers before claiming the complete review/deployed-result lifecycle for new projects. These are remaining code/connection work, not solved by installing a token. No deployment factory currently enables a dynamic scope.
3. Complete the already-approved secure registry writer binding and one specifically named project's exact source/report/task grant. Use existing per-repository Agent authorization for report publication; confirm the server reader can access that exact private repository. Do not expand the MC-only writer token to other repositories implicitly.
4. One reviewed canonical integration/Preview release, then actual Owner + external Agent first-report acceptance and verified deployed-result/current-handoff acceptance. Production, autonomous dispatch/provision/merge/deploy and real task execution stay unchanged until their exact authorization.

The guarded private candidate is not a canonical release, live SQL installation, receiving-Agent acceptance or completion of MC. Previous checkpoint's "PostgreSQL unavailable/unexecuted" statement is historical; this slice supplies isolated SQL evidence only.
