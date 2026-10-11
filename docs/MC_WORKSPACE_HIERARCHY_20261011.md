# Shared selected-work context

Isolated branch: `codex/mc-workspace-hierarchy-20261011`. Base: `625ff30ff466d1f81eb2091eb3ea5a8f9b96641b`, retaining integrated website/project-list navigation, task-login feedback, finalization code and the disabled Owner email-OTP configuration.

The selected task overview used to live inside the Events pane and disappear when mobile users opened Context. Task cards also omitted their reported Agent names. One shared context strip now sits above all four workspace panes: current project/track, reported Agent/state, selected task and the existing current-project handoff action. Task cards show their reported Agent alongside their state. One native disclosure opens the full title, original report date, evidence and recorded next steps; keyboard/touch and reread focus/open state are preserved. Critical blocked/failed text, delivery qualifications and independent/Joey acceptance pending stay visible while supporting details are closed.

The strip reuses `renderSelectedTaskSummary` and the already validated projection; it changes presentation, not source truth. Current-project handoff still rereads current source and reports, independently of the selected historical task/event. Dated task states remain unconfirmed, dated event time stays original, unobserved files stay unobserved, and empty/refused/unconfirmed sources clear task/Agent details. University candidate remains explicitly labelled and acceptance stays pending. No editor content, terminal stream, fabricated file operations or live execution status is introduced. The existing 180ms controller and its final five-minute RAF guard are unchanged; the shared strip joins the same guarded visible-pane selection cue.

## Visual inspection

Both supplied PNGs remain hash-verified and were actually inspected. Actual author-GIF frames were inspected for session-card hierarchy and Agent/task context; that author alternative is not proven to be the same Reddit clip. The established charcoal/cyan/periwinkle/magenta palette is retained. Original references are outside Git and the evidence package.

Before captures replay canonical `625ff30` renderer/styles against the same synthetic source fixtures. After captures show the shared overview persisting on mobile Context, Agent-aware cards on desktop, closed/expanded details, a visible blocker and current-project action, dated task, empty scope, refusal, and University candidate. Desktop 1440px/mobile 390px and zh-TW/en/ko are covered. The latest matching before/after images were inspected directly, including expanded and blocked states.

## Verification

- `npm run verify:portable`: 945 passed, 0 failed; build/schema/static safety passed; portability forbidden attempts 0.
- Focus header: 6 browser cases; University candidate focus: 6.
- Existing linked motion, file navigation, follow/unread, v1/v2 delivery and compact disclosure/reference theme: 6 each, 30 total.
- Existing handoff privacy/cancellation: 2; Simple Joey takeover: 4; mobile task-login feedback: 3.
- Existing website/project-list navigation: 9 cases / 54 project-scope checks at 1440/390/320px in three languages.
- Total final browser cases: 60. A separate 6-case before-capture run is excluded from that total. Targeted source/selection/final-RAF guards: 19 passed (a subset of the portable suite).
- All browser sources/Auth/clipboard are synthetic or intercepted; no external request was sent and no write occurred. These are actual app/source/SDK/server-factory checks, not served Preview, real Owner or Safari/iPhone acceptance.

Receipt: `docs/qa/mc-workspace-hierarchy-20261011/receipt.json`. Before/after captures, logs and a portable source patch are delivered separately.

## Canonical writer integration

Fetch the private branch and cherry-pick its final source commit. Do not also cherry-pick the earlier `8049af6` checkpoint. Six source/test files plus this document and the receipt are included; generated `public/owner-auth-client.js` is excluded so the writer rebuilds the latest Auth/task/finalization implementation together with this view.

```sh
git fetch origin codex/mc-workspace-hierarchy-20261011
git cherry-pick <final source commit supplied with this handoff>
npm run build
npm run verify:portable
MC_WORKSPACE_FOCUS_QA=1 node tests/browser/dynamic-workbench-qa.mjs
MC_WORKSPACE_FOCUS_QA=1 MC_WORKSPACE_FOCUS_CANDIDATE=1 node tests/browser/dynamic-workbench-qa.mjs
```

No Auth, SQL, task/report contracts, allowlists, navigation mappings or OTP setting changed. No canonical push, merge or deployment was performed. Canonical integration and served Owner/Joey acceptance remain with the sole writer and Joey; passwordless setup is separate from this visual increment.
