# Reading panes, report graph and stable refresh — local candidate

Project: MISSION_CONTROL
Authorized scope: Joey's “對三個一起開發”, 2026-10-13 13:32 UTC, relayed in the implementation delegation.
Executed by: Codex, API execution environment. Exact underlying model identifier was not supplied; UNKNOWN.
Canonical baseline: `8a045905b31386e4686148c75149ba4d3dcdc266` on `codex/mc-command-center-checkpoint-20261006`, fetched and independently resolved before work and again at 14:22 UTC.
Candidate branch: `codex/mc-reading-graph-refresh-20261013`. Exact local candidate SHA is supplied in the completion response; this document is part of that commit.
Acceptance: locally tested implementation; publication and Joey acceptance pending.

## Implemented behavior

- Work view, report timeline and graph now have collapse/expand, enlarge/restore and height resize controls. Resize supports pointer dragging and a keyboard separator (Up/Down/Home/End). Escape restores an enlarged pane; its keyboard Tab traversal stays in that pane. Geometry is held in document/project/track-scoped memory, without private content in URLs or browser storage. Intentional navigation remounts retain pane preferences; data refresh preserves pane DOM, scroll, text selection and focus.
- The existing validated selected-task network now includes the report's explicit project and Agent and explicit result/outcome nodes, alongside task, events and manifest files. Edges describe report membership, explicit results, matched file observations and recorded event order. There is no inferred dependency, fabricated relationship, current process telemetry or simulated live state. Pan, zoom and drag remain available. Selection highlights adjacent edges, subdues unrelated nodes, shows node details and adds a subtle star pulse; reduced motion disables that pulse. Graph geometry survives report refresh; topology changes preserve positions/zoom and restore the matching keyboard control.
- Workbench content renders into a detached tree and reconciles keyed nodes/text in place, renewing handlers with the current render. Unchanged graph topology retains its viewport. Reads retain the last confirmed reading surface with an explicit qualification until the result arrives; auth loss, denial/conflict and failed/unconfirmed reads continue to withdraw private/current content. Default work-view dimensions are stable even on error. The top-level refresh, including a public read failure, keeps an unchanged workspace mounted and updates the bounded platform observation in place, including expiry qualification. Returning from Joey View mounts a fresh workbench rather than reusing a disposed one.
- Actual source/report requests drive the non-obscuring gradient glass border strip. It traverses all four edges and uses the existing `public/brand-eye-source.png` through the existing `brandEye` helper and its established fisheye crop. Completion/error stops it; reduced motion provides a stationary marker. No new logo or progress percentage was invented.
- Mobile workspace sizing now respects the viewport; daily navigation's later generic CSS no longer overrides the workspace's established layout. Enlarged pane controls remain above the mobile header. No unrelated appearance polish is included.

## Files and boundaries

UI: `public/app.js`, `command-workspace.js`, `styles.css`, new `reading-panes.js` and `region-update.js`; rebuilt `public/owner-auth-client.js`. Report implementation: `src/reporting/workbench-view.mjs`, `workbench-network.mjs`, new `reading-patch.mjs`, and the file task-selector handler in `file-navigation-view.mjs` (reads `event.currentTarget` after keyed reconciliation). `src/server.mjs` adds only the two presentation modules to the explicit static allowlist.

Tests: `tests/workbench-network.test.mjs`, `tests/i18n.test.mjs`, `tests/browser/dynamic-workbench-qa.mjs`, `workbench-network-assertions.mjs`, new `reading-improvements-assertions.mjs`. The exact allowlist assertion is updated; arbitrary modules remain refused. Browser fixture serves the actual existing PNG, with the correct image MIME type.

No push, merge, deployment, database/data/permission change, credential generation, intake/approval workflow activation, pet-diary development or AI Interactive Experience Engine work occurred. `vercel.json`, source allowlists, runtime/security controllers and deployment snapshots remain unchanged. Preview and Production were not modified. Final live Owner/Joey acceptance is not inferred from tests.

