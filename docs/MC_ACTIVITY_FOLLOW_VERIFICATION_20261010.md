# MC selected-run activity follow — verification

Recorded: 2026-10-10T23:36:49.207195Z. Actual Agent: Codex; model UNKNOWN. New bounded run codex-mc-activity-follow-20261010, predecessor codex-mc-dynamic-workbench-20261010; terminal predecessors unchanged.

## Implementation and four review regressions

The scoped activity model consumes validated v1 report events only. Selected run stays fixed when another run receives progress/blocked evidence; transcript/Explorer/detail/graph show the selected run. New other-run events get deduplicated unread hints. Manual event history, upward wheel/key/touch reading pauses follow; explicit resume selects the latest event. Follow scrolls the visible transcript only when a selected-run event arrives or the user resumes/selects a card. Repeated polls preserve reading and do not steal focus or replay arrival motion; reduced-motion suppresses animation. Historical card navigation remembers the clicked run, then fresh source/report gates qualify the destination; a missing run never silently selects another.

- Close/Escape/scope/Owner/route-leave cancellation is checked before clipboard byte delivery, including the gesture-preserving promised ClipboardItem path. Dialog verification composes with the original source/report verifier instead of replacing it.
- Current and cached historical cards preserve clicked run identity instead of selecting globally newest activity.
- Denial/logout clears private selectedRun/selectedEventSequence host attributes and marks event host unconfirmed. QA reads host attributes directly.
- Browser Back from advanced to same-project simple disposes workbench/body dialog and cancels copy. Owner source reader can be reused without keeping the abandoned dialog alive.

## Actual checks

| Check | Result | Evidence limits |
|---|---|---|
| Portable unit/build/schema/safety | 727 PASS, 0 fail, forbiddenAttempts=0; build, validate, check PASS | Local repository code, no deployment during build |
| Two-run activity follow | 6 PASS: zhTW/ko/en × 1440/390 | Actual app/official SDK with synthetic Auth/GitHub/report bytes |
| In-flight cancellation | 2 desktop/mobile PASS for promised ClipboardItem and 2 for writeText; all five cancellation actions; zero delivered clipboard payloads | Synthetic clipboard, no real Safari/iPhone claim |
| Dynamic workbench lifecycle | 6 PASS plus final 2 PASS; real visible 30-second poll exercised; no initial/unchanged/history replay; reduced-motion checked | Synthetic upstream, zero external and application write calls |
| Reading/focus | 12 PASS | Actual app fixture, zero external/mutation requests |
| Existing fresh-copy gate | 4 width cases PASS | Owner/source/report loss, candidate/history/reload, fallback and pending switch use synthetic upstream/clipboard |
| Original four-source Continue regression | 12 PASS | Buddy fresh Continue, Asset candidate track, Back/Forward/reload, source HEAD drift/outage/expiry/revocation/pending switch; zero external/writes |
| Reference geometry | 5 PASS | Actual current renderer/CSS with synthetic state |
| Final current handoff + projection/activity/delivery guard | PASS | Safe-content and strict v1 contract remain unchanged |

Private synthetic screenshots: [desktop](qa/mc-activity-follow-20261010/activity-1440.png), [mobile](qa/mc-activity-follow-20261010/activity-390.png). Both visually inspected; no document overflow, selected blocked-run detail and graph retained. Images stay outside public/dist. The public reference animation was inspected in the previous stage; no original/private reference asset or reference code is uploaded.

## Evidence and authority boundaries

Strict mc.repository-run.v1 is unchanged: tests reject new result.delivery fields, caller MC_VERIFIED, credential URLs and a made-up v2. A coding-completed run remains terminal; follow-up is a distinct predecessor-bound run. Deployment/N/A prose does not upgrade pending delivery evidence. Git byte verification, provider READY, exact mutable alias observation and served/Owner test are separate observations. Historical stage-1 alias receipt is explicitly historical after later publications. A trusted future delivery observation requires repo/track/code SHA/deployment ID/URL/time and an independent verification source; no arbitrary caller URL fetch.

No SQL/schema/data migration, new endpoint/schema/storage, external Agent hook, telemetry collector, token/permission, Production or other repository/report change. Current allowlist cannot supply arbitrary private file/diff/tool telemetry; enabling expanded GET paths or Agent collector hooks needs explicit approved action/target/policy. Current stage completes without those capabilities. Joey product/appearance, real clipboard/device and served fixed-URL acceptance remain pending. Existing CONNECT403 occurs before app access; do not bypass it.

Exact functional publication and qualified provider receipts are recorded in MC_ACTIVITY_FOLLOW_DELIVERY_RECEIPT_20261010.md and current HANDOFF. Agent report is AGENT_REPORTED and never becomes MC_VERIFIED through this document.
