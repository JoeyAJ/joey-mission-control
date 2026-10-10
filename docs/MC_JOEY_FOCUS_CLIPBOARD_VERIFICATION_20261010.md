# Active-view focus and gesture-preserving copy verification

Baseline: `e1995cc7b6337fb0ddcca0f835c00633cd249f1b`.

## Reproduced problems

Parent review identified focus/observation-expiry calling renderWorkspace unconditionally. Before-fix actual-app test failed: simple Joey had zero Owner entries after focus because the singleton was moved to hidden Workspace. Reproduction log: `/tmp/mc-joey-focus-before.log`.

Joey actual iPhone feedback at 03:44 UTC reported auto-copy falling back to text selection. She explicitly required one tap at 03:45. The previous implementation waited for remote reads before invoking writeText, which is compatible with loss of WebKit gesture qualification. The exact browser/in-app runtime cause is not established by this cloud worker; no assumption that Joey needed to enable permission is made.

## Official technical basis

WebKit explains that Clipboard write must begin in a user gesture and ClipboardItem data can be supplied as a promise: [Async Clipboard API](https://webkit.org/blog/10855/async-clipboard-api/). Its engine bug discussion specifically explains the await/user-activation distinction and immediate write with promised item data: [WebKit 222262](https://bugs.webkit.org/show_bug.cgi?id=222262). The deployed repair uses that standard API path; it does not request or bypass browser permissions.

## Implementation

Focus and observation-expiry use refreshActiveView. Workspace rendering is guarded by its active view, preventing background DOM ownership theft. Actual visible project scope is asserted on the separate proposal route; hidden stale Workspace placeholder metadata is not treated as current project state.

The transport starts clipboard.write with a text/plain ClipboardItem promise synchronously during the click. Existing fresh refresh + Owner authorization/handoff + immutable tuple/track/generation checks occur before resolving the text promise. No fresh FOUND packet means rejection and no clipboard payload. Post-write current state must still match before UI success. Write rejection or unsupported APIs retain explicit manual fallback. A button selects the entire readonly instruction; instructions describe system Copy, without claiming permission is unconfigured or copy succeeded. Source changes, denial/expiry/switch/lifecycle still clear the private fallback.

## Tests

Actual-app browser fixtures exercise 375/390/430/1440 with signed-out focus (same form/values), verified focus, blur/tab return, public refresh plus observation expiry, private source refresh, Workspace↔Joey/history, delayed fresh copy while focus fires, denied/unsupported APIs, gesture-only writeText behavior, full-text selection, pending-copy project switch and existing source/authorization/candidate privacy regressions. Native clipboard fixture requires invocation in the click task and consumes the promised Blob only after fresh resolution. Clipboard success is recorded only after API fulfillment. Auth/repository/clipboard are synthetic, not real-device evidence.

Reports: `/tmp/mc-joey-focus-clipboard-after.json`, `/tmp/mc-joey-focus-clipboard-continue.json`, `/tmp/mc-joey-focus-route.json`, `/tmp/mc-joey-focus-status.json`. Full portable report: `/tmp/mc-joey-focus-clipboard-portable.log`. Local screenshots: `/tmp/mc-joey-simple-screenshots`. Current results and release identity are appended after completion.

## Remaining runtime qualification

Actual iPhone copy success after this repair is unverified and remains for Joey's acceptance after parent notification. No repeated attempts, installation or pairing are requested during development. Known HTTPS CONNECT403 remains unbypassed; connected GitHub/Vercel SHA/READY/alias evidence establishes deployment identity only. Production and all other authorized-scope exclusions remain intact.

## Completed local checks

660/660 portable tests PASS, with official bundle build, schema/fixture validation and static safety. 21 final formatter/root-entry checks PASS. Final simple browser: 4/4 widths PASS; 212 private fixture reads, 756 synthetic GitHub reads, zero external requests/unexpected writes. Twelve four-source Continue cases PASS (243 fixture reads / 921 synthetic GitHub reads); three route cases PASS; 24 qualified-status cases PASS. Full before/after focus reproduction and click-task promised payload assertions are included. Current iPhone/Owner runtime remains unverified.
