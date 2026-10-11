# Fixture effect authorization and own-operation recovery repair — 2026-10-11

Baseline625ff30ff466d1f81eb2091eb3ea5a8f9b96641b. Reviewer found two activation blockers in the isolated finalization core. They were not live incidents: createDeploymentTaskFinalization is still hard-disabled, no execution endpoint/button/credential exists, and every effect here is synthetic. Passwordless dashboard readiness remains a separate wait; the prepared OTP switch stays false.

## Actual defects and bounded correction

The workflow checked an action grant, awaited its final preflight and guarded Owner read, then called an asynchronous provider. Grant expiry/revocation in those waits was not checked at mutation. Four actual-source baseline probes executed one fixture merge/deploy despite expiry/revocation during final preflight. Merely moving the async authorization lookup does not cover the provider's own wait.

The fixture provider now finishes transport awaits before invoking a one-shot synchronous commitEffect boundary. Inside that callback, the adapter rereads the trusted authority for the exact authorization ID/action/intent digest, validates both the captured grant and current authority against current provider time, exact Owner, expiry and qualification, and compares the complete actual mutation payload with its captured tuple/target. The full intent digest binds operation/review/task/report/code/PR/ref/deployment. No await exists between this gate and the fixture's conditional mutation. An async authority reader or async mutation callback is rejected; reuse is rejected even if a first denial is caught. Declared effectAuthorizationBoundary and trustedOperationCorrelation capabilities are mandatory. No grant is implicitly renewed from new current time.

Only adapter-created, identity-tracked known-not-started failures permit the workflow to CAS-clear its attempted flag, under the unchanged fresh Owner/generation gates. An arbitrary provider property/code cannot forge that proof. An unknown result, transport exception or lost acknowledgement retains the attempted flag; provider facts must be looked up and no blind resubmission occurs. CAS/Owner failure while clearing remains conservative. Genuine own effects with lost acknowledgements still recover once, without duplicate merge/deploy.

Previously, mergeAttempted plus a generic matching PR/head/base observation was treated as this operation's merge. A revoked grant could leave a marker with zero own merges, another actor could complete that exact PR, and restart would proceed to separately authorized deployment. Recovery now requires exact operationId and intentDigest in the merge observation plus an independent provider-owned operation ledger record matching the entire receipt. The fixture ledger is written synchronously with its actual merge mutation and survives workflow reconstruction; merely echoed metadata is insufficient. Missing/foreign/unproved correlation returns UNATTRIBUTED_MERGE_REQUIRES_EXPLICIT_ADOPTION before checkpoint adoption or deployment. Direct provider deployment also verifies the independent own-merge record. Attempt markers and matching commit tuples are not provenance.

No external-merge adoption authorization/action is implemented or inferred. That distinct blocked state must remain until a separately reviewed explicit adoption policy is implemented and granted. No acceptance promotion, source/track retargeting or extra route is introduced.

## Deterministic evidence

New11 grouped boundary tests plus existing22 finalization groups PASS. The baseline RED run failed7/8 groups; four preflight expire/revoke probes and provider-pause cases show the old mutation gap, and the attempt/external-merge probe shows false adoption. The echoed-field baseline failure also includes the new distinct diagnostic requirement, not a claim that every old forged field shape was accepted.

Merge/deploy tests cover expiry/revocation during final preflight and after the provider's own await, unchanged valid execution, explicit fresh-authority retry after proved nonexecution, uncertain/invisible outcomes and lost acknowledgements with no duplicates. Further cases cover changed authority ID/Owner/digest, altered actual head/Preview target, absent capabilities, async reader/body, one-shot gate reuse and spoofed retry classification. A matching external merge and a forged matching operation tag both refuse adoption/deploy; genuine operation correlation recovers. Focused88 PASS. Final portable/build/root checks and receipts follow.

## Exact remaining live prerequisites

This synchronous callback guarantee applies to the reviewed, trusted, single-process fixture mutation code. It is not a sandbox for arbitrary supplied transports and cannot be claimed for a generic asynchronous HTTP merge/deploy call. Live use still requires a trusted server action-authorization lifecycle with durable revocation/expiry and exact tuple/target binding, enforcement at the provider's actual mutation acceptance boundary, and verified atomic conditional head/base/CI protection. A client snapshot or an authorization read before another network await is insufficient.

