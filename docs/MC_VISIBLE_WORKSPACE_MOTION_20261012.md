# Visible Workspace motion handoff

Base: `84482523c42ea644174c4fff81a166751e0916b5`. Isolated branch: `codex/mc-workspace-motion-20261012`. The previous composition is a layout improvement and does not, by itself, meet the dynamic-reference goal.

## Observed reference gaps

The cached author GIF was inspected again at frames 0, 40, 80, 120, 160, 200, 240, 280 and 328 (27.5 seconds total). It is an author-provided alternative, not proven identical to the inaccessible Reddit reference. Its scene changes/fades do not establish that every pane expansion is a native application tween.

| Observed pixels | Gap in the preceding MC composition | This pass |
| --- | --- | --- |
| At 6.67s, pixel-docs is selected and its terminal context fills the main area; acme-shop remains in the session rail with a permission request. | MC has linked selection, but only a subtle 180ms / 3px entrance and fixed pane proportions. | Validated linked facts now enter over 420ms / 24px, with a finite selection highlight. Critical task/approval text remains fully opaque and stationary. |
| At 10.00s and 13.33s, tree, editor and relation panes appear beside the session output. At 20.00s the main session takes the wider area again. | MC offers four panes at nearly constant geometry. | Explicit Reports / Files / Evidence controls visibly reflow the existing four panes over 460ms. No terminal or editor is fabricated. |
| Between 10.00s and 13.33s, selected files and visible editor text change; the 13.33s frame labels a real file write. At 16.67s the selected Agent response is partially written and at 20.00s it is complete. | MC has source-reported file metadata and discrete reports, without authenticated file-content or terminal streams. | Stronger motion and highlight only for already-validated selection/appended reports. Live typing and code streaming remain unavailable; no fake progress or repeated idle activity is added. |

## Behavior and limits

On desktop, click Files to increase the lower centre pane, Evidence to widen the inspector from 340px to 480px, Reports to enlarge the report stage, and Overview to restore the original proportions. All four panes, the project/task/Agent band, delivery qualification and critical blocked/approval state remain visible. The chosen view survives normal source refresh for its project/track and has no stored private data. Mobile keeps existing native pane tabs; task/event/file selection uses the same validated source motion. Reduced motion uses instant reflow, cancels in-flight selection effects and does not replay old facts when restored.

The animation uses the current DOM only; no previous private-content screenshot or clone is retained. The existing Owner, source confirmation, tuple identity and five-minute final-frame checks remain unchanged. Stale, refused, empty and disconnected inputs do not gain activity animation. An unchanged report does not replay movement. Idle remains still. This is interactive pane and real-update motion, not evidence of a live Agent runtime.

## Verification and integration

Native Chromium before and after WebMs, screenshots and receipts accompany the source patch. Before footage is actual canonical `8448252` UI captured before edits. After footage includes the new pane controls and the existing task/file/history interactions over synthetic or intercepted inputs. No external request or write was sent. Browser assertions measure intermediate reflow geometry, preserved task facts/focus, four-pane visibility, reduced-motion cancellation, three languages, 1440/390 widths, validated new events, historical-file qualification, rapid selection, Owner refusal and disconnect cleanup. Real Owner, served Preview and Joey device acceptance remain with the sole writer.

Only presentation code and tests change. `src/reporting/workbench-motion.mjs` changes the visual keyframes/duration; its selection/source/freshness guards and report contract remain intact. No Auth, report storage, backend, schemas, run records, capacity or deployment settings change. The generated Owner client is excluded from the source commit and must be rebuilt by the writer.

Fetch and cherry-pick the final supplied commit, then run `npm run build`, `npm run verify:portable`, and `MC_VISIBLE_MOTION_QA=1 MC_WORKSPACE_MOTION_QA=1 node tests/browser/dynamic-workbench-qa.mjs`. Run existing workspace focus/candidate, disclosure/delivery/privacy and Joey navigation checks. The writer should publish the integrated fixed Preview and give Joey the actual test URL. This UI writer did not push the canonical branch, merge or deploy.
