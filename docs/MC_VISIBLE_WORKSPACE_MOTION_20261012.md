# Visible Workspace motion handoff

Base: `84482523c42ea644174c4fff81a166751e0916b5`. Isolated branch: `codex/mc-workspace-motion-20261012`. The previous composition is a layout improvement and does not, by itself, meet the dynamic-reference goal.

## Observed reference gaps

The cached author GIF was inspected again at frames 0, 40, 80, 120, 160, 200, 240, 280 and 328 (27.5 seconds total). It is an author-provided alternative, not proven identical to the inaccessible Reddit reference. Its scene changes/fades do not establish that every pane expansion is a native application tween.

| Observed pixels | Gap in the preceding MC composition | This pass |
| --- | --- | --- |
| At 6.67s, pixel-docs is selected and its terminal context fills the main area; acme-shop remains in the session rail with a permission request. | MC has linked selection, but only a subtle 180ms / 3px entrance and fixed pane proportions. | Validated linked facts now enter over 420ms / 24px, with a finite selection highlight. The focus-band task/delivery text remains fully opaque and stationary; detailed report summaries can animate. |
| At 10.00s and 13.33s, tree, editor and relation panes appear beside the session output. At 20.00s the main session takes the wider area again. | MC offers four panes at nearly constant geometry. | Explicit Reports / Files / Evidence controls visibly reflow the existing four panes over 460ms. No terminal or editor is fabricated. |
| Between 10.00s and 13.33s, selected files and visible editor text change; the 13.33s frame labels a real file write. At 16.67s the selected Agent response is partially written and at 20.00s it is complete. | MC has source-reported file metadata and discrete reports, without authenticated file-content or terminal streams. | Stronger motion and highlight only for already-validated selection/appended reports. Live typing and code streaming remain unavailable; no fake progress or repeated idle activity is added. |

## Behavior and limits

On desktop, click Files to increase the lower centre pane, Evidence to widen the inspector from 340px to 480px, Reports to enlarge the report stage, and Overview to restore the original proportions. All four panes, the project/task/Agent band, delivery qualification and critical blocked/approval state remain visible. The chosen view survives normal source refresh for its project/track and has no stored private data. Mobile keeps existing native pane tabs; task/event/file selection uses the same validated source motion. Reduced motion uses instant reflow, cancels in-flight selection effects and does not replay old facts when restored.

The animation uses the current DOM only; no previous private-content screenshot or clone is retained. The existing Owner, source confirmation, tuple identity and five-minute final-frame checks remain unchanged. Stale, refused, empty and disconnected inputs do not gain activity animation. An unchanged report does not replay movement. Idle remains still. This is interactive pane and real-update motion, not evidence of a live Agent runtime.

## Verification and integration

Native Chromium before and after WebMs, screenshots and receipts accompany the source patch. Before footage is actual canonical `8448252` UI captured before edits. After footage includes the new pane controls and the existing task/file/history interactions over synthetic or intercepted inputs. No external request or write was sent. Browser assertions measure intermediate reflow geometry, preserved task facts/focus, four-pane visibility, reduced-motion cancellation, three languages, 1440/390 widths, validated new events, historical-file qualification, rapid selection, Owner refusal and disconnect cleanup. Real Owner, served Preview and Joey device acceptance remain with the sole writer.

Only presentation code and tests change. `src/reporting/workbench-motion.mjs` changes the visual keyframes/duration; its selection/source/freshness guards and report contract remain intact. No Auth, report storage, backend, schemas, run records, capacity or deployment settings change. The generated Owner client is excluded from the source commit and must be rebuilt by the writer.

Fetch and cherry-pick the final supplied commit, then run `npm run build`, `npm run verify:portable`, and `MC_VISIBLE_MOTION_QA=1 MC_WORKSPACE_MOTION_QA=1 node tests/browser/dynamic-workbench-qa.mjs`. Run existing workspace focus/candidate, disclosure/delivery/privacy and Joey navigation checks. The writer should publish the integrated fixed Preview and give Joey the actual test URL. This UI writer did not push the canonical branch, merge or deploy.

## Canonical integration checkpoint

Sole writer integrated bd82f14 on canonical parent84482523; the pinned SDK and reporter bundles were rebuilt. Combined portable986 passed, zero failed/cancelled/skipped and zero forbidden workstation attempts. Browser motion6, focus6, candidate6, privacy2, delivery6 and selected-task disclosure/theme6 passed serially with bounded subreapers. Native CSS transitions are paused and sampled at110ms to verify intermediate geometry under recording load, then finished; the460ms duration, preserved facts/focus and reduced-motion instant behavior remain asserted. The recorded canonical Chromium clip and PNGs are consumer-local under `/workspace/mc-recovery/rolling-eleven/motion/visible-controlled/`; no external transfer is implied. Evidence receipts are in the adjacent QA folder.

The default completion test was corrected to assert the latest timestamp beside Latest task report, its existing UI location, against the inspector's original ISO source record. No production timestamp behavior changed. The legacy arrival assertion now uses the already-existing mc-reported-event-arrival CSS name. Neither assertion was removed.

Publication receipt follows outside this source commit. Fixed Preview only; report HEAD/eleven current records, existing callback/Owner guards and Production must be read back. Provider READY proves publication; real served Owner/email-link/TOTP/device acceptance remains pending because this executor's direct Preview connection is denied before application access. Journal work remains a local, unapplied, not approval-ready draft.

Final default theme1 and retained-evidence denial2 passed. Initial navigation timed out at90seconds partway through its nine-case matrix; a bounded220second retry is recorded separately. An extra old Joey overview fixture failed because it reads worker text using innerText inside the now-closed project overview disclosure; this fixture also targets the preceding links layout. It is not included in the motion PASS count and was not altered to hide the failure. Current composition navigation and task focus/disclosure checks are the applicable presentation checks.

The bounded navigation retry passed all9 cases /54 project-track checks, zero private requests/writes/external requests. Callback and password recovery HTML, shared session custody source, Vercel configuration and dependency lockfile are byte-identical to84482523. Native video metadata: VP8,1440×900,17.04seconds. Final source/build/live-eleven results are recorded alongside publication below.

The redundant final subset first exceeded60seconds during its real-Git retained-evidence case (zero assertion failures before timeout;3 remaining files cancelled by timeout). The same assertions are rerun serially with a150second bound, not removed. The already-completed combined986 suite remains the complete-suite receipt.

Final unchanged subset39 passed with zero failed/cancelled/skipped and no forbidden workstation attempts; duration70.25seconds.

Fresh build passed. Actual Git production reader verified unchanged report head bc3d76b1af577d793d77e2a53fc1bd66575c9251, eleven original current blobs, active Magic Link run and all29 original retired bodies recoverable. No report write or new run.
