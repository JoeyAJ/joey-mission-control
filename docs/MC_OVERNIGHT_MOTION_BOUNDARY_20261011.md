# Overnight motion freshness boundary closure — 2026-10-11

Baseline239d9d3e7f5b71c11e311445bc54a7ea5355b1e8. Independent motion review passed the bounded security/focus/stale/visual checks and exact Preview identity, then requested this single edge repair. No new feature phase is started.

## Result and regression

The actual previous renderer predicate was extracted for a local deterministic reproduction: a terminal report with expiresAt:null and an event aged299,990ms at paint animated after a25ms RAF delay, at300,015ms. The frame predicate now uses the same event/observation age rule as initial arrival selection and rechecks both at frame time. It retains the current Owner/source/selected tuple guard and running-run expiry. Report arrivals at or beyond300,000ms are suppressed even with null terminal expiry. Navigation to dated history remains a selection cue, not a new-report cue.

A small shared frame qualifier reuses one event-age function; no report event/timestamp/heartbeat, transport, storage or authority is introduced. Deterministic RAF cases cover event age and explicit file-observation age at+5ms (valid),+10ms (exact boundary) and+25ms (expired). Dated navigation, valid running/terminal cases and stale/expired refusal retain their behavior. Owner bundle is generated from the integrated source.

Focused118 and portable909/build/validate/static-safety PASS, forbiddenAttempts0. Native motion6 actual-app cases at1440/390 inzh-TW/ko/en PASS, synthetic upstreams only, external/writes0. Current root20 plus native motion6/follow6/delivery6/privacy2 =20 actual-app browser cases PASS; external/actualOwner/unexpected writes0. [Machine receipt](qa/mc-motion-frame-boundary-20261011/verification.json). Previous48-case integration receipt remains dated evidence at239d9d3, not relabeled as current. SQL/API/task/onboarding/source scopes/palette and both preflight fixes remain byte unchanged.

## Exact old test process cleanup

PID352980 was UID1000/agent, launched13:25:20UTC by original shell352976 (PPID1). Parent command exactly created our earlier task-review.test.mjs and ran the sole test into our earlier unit.log, with no following commands. Child352986 was its isolated Node test, same owner/start and no descendants. The prior Codex Owner-review stage and later replacement checks were complete; no current task depends on this old test. Pinned PID handles sent SIGTERM only to352980 and352986. Root352980 is gone; no old test executes. Shell352976 and child352986 remain exited Z entries adopted byPID1, awaiting init reap; no CPU/execution and no further signal. [Exact evidence](qa/mc-motion-frame-boundary-20261011/old-process-cleanup.json). No broad process kill, credential or permission change.

## Morning acceptance and remaining functionality

1. On the fixed Preview, use existing Owner sign-in/MFA. Recheck Buddy Continue main and Asset University candidate Continue/Back/Forward/reload on Chrome/mobile. Their source/ref/track qualification must remain visible; candidate acceptance stays pending. Try task/file/event changes, rapid changes and reduced motion, with stale/denied data remaining still.
2. For one genuine authorized MC task, choose another task, retain its full request/acceptance/constraints and cloud-save it. Leave the existing save-only test untouched. Copy the actual task-bound Agent packet (or full manual selection) into the parent thread for an already authorized receiving Agent; copying does not start work.
3. After actual Agent started/progress/blocked/completed receipts appear, check project/task/source/revision binding and original times, then separately load fresh PR/CI evidence. Owner must explicitly choose APPROVE or REQUEST_CHANGES against the unchanged displayed tuple; reload confirms a dated decision. Approval does not execute merge/deploy.

Actual served/Owner-device acceptance and a genuine cloud-task-bound receiving-Agent run remain pending. Runtime GitHub channel permissions/real CI are unconfirmed until actually read. New-project creation plan/six-file bundle remain preflight only: private repo creation, source/report registration and deployment target/authority/live provisioning are not connected working-project functionality. No MC dispatcher/model selector/automatic merge is required or added. Normal HTTPS CONNECT403 is not bypassed; fixed Preview READY metadata is not served acceptance. These are morning acceptance steps and remaining gaps, not authorization or a new implementation phase.

Own final work/handoff commits precede the new terminal, with exact remote/Preview/report receipt private and no later work HEAD advance. Production and all SQL/permission scopes remain untouched.

## Previous root prefix (exact bytes)

```text
# Current workspace motion integration — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T15:37:00.662Z
Task: Integrate exact private linked task/file/event pane motion
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 7cff2ed735207e14bf16184330d4a13eaaf09fe5

Exact313401b seven-file slice reviewed and cherry-picked asf6379aa; current Owner bundle rebuilt. Verified selection gives coordinated180ms visible-pane motion; rapid/remount/reduced-motion/Owner/source refusal cancel it. Fresh appended reports alone receive arrival highlights. No invented activity or execution.

Evidence: docs/MC_WORKSPACE_MOTION_INTEGRATION_20261011.md. Portable907/build/validate/check, focused116/root20/browser48 PASS; forbiddenAttempts0. Runtime21785c5 exact fixed Preview READY. Both preflight repairs and task review/SQL/API/scopes/palette preserved. Actual Owner writes0, saved test untouched. Prior prefix preserved there; dated history unchanged.

Next Action: final docs closure/exact SHA publication, then own integration terminal at final work HEAD; no later work-branch commit. Actual served/Owner acceptance remains pending and real task deferred. No Production/SQL/permissions/dispatch/model selector/AWS. Normal CONNECT403 not bypassed; servedCheckedSha null.

```
