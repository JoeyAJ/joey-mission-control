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

**Release blocked (known denied, not uncertain):** `github_mark_pull_request_ready_for_review` on `JoeyAJ/joey-mission-control` PR #21 was rejected by automatic approval review. Stated reason: “Marking PR #21 ready for review is an external workflow commitment beyond the authorized draft PR; the available instructions explicitly preserve it as draft and do not authorize changing its review state.” Re-read PR confirms `draft:true`, `merged:false`; no merge or production deploy was attempted. Main still `030a83f2cc721f1bd149e5e47efece0cfb7afead`. No alternative publication route was used.

To resume: obtain explicit action-time approval to mark this PR ready and merge it into main for the existing Vercel production route. Do not submit APPROVE on Joey’s behalf. Recheck current PR head/main/checks, merge only the authorized head, then verify exact production SHA + URL + actual behavior; update these receipts and the same atomic run (or a correctly linked successor if appropriate). Production served behavior and real Owner acceptance remain unverified. Actual Owner/AAL2 login, clipboard on Joey's phone, cloud synchronization and Joey final product acceptance remain untested in this session. Live runner/finalization remains disabled.