## Verification and evidence

- `npm test`: 1111/1111 PASS (full portable suite; final rerun result is attached to the completion evidence).
- `npm run build`: PASS; module syntax and runtime/activity/product/canonical schemas plus browser bundle checks.
- `npm run check`: PASS. `git diff --check`: PASS.
- Focused network/projection/motion/i18n/static-module suite: 37/37 PASS.
- Real local `/usr/bin/chromium` through Playwright, actual app/official SDK and the existing deployed endpoint factories, with synthetic Owner/auth/report inputs: 18 PASS cases, each at 1440×900 and 390×900 in zh-TW/ko/en. Reading: 6; network: 6; file navigation: 6. All receipts record zero external requests and zero writes.
- Reading cases verify pointer and keyboard sizing, mobile tap collapse, refresh persistence, enlarge/Escape/keyboard containment, unobscured mobile restore controls, native text range/focus/scroll preservation, true delayed API loading, all four border positions, loaded approved image, reduced motion, stop on success/503 error, stable error bounds, graph viewport/zoom retention, adjacency and denial purge, and return/remount behavior.
- Network cases verify source-only edges, drag updating edges, mouse/keyboard pan, wheel/button zoom, focus restoration after topology change, selected graph/details continuity, honest unobserved manifests, refusal purge and reduced motion. File cases preserve existing selection/history/report follow and source isolation.

Local inspectable artifacts (ignored by Git): `evidence/mc-reading-ui-20261013/` contains receipts, test/build/check logs and selected desktop/mobile PNGs. Full browser captures are also in `/tmp/mc-ui-reading`, `/tmp/mc-ui-network`, `/tmp/mc-ui-files`. These screenshots contain explicitly synthetic fixture data and are not private live Owner evidence. The implementation agent visually inspected desktop/mobile normal layouts, enlarged graph/timeline and actual-request border screenshots.

## Failed or unavailable checks and limitations

- `npm run validate` cannot run against the configured canonical Mac source: `/Users/joeyaj/JOEY_CANONICAL_MEMORY` does not exist in this environment. This command was attempted and failed ENOENT; no Mac access or source relocation was requested. Portable schema/build and full tests passed independently.
- The legacy `MC_SELECTED_TASK_BRIEF_QA=1` browser path times out trying to click `.joey-task-details > summary`, now hidden by the current daily-navigation layout. The identical failure was reproduced in an isolated, unmodified canonical `8a045905…` worktree. It is an existing harness entry mismatch, not a passed check; adapting that older Joey-only route is outside this three-improvement scope. Current workbench reading/file/network paths are verified above.
- Real Owner HTTP/device acceptance, physical iPhone/Safari, clipboard, served Preview verification and Joey product acceptance were not run. No denied remote access was bypassed.
- Geometry is intentionally transient for the current document/session; a full browser reload starts default sizes. The graph shows the selected validated task's relations, not fabricated cross-project links. Source/diff/editor/terminal integration remains as previously qualified. A genuinely different public source snapshot or a route/locale/project change can remount the workspace; existing reading-state restoration and pane memory handle that transition. Report/source refresh on the mounted workbench patches in place.

## Publication instructions — separate Owner approval

1. Inspect the exact candidate SHA from the completion response and this handoff; verify its single parent is `8a045905b31386e4686148c75149ba4d3dcdc266`. Confirm the canonical branch has not advanced before integration.
2. Obtain explicit Owner approval for the specific next publication action. If approved, publish the candidate feature branch for review, or integrate this reviewed local commit into the canonical branch using the owner's chosen process. Do not silently rewrite a newer canonical baseline.
3. Deploy/verify only the separately approved Preview target at the reviewed exact SHA, preserving existing source scopes/runtime/security settings. Recheck private Owner reads, real desktop/mobile interaction and the approved logo marker there. Preview READY is not Joey acceptance.
4. Keep Production unchanged unless separately and explicitly authorized. No automatic intake/approval runtime, database installation or permission grant follows from this UI candidate.