Also missing: protected durable CAS journal and proof of known nonexecution; authenticated provider composition with effective existing permissions and fixed MC identity; trustworthy durable writer/provider operation correlation independent of observed PR/head/base or echoed operation ID; complete unknown-outcome lookup/recovery; and normal alias/served verification. Generic GitHub merged metadata or matching merge SHA does not supply that operation correlation. A future external-merge adoption flow would require its own explicit authorization and review. Live prerequisites are implementation/connection gaps, not something Owner testing alone supplies.

Supported future target remains JoeyAJ/joey-mission-control, codex/mc-command-center-checkpoint-20261006, Preview only in team_zpwdbE1o53BqrXSXxPfcKxKV / prj_X67htPw7vkRI2tuf8817vOUCGQOD. MERGE_PR and DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW remain separate grants. No new permission/key/repo, real merge/deploy, Production, SQL/RLS/Auth/mail/settings/dispatch/model selector/AWS action occurred. Navigation/mobile/inactive OTP, protected source/privacy/currentness/preflight/API boundaries and original dated handoff history are retained. Historical MC_FINALIZATION_CORE_20261011.md describes the prior increment; this document records the corrected boundary.

## Verification closure

Portable956/focused88/finalization33/build/portable validation/static safety PASS; forbiddenAttempts0. The client bundle, navigation/mobile/inactive OTP, source/privacy/preflight/reporting, API, SQL and historical production snapshot remain byte-identical to625ff30. No browser repaint test is implied: this repair changes only unreachable fixture backend contracts and tests. [QA receipt](qa/mc-finalization-boundary-20261011/verification.json). Final current-root and fixed Preview evidence follow.

## Previous root prefix (exact bytes)

```text
# Current Owner email OTP preparation — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T23:06:24.079Z
Task: Same-page existing Owner OTP; readiness disabled
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 45cebef30f958934674619fc7e90b25324579d99

Priority navigation/task feedback45cebef fixed Preview dpl_3kGhMssHDph5WvTAnxmCwnubYHNo READY. OTP code prepared with shouldCreateUser:false, exact Owner, scoped transient challenge/currentness; existing password/TOTP/AAL2/live-session/member gates retained. Deployed switch OFF, no mail/settings change or extra credential storage.

Evidence: docs/MC_OWNER_EMAIL_OTP_20261011.md; portable945/focused47/build/validate/check, OTP browser21/password5/mobile entry3 PASS. Current settings GET200: email ON, signup/anonymous OFF. Auth-management template/plan/SMTP read unavailable; project created2026-10-07 may face June3 template restriction. Single pending body proposal is reviewable. Runtimec97a250 exact fixed Preview dpl_6bDyUTJTEduX2F47XsSGRpLX77Jq READY; root20 PASS, core preserved/live disabled, actual Owner writes0.

Next Action: finish final docs exact Preview/report. Then fresh nonsecret GET /v1/projects/scmvedfqwlhkyvljymjj/config/auth through existing authorized connection; verify template/OTP length/plan/mail readiness. Exact approval needed only for actual body/settings change; no mail before qualified flow. No password deletion/signup/SMTP/redirect/SQL/grants/new keys/Production/dispatch/AWS. CONNECT403 not bypassed; served/Owner acceptance pending.

```

## Verified runtime publication

Runtime8408e1d67646f8dc1d770c29f2a12df46bbfb362 exact canonical remote and fixed Preview dpl_5aEd3G72Zs3qGFeK7sKMfhgTFYsj READY; connected alias and independent ID match, original Production identity unchanged. Root20 PASS, dated history and all protected client/source/API/SQL boundaries retained. [Runtime receipt](qa/mc-finalization-boundary-20261011/runtime-publication.json). Ordinary cloud HTTPS CONNECT403/HTTP000 before application, servedCheckedSha=null; no bypass or claim of Owner acceptance. Final documentation HEAD is independently deployed/verified before terminal; exact final metadata/report immutability evidence is in the private final receipt. Live execution and OTP still OFF; no real workflow actions or mail/settings changes.
