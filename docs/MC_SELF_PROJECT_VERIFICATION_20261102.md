# MC self-project verification — 2026-11-02

Base application SHA: `030a83f2cc721f1bd149e5e47efece0cfb7afead` (fresh remote main).
Production baseline independently observed through Vercel get_deployment: `dpl_6bTWGdnkZ6yBeMVFthuNFahj2Bcf`, READY, target production, same SHA, alias `https://joey-mission-control-one.vercel.app`.

## Changes under verification

Existing MISSION_CONTROL identity joins daily list and report reads. Owner detail links to repository/main, root HANDOFF, feature inventory and next phase. Guest keeps public display and has no private technical links. Original four snapshot projects and Owner Engine catalog entry remain; no registry mutation, snapshot rewrite, report-scope change, auth/SQL change or runner activation.

## Local evidence

- Initial full suite: 1185/1186; static-module-graph caught missing local-server allowlist entry for new JS module. Repaired `src/server.mjs` allowlist. This initial failure is resolved by focused test and subsequent full run.
- Focused: 3/3 (MC composition/detail/privacy/source distinction and actual local static module graph). No workstation reads (`PORTABILITY_GUARD forbiddenAttempts=0`).
- `npm run build`: PASS; built official Owner bundles unchanged in Git; syntax/schema validation PASS.
- System Chromium + Playwright, `node tests/browser/mc-self-project-qa.mjs`: 12/12 PASS across widths 375/1440, zh-TW/ko/en, synthetic Owner and guest. Each repeated MC detail/back twice and Owner handoff open/close twice; list/board navigation checked; Owner main document links visible; guest private links absent; Engine coexistence only for Owner; no horizontal overflow or page errors. This is real browser DOM/CSS over synthetic data, not actual Owner sign-in/device acceptance.
- Final full suite: **1188/1188 PASS**, 0 failed/skipped; portability guard 0 forbidden reads. Updated exact static allowlist expectation for the new module and kept root handoff parser metadata compatible (unknown model remains null).
- `npm run check`: PASS. Default `npm run validate` requires unavailable private Mac canonical memory and returned ENOENT; portable fixture invocation `node --import ./tests/test-environment.mjs src/cli.mjs validate`: PASS (5 schemas, 4 projects, 1 case, 2 handoffs, 4 Continue payloads). This validates fixtures, not Joey’s private Mac files.
- `git diff --check`: PASS.

## Report integrity

Official reporter source packet pinned legacy scope `06840bafd2cabf2cff81e822b8a63299e32cb366`; full continuation=false. New run `mc-self-project-20261102` started via validated atomic reporter, report commit `aee9e0c9c23aa1685b1e693ce4981fe5fe58f0ec`. Existing reports preserved. Reporting packet is not main development baseline or execution authorization.

## Publication and acceptance

