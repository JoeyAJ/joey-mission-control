# Workspace reading continuity handoff

The actual public app reset the Timeline's independent scroll and dropped
keyboard focus after Explorer selection. Baseline reproduction on b189 recorded
Timeline 180→0 and the focused control→body. The independent P1/P5 stage keeps
reading position and focus through the existing controller; no new source or
Owner login is required. Joey remains Product Owner and Final Approver.

Prior verified source: b189aa11226eb9b4cdcdbbab935d7bf857b50dc7;
tree: 2afecbe915d37e4b6239b4d31cedfd037552fef0.
Candidate:`codex/mc-reading-continuity-20261007`.
Fixed branch:`codex/mc-command-center-checkpoint-20261006`.
Exact committed source/tree, push/fetch-back and READY identities are external
in `/workspace/mc-deliverables/workspace-reading-checkpoint.json`.
Production remains 8b4945b16a0b23f2e72033aa976fa34f94eabec0.
Existing fixed preview:
https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/#workspace?project=NEXAEON&panel=entries

Behavior and acceptance:

- Same-project selection retains independent Timeline/Explorer/Graph positions.
  Different inspected content or source version starts its inspector at the top.
- Same-content refresh retains inspector position and source disclosure. Failed
  reads retain confirmed content and reading position; successful retry recovers.
- Mobile hidden panes, browser Back/Forward and leaving/returning to Workspace
  retain the active project's reading position. Project change/full reload clears
  transient geometry; existing route and inspector mode survive reload.
- Keyboard activation retains the same visible control. A control hidden by
  navigation transfers focus to the new visible pane. Outside/Auth focus is not
  captured or restored by this helper; replacement uses preventScroll.

Implementation: `public/workspace-reading.js` keeps one active project's bounded
scroll numbers in a WeakMap. Focus is matched by an allowlisted data identifier
and element tag, avoiding the inspector container/button attribute collision.
The controller snapshots geometry before hiding Workspace and restores visible
panes after replacement. It does not cache DOM, content, input values or Auth
state; no storage, listener, network, source event or Agent is added. Selection
identity is qualified by project, item, inspector mode, source revision and event
time. `src/server.mjs` explicitly serves this new presentation module. Existing
public API, Owner SDK/config/session, CSP, package pins and recorded source bytes
remain unchanged. Owner decision submission stays false.

Evidence outside the product bundle:

- `workspace-reading-before.json`: actual baseline loss reproduced at1440/en.
- `workspace-reading-browser.json`: 12 cases, 1440/870/390/320 × zh-TW/en/ko;
  actual public app, recorded production API and real local static handler;
  selection/refresh/hidden panes/return/failure/retry/history/focus/reload PASS;
  external requests 0, API mutation requests 0, page errors 0, no horizontal overflow.
- Long scroll geometry is a same-origin test-only CSS blank pseudo-element;
  no event, task, source text or Agent fixture is inserted into the public data.
- `workspace-reading-portable.log`: 485/485 PASS; build/schema/static safety,
  validate/check and forbidden workstation attempts 0.
- `reading-owner-helper-browser.json`: 9 guarded synthetic Owner cases using the
  actual replacement helper; live requests 0. Existing SDK lifecycle 9 also PASS,
  synthetic only/network 0. These do not establish actual Joey Auth/AAL2.
- The existing complete module-graph test now verifies the new module's200;
  the exact static whitelist expectation includes only this added module.

Reproduce with pinned existing product dependencies and installed Chromium:
`npm run verify:portable`; then
`MC_QA_OUTPUT=<private-receipt> node tests/browser/workspace-reading-qa.mjs`.
Playwright resolves from MC_PLAYWRIGHT_MODULE or CODEX_PRIMARY_RUNTIME_NODE_MODULES.
`MC_QA_OWNER_DECISIONS=guarded MC_QA_OUTPUT=<private-receipt> node tests/browser/owner-coordinator-qa.mjs`
checks synthetic protected Owner behavior through the same helper.

Reference grounding: all three approved frames were materialized from private
Git dfa1cfc7843a02d9cd6935911426eea5482d06fc and visually inspected again.
02s SHA256 b3b0f68d54c6388928a8087cc8b68a98ab16f82dd1bb6ce9a226305efad19eb6;
18s SHA256 63dd938b7b7566c058ed7455d71d1bd86df7ae698065b29a8d2ad866fd8fdd26;
34s SHA256 c996b9aae08516adb44173e906acd2fed008873570694ac3af82f2808b61a1ae.
Parallel logs/Explorer/context support this reading-flow priority. Static frames
do not prove dynamic focus/scroll behavior, current agents or live tool events.
Frames and screenshots are excluded from this source commit/public output.

Remaining dependencies: parent Mac corrected Owner projection smoke returned
Transport closed, so no new Owner UI verification occurred. Keep submission
false; actual Owner final commit/readback/revocation/two-device/lost-response
acceptance remains pending. No SQL, Auth/grant change or live RPC was performed
in this UI stage. Exact-task authenticated tool/code/diff producer and canonical
per-store writer/cutover/continuous sync remain unsupported. Existing checkpoints
are handoff custody, not autonomous execution or final Joey target acceptance.
SSO remains enabled. Protected deployed pixel/Owner acceptance is distinct from
local source browser evidence and provider READY/source identity. This stage
creates no bypass credential and does not promote production.
