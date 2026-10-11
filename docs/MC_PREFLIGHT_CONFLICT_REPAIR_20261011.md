# Preflight conflict repair — 2026-10-11

Parent independent review confirmed two bounded bugs in d29123b0599a92ec19386f2414b8f44c91f9ed93. This repair changes existing MC preflight/reconciliation only. No live draft or task fixture, SQL/ACL/config/source permission, bootstrap contract, new repo/project, provisioning, execution, Production or AWS change.

## Reserved report branch

The proposed initial source branch must differ from reserved mc/progress and cannot be its parent or child Git ref path. mc/progress, mc and mc/progress/bootstrap now yield REPORT_REF_OVERLAP, identity/source/report CONFLICT and planReady false. Compact zh-TW disclosure names the branch action. Slash-aware comparison keeps main, feature/bootstrap, mc/progress-bootstrap and mc/progressive valid. Initial six files and report-only deploymentEnabled:false are preserved. Every plan retains provisioned/developmentReady/executionAuthorized:false.

## Private draft conflict retention

The previous reconciliation helper stored one conflict, so a second changed remote draft replaced the first conflict; subsequent Save cloud could overwrite newer text. It now retains a conflict per draftId and exposes the selected draft's conflict. Repeated preflight refreshes cannot clear it. Explicit successful reload or exact acknowledged save/readback resolves only that draft. Other conflicts and local private text survive. Reload checks missing records before clearing anything; disappeared known cloud records remain conflicted and cannot be recreated by stale Save cloud. Existing CAS, exact lost-ack retry and Owner/generation/expiry clearing remain in use.

## Verification

Before changing the helper, all three new regression cases failed with missing rejection, reproducing stale writes for both remote-list orders and failed reload. Focused planner/onboarding/cloud tests pass 60, including five reserved-ref groups and five multi-draft/missing-record/lost-ack/capacity-failed-reload groups. A temporary isolated bare Git fixture proves native parent/child ref collisions and independent source/report refs; no external repository touched. Full portable898/build/validate/static-safety PASS, forbiddenAttempts0; root20 PASS. Actual-app/official-SDK synthetic browser8 across375/390/430/1440 PASS, including all three conflicting refs and valid main, both remote orders, blocked stale Save, retained local downloads and per-draft explicit reload.20 intended synthetic cloud writes; actualOwner/task/unexpected/external writes0. [Machine receipt](qa/mc-preflight-conflict-repair-20261011/verification.json), [cloud UI](qa/mc-preflight-conflict-repair-20261011/cloud-browser.json), [session onboarding](qa/mc-preflight-conflict-repair-20261011/onboarding-browser.json). Actual Owner/provider HTTP is not claimed, and real task/Owner acceptance remains deferred.

Publication uses only the existing fixed Preview and branch. Ordinary HTTPS CONNECT403 is not bypassed; servedCheckedSha remains null. Runtime and docs closure are independently checked for remote exact SHA/READY before the new actual bugfix run closes; the predecessor terminal is immutable. Final exact work/deployment/report receipt remains private to avoid advancing work HEAD after terminal closure.

## Previous root prefix (exact bytes)

```text
# Current new-project creation preflight — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T14:40:28.071Z
Task: Actionable creation plan from existing private draft and six-file bundle
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e464f571b9127c2684192fa1c5a96717d4c72142

Existing onboarding lacked a consolidated target/action plan. One copy now prepares exact private repo/branch proposals, original six files, Preview intent and source/report registration requirements. Prepared plan differs from missing configuration/authorization and target conflicts. Unknown targets stay existence UNCONFIRMED; only existing read scopes are queried. Cloud revision drift, outage, expiry/logout clear old plan; no provisioning or execution authority.

Evidence: docs/MC_PROJECT_CREATION_PREFLIGHT_20261011.md. Portable888/build/validate/check, focused50/root20/browser8 PASS; forbiddenAttempts0. Existing task/review/SQL/config/source scopes unchanged. Actual Owner writes0; harmless saved test untouched. Prior prefix preserved there byte-for-byte; dated history unchanged.

Next Action: runtimeff77b07 exact Preview READY. Final SHA/report receipt privately recorded after docs closure. Independent review pending. Real task packet/Owner acceptance deferred until tomorrow. No new repo/SQL/grants/keys/deployment project/Agent dispatch/AWS/Production. CONNECT403 not bypassed; servedCheckedSha null. Plan and offline bundle are not a working project.

```

## Dated runtime publication

Runtime b22489a12b5aaf30d01b11e9a1cc5e74e18af8bd exact canonical remote and fixed Preview dpl_6TPzLe489jmgtQQLBcWnxHKJb4Mg READY. Connected fixed alias and independent ID match at 2026-10-11T15:21:45.059Z; target:null is Preview under the existing project. Production remains dpl_5GgJ8LhD4Ec73RGz9CEFe1ppZQnh / 8b4945b16a0b23f2e72033aa976fa34f94eabec0. Ordinary GET 2026-10-11T15:21:29.200Z returned curl56 / CONNECT403 / HTTP000 before application; servedCheckedSha:null, no bypass or actual Owner acceptance. Docs-only closure is checked for functional parity before final exact publication. Terminal follows the final work HEAD, with exact final publication/report receipt kept private; no later work-branch commit is needed.