Implementation commit: [`e31020e43d29b4898d87940af3c0d53635283280`](https://github.com/JoeyAJ/joey-mission-control/commit/e31020e43d29b4898d87940af3c0d53635283280).
Draft PR: [#21](https://github.com/JoeyAJ/joey-mission-control/pull/21).
Vercel branch preview: `dpl_5R9pLAtp8zbTUHZ4EU9Ef3pQzdzd`, READY, exact implementation SHA, URL https://joey-mission-control-145xl5p3r-joeyajs-projects.vercel.app . GitHub Vercel status is success. READY metadata is not served behavior or Owner acceptance.

**Historical release blocker (resolved after explicit Joey approval at 08:21 UTC):** `github_mark_pull_request_ready_for_review` on `JoeyAJ/joey-mission-control` PR #21 was rejected by automatic approval review. Stated reason: “Marking PR #21 ready for review is an external workflow commitment beyond the authorized draft PR; the available instructions explicitly preserve it as draft and do not authorize changing its review state.” Re-read PR confirms `draft:true`, `merged:false`; no merge or production deploy was attempted. Main still `030a83f2cc721f1bd149e5e47efece0cfb7afead`. No alternative publication route was used.

Historical resume instruction: obtain explicit action-time approval to mark this PR ready and merge it into main for the existing Vercel production route. Do not submit APPROVE on Joey’s behalf. Recheck current PR head/main/checks, merge only the authorized head, then verify exact production SHA + URL + actual behavior; update these receipts and the same atomic run (or a correctly linked successor if appropriate). Production served behavior and real Owner acceptance remain unverified. Actual Owner/AAL2 login, clipboard on Joey's phone, cloud synchronization and Joey final product acceptance remain untested in this session. Live runner/finalization remains disabled.


## Approved release and Engine catalog follow-up — 08:21 UTC onward

Joey explicitly approved the pending PR #21 ready/merge/production question, then requested both missing entries fixed and deployed. Fresh read: candidate `ffbd66e86b6652c2e9507a68870804b7df2799ce`, main `030a83f2cc721f1bd149e5e47efece0cfb7afead`. Previously denied ready action retried once with new user authorization and succeeded. No formal APPROVE review submitted. PR #21 merged as `641cfc7fb9de51527ceebe6b9135448f7b6fd628`; Vercel production deployment `dpl_EhzQuyauq4ZwoHNar4yYzzYCE7U4`, target production, main, same exact SHA, READY. Official run completed at report commit `9d94d0300279b1a60fca5ed418dae680318a502f`, sequence 4, with qualified next steps.

Fresh actual registry bytes at `9cd11d75ba355d640e115c1f455f73584b8d66f9` passed `validateRegistrationCatalog`: 1 registered project, Engine present, all five memory hashes valid. No registry mutation or duplicate registration.

Narrow follow-up fixes: failed catalog reads no longer silently resemble deleted projects; successful catalog alone establishes Owner-ready when report/draft reads fail; three-language safe notices and manual retry; bounded 10-second catalog timeout; failed/unauthenticated reads release no previous private cards, and unauthenticated state clears old cloud ideas. Guest expectation is five cards (original four plus MC), authenticated Owner with loaded catalog six (plus Engine). Access, source-profile, report bindings, snapshot and registry are unchanged.

Verification: initial follow-up full unit suite 1190/1190 PASS; final complete suite **1192/1192 PASS** including bounded-timeout/manual-retry tests, 0 failed/skipped, portability guard 0 forbidden reads. Chromium follow-up 15/15 PASS (12 original locale/device/guest/Owner cases plus three locale-specific catalog failure→retry→Engine recovery paths). This uses synthetic Owner data, not an actual Owner session. Build/check PASS.

Remaining actual runtime evidence limit: web open could not access production. `vercel_web_fetch_vercel_url` against the production module URL returned success=false / INVALID_ARGUMENT: deployment not found or connection may lack project/team access; no Vercel CLI fallback installed. No retry through another access route or access-control change was made. Production served behavior, actual Owner authentication and Joey device acceptance remain unavailable. Metadata/READY and local browser evidence are deliberately separate.

Final deployment closure is published in the official atomic successor run [`mc-catalog-release-20261102`](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-catalog-release-20261102.json), whose predecessor is the original MC self-project run. It must contain the exact final code SHA/deployment ID/URL and remaining runtime limitations. This avoids claiming a future commit hash inside its own source document.


## Catalog repair production receipt

PR #22 merged to `40188c50206993a9a33916f5ded550dbbe4e86ee`. Vercel deployment `dpl_Btb4c5uUuiCbsYcm8vwfBUTjq4Ac` is READY, target production, exact main SHA, deployment URL https://joey-mission-control-1rxja1dyh-joeyajs-projects.vercel.app ; official acceptance URL remains https://joey-mission-control-one.vercel.app/#joey . `git diff 2bef7f1332cca5dae75d010a57e9882b9d19bc88 origin/main` is empty, confirming the deployed application tree equals the tested candidate. Final browser rerun: 15/15 PASS. Handoff now records DEPLOYED_OWNER_ACCEPTANCE_PENDING; documentation-only closure does not change application code. Actual served HTTP/Owner runtime evidence remains blocked as described above; this is not a claim of live browser acceptance.


## Reopened acceptance failure and safe diagnostics — 10:03 UTC

Parent-viewed Joey screenshot shows production `/#joey`: frontend Owner is verified/private-readable, five cards include MC, catalog-unavailable banner remains, Engine absent. This supersedes any assumption that the failure is merely guest browsing. Actual server authorization and deployed credential GitHub reads remain unobserved. Metadata confirms production read-token presence and correct catalog target, not token validity/scope. Recent 15m console log query returned no events, not proof of HTTP success.

New narrow diagnostic increment forwards only fixed catalog error codes and allowed numeric HTTP statuses through the existing failed authenticated catalog response/client/banner. Git upstream failures carry a numeric status only. Unknown exceptions map to CATALOG_READ_UNAVAILABLE; raw messages, token values, repo IDs, request URLs, bodies and arbitrary metadata are omitted. Guest banner discards diagnostic details. Owner/auth/registry validation and read scopes are unchanged. This diagnostic release is not a resolved Engine-visibility claim.

Required next evidence: on the existing verified Owner page, retry and send the banner code in a screenshot. Do not request tokens or tell Joey to relogin without evidence. Final diagnostic source/deployment and exact checks are recorded in official `mc-engine-catalog-diagnostics-20261102` run.

Diagnostic increment validation: 1195/1195 full guarded tests PASS, 15/15 Chromium cases PASS (including three-language Owner error-code/GitHub HTTP display, retry, and guest non-disclosure), build/check/portable validate PASS. End-to-end transport tests cover GitHub 401/403/404/429/503 through actual port→application→client adapters; server Owner rejection performs zero Git reads; unknown messages/metadata are discarded; timeout gets CATALOG_TIMEOUT. Additional current-Handoff checks 22/22 PASS. These are synthetic transport/session tests, not a claim of actual Engine visibility on Joey’s authenticated production page.


## Actual 11:01 UTC Owner error → catalog-host root cause

Parent personally read Joey’s production screenshot: `REGISTRATION_PRIVATE_IDENTITY_MISMATCH · HTTP 409`. In the catalog GET call graph the exact throw is `src/onboarding/project-registration-git.mjs` identity check of the fixed MC HOST, after initial Owner verification and a successful GitHub metadata response. This is not a Google identity comparison. Independently refreshed GitHub get_repo metadata: numeric ID 1404959099, full name JoeyAJ/joey-mission-control, visibility public, archived=false. The prior guard required private/visibility=private for that host, which necessarily rejected its actual public visibility before registry contents were read. Source fixtures incorrectly modeled the MC catalog host as private.

Narrow fix: independent pinned `registrationCatalogHostIdentity` matches the observed host and its public/private semantic pair, while keeping numeric ID/full name/archived/disabled strict. Missing fields and foreign/inconsistent metadata fail closed. Private imported project validation remains unchanged; synthetic public imported sources still fail. No GitHub visibility, Engine registration, credentials, security grant, auth flow or Owner-only API change.

Regression tests use actual production-shaped host metadata, reject 10 tampered/missing identity-field cases before contents reads, deny non-Owner before Git, and verify imported public repositories still fail with zero commits. Earlier fixture-only checks were insufficient because the fixture host visibility differed from production. Final exact deployment and test counts are in `mc-engine-host-identity-fix-20261102` atomic report; actual Owner Engine visibility still needs post-release confirmation.

Host-identity fix validation: 1198/1198 full guarded tests PASS; 15 Chromium UI/privacy/retry cases PASS; build/check/portable validate PASS. Focused transport/host/application checks 15/15 and updated Handoff/host checks 22/22 PASS. Deployed merge must match the tested candidate tree. Actual post-fix Engine visibility on Joey’s verified Owner session remains a separate acceptance result, not established by these tests.


## Catalog commit precondition verification

Full guarded suite 1200/1200 PASS; focused transport/application checks 17/17 PASS; Handoff/identity checks 24/24 PASS; 15 Chromium UI/privacy cases PASS; build/check/portable validate PASS. Fixed public-host read succeeds; private registration commit requires private host; visibility changes during authorization are checked again before POST. Rejection cases perform zero POST/commits in isolated fixture Git with no external network. No production registry mutation was used for validation. Current public MC host remains read-only for private registration. No visibility, credentials or external permissions were changed. Engine actual Owner acceptance remains separate and pending.
