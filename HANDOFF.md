# Control Tower daily overview — 2026-10-14

Project: MISSION_CONTROL
Timestamp: 2026-10-14T06:05:36.000Z
Task: Replace the daily Joey overview with a Control Tower (PM-style flight board) and Agent handoff sheet
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Claude Code
Executed by: Claude Code
Actual Model: claude-opus-5-5
Parent: `02060ac353c57f7ecc4614bb94d4f2246a53d16d` (`codex/mc-command-center-checkpoint-20261006`).
Feature branch: `claude/mc-control-tower`.

## Summary

Joey approved (2026-10-14) a simpler daily entry: every project as one card showing status, version, responsible Agent and one line of progress, plus one-tap handoff to Codex / Claude Code / Hermes.

- `#joey` now renders the Control Tower (`public/control-tower.js`, `public/tower-model.js`, `public/control-tower.css`). The previous overview stays at `#joey?view=classic`; advanced views are unchanged.
- States: blocked, may have stopped (heartbeat expired, never shown as running), your call (Idea), awaiting pickup, in development, paused, done, standing by. Attention states are grouped on top.
- Awaiting pickup: copying a handoff records a per-browser intent (localStorage, 72 h). The card switches to the new Agent only after that Agent's own report is newer than the copy time. No server write, SQL or new permission.
- The handoff sheet mounts the existing verified takeover flow (Owner sign-in, fresh source read, copy, manual fallback) and prefixes the receiving Agent name and stage goal (`decorateInstruction`, `onCopied` options on `mountJoeyTakeover`).
- Live reports: `readOwnerTowerRuns` (Owner bundle) reads each project's repository runs with the verified Owner session about every 30 s while the tower is visible.
- NexAeon visual system: indigo/orchid palette, flowing light border on cards in development, mobile single column and bottom-sheet handoff, reduced-motion fallback. Fonts use the system stack because the CSP blocks external fonts.
- Owner sign-in origin moved to the public site (2026-10-14, Joey's explicit request): `ownerAuthConfig.stageOrigin` and `owner-session` stage are now `https://joey-mission-control-one.vercel.app`; the old branch alias no longer serves private routes. Production needs `MC_GITHUB_READ_TOKEN` / `MC_GITHUB_REGISTRY_WRITE_TOKEN` in the Production environment and the Supabase redirect URLs for `/owner-email-login.html` and `/owner-password-recovery.html` (Joey's dashboard steps).
- Review (2026-10-14): a completed Agent run on an active project shows "needs review" in the attention group. Joey approves or writes a change request, which opens the handoff sheet with the feedback as the goal; decisions are stored per run in this browser (`mc.tower.reviews.v1`). Cards link to the project's public site. Ideas: go ahead -> new-project handoff; shelve -> restorable list. Legacy Joey View button now opens the overview.
- Project detail (2026-10-14, layout stage B): `#joey?detail=<projectId>` shows the project card, current progress/latest result, review history (`mc.tower.reviews.v1` log), Agent work log and a collapsed technical section linking to the existing workspace. Card titles and "View details" open it.
- Menu cleanup (2026-10-14, layout stage C): navigation is Overview + Technical workspace only. Every non-`#workspace` route (classic Joey View, Agent console, Inbox, Workspaces, Evidence/Handoffs, Project detail, `#joey?mode=advanced`) renders the overview; `detail()` redirects to `#joey?detail=<id>`. Retired views stay in the code and markup sections.
- Cloud sync (2026-10-14, Joey's request): handoff intents, reviews and idea decisions sync across devices through Supabase migrations `mc_owner_tower_state_20261014` + `mc_owner_tower_state_executor_20261014` (`mc_private.tower_state`, RPCs `mc_owner_tower_state_get` / `mc_owner_tower_state_patch`, owned by `mc_continuity_executor`, Owner/AAL2 via `project_draft_actor()`). `public/tower-sync.js` keeps a local-first copy, pushes changed entries while signed in, uploads pre-existing local records once, then treats the cloud as the source of truth. Signed-out local ideas stay on the device. Fix 2026-10-15 (`mc_owner_tower_state_patch_fix_20261015`): the patch RPC failed with 42702 (parameter `state_key` vs column in ON CONFLICT); it now targets `tower_state_pkey`.
- Registered projects (2026-10-15): the overview also lists projects from the private `mc/registry` catalog (Owner-only `/api/private/project-registrations`). Catalog reads now fall back to `MC_GITHUB_READ_TOKEN` (`readCredential`); registry writes still require `MC_GITHUB_REGISTRY_WRITE_TOKEN`. Pending projects show under "Your call" with "Start development", which copies a repository-based handoff. Agent instructions for registering a project are at the top of `AGENT_CONTROL.md`.
- Reject/remove (2026-10-15): pending registered projects have Reject; all registered projects have Remove. Both only hide the card (synced `ideaDecisions` entry `rejected`/`removed`) and list it under "Rejected or removed projects" with Restore; catalog and repository data are untouched. Idea handoffs now ask the Agent to register the new project per AGENT_CONTROL.md.
- Demo layout: `#joey?demo=1` (clearly labelled, never mixed with real data).
- Stage version: handoff text asks the receiving Agent to start `featureTitle` with the version (`v0.4 · goal`); cards read the version from there.
- Quick idea capture (2026-10-14): the "+" button saves one sentence as a private Owner cloud draft through the existing draft storage (`src/onboarding/quick-idea.mjs`, max 12). Drafts show as "your call" cards; "go ahead" opens the existing onboarding flow in the classic view, "shelve" hides the card in this browser only (the draft is kept).

## Verification

- New `tests/tower-model.test.mjs` (9 tests) and the updated allowlist test pass.
- Full suite in a portable copy: 1106/1120 pass; the 14 failures are identical on the unmodified parent (environment-bound journal/PTY/file-mode tests).
- `npm run build` passes. Desktop (1440 px) and mobile (375 px) checked locally with demo data; real Owner sign-in, live reports and real clipboard copy need Joey's check on the Preview.

## Next

- Joey reviews the Preview; then iterate on visuals/content.
- Joey checks real sign-in, live reports, clipboard copy and idea saving on the fixed Preview.

---

# Reading panes, graph and stable refresh — 2026-10-13

Project: MISSION_CONTROL
Timestamp: 2026-10-13T14:52:46.000Z
Task: Implement authorized reading panes, source-backed graph and stable refresh
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Canonical baseline: `8a045905b31386e4686148c75149ba4d3dcdc266`.
Feature branch: `codex/mc-reading-graph-refresh-20261013`.

## Summary

The exact underlying model identifier was not supplied by the API environment.

Joey explicitly authorized all three UI changes at 13:32 UTC. The local candidate implements resizable/collapsible/enlarged reading panes, source-backed project/Agent/task/outcome graph selection and stable refresh with the existing NexAeon fisheye border marker. Report reading DOM, native selection, focus, scroll and pane preferences persist across data refresh. Existing source/data/security boundaries remain intact.

The original local candidate `9ec1564d9981926d222c9c0f46fafe50f7f5171b` was held by independent review for retained graph content after a connected-but-unconfirmed/empty response. The bounded correction now withdraws DOM, renderer, signature and state together, excludes unavailable reads from loading retention, and verifies recovery with 30 Chromium transition cases. Auth/report contracts and backend behavior remain unchanged.

## Verification

[Implementation, tests, visual evidence, limitations and separate publication instructions](docs/MC_READING_GRAPH_REFRESH_HANDOFF_20261013.md). Full portable suite: 1111 PASS; local Chromium reading/network/file QA: 18 PASS plus 30 lifecycle/recovery cases across desktop/mobile and three locales; build/check PASS. Mac canonical `validate` is unavailable; an obsolete Joey-only browser entry fails identically on canonical baseline. Real Owner/device/served Preview and Joey acceptance remain pending.

## Next Action

Joey approved this bounded release to the existing MC Preview at 14:41 UTC, including the necessary correctness correction. Review and tests passed; safely publish only if canonical HEAD is still the verified `8a045905…`, then verify exact remote SHA, READY and fixed alias. At this document checkpoint nothing has been pushed, merged or deployed; Production/Preview, database, grants, credentials, automatic intake/approval runtime, pet diary and AI Interactive Experience Engine remain unchanged. The prior attributed handoff is retained verbatim below.

---

# Reviewed runtime-OFF integration — 2026-10-12

Project: MISSION_CONTROL
Timestamp: 2026-10-12T23:50:20.000Z
Task: Integrate reviewed dynamic-project code while preserving inactive runtime and live schema
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Reviewed source: ef3b26bfcbbe1a3e9a57316b95d17c85ac36ed4b

## Summary

Parent independent review GO permits code integration with dynamic runtime OFF. Real-router/private catalog fencing, three-project list isolation, same-scope form, revision-bound review and current-review final handoff are integrated. Canonical vercel.json is retained byte-exact; the reviewed guard and its commit ancestry are excluded. Publication uses one new commit parented only by canonical e1a5c88. No live grant, credential, migration or real task execution is included.

## Verification

156 focused tests and build pass on this integration. Prior repaired candidate passed real app/router synthetic lifecycle and four maintained existing UI cases. [Release scope and live preflight](docs/MC_RUNTIME_OFF_INTEGRATION_RELEASE_20261012.md); [reviewed runtime repair evidence](docs/MC_DYNAMIC_PROJECT_RUNTIME_REPAIR_20261012.md). Actual served-page/Owner/Agent acceptance remains unverified.

## Next Action

Read-only live schema source/ownership/ACL/RLS fingerprint matches the recorded baseline. SQL installation is still HOLD: both membership rows are not fully enforced by the proposed guards, and PostgreSQL17 live role attributes differ from the PostgreSQL16 fixture. Parent owns the specific installation approval after resolving these items. Registry secure writer binding and named-project grants are separately pending. Dynamic runtime, automatic dispatch/merge/deploy remain OFF; Production and eleven reports/history are unchanged.

## History

[Prior private review handoff](docs/history/HANDOFF_20261012_ef3b26bf.md) and linked earlier handoffs remain byte-exact. New release metadata/actual acceptance are recorded separately; this attributed checkpoint is not a runtime or product-completion assertion.
