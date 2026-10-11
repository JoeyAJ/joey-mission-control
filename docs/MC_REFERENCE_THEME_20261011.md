# Pixel-inspected reference theme

Baseline: `95d850f6779089cd6e6d61863c7079e8065cdcf1`, fetched from the current
canonical branch after the disclosure, task-storage and PR/CI stages were integrated.
Delivery branch: `codex/mc-workspace-palette-20261011`.
Earlier isolated source checkpoint: `246d8c1` on the local theme checkpoint branch.
The delivery commit contains the complete theme change relative to this baseline;
cherry-pick that one commit, rather than the earlier checkpoint.

## Reference inspection and implementation

Both supplied original PNGs were decoded locally through the authorized private
GitHub UTF-8/base64 asset workflow, checked against exact original bytes/hashes and
actually viewed before this visual increment. The color reference is 92,059 bytes,
SHA256 `ef434c30d244c6e3c353302f10a9ba0823591c3d1d9b27071ac84cb5db0a4f72`.
The overloaded UI reference is 1,533,770 bytes, SHA256
`ec51b742a97d88a2c78aad42778aa0e4d864f8892e8377b6e0ec44001c2b1f4d`.
The original PNGs and ASCII payloads remain outside the repository.
The earlier Library/binary-wrapper failures are history; no denied CLI route was retried.

Measured original palette: charcoal `#1A1A19`, cyan `#24D3EF`, periwinkle
`#818CF8`/`#A5B4FD`, magenta `#E979F9`, outlines `#5588A2`, separators
`#475569`, white primary button with dark `#0B0B0B` text. The current Joey View and
workspace use these as scoped tokens. Cards have 14–16px corners; gradient accents
are limited to heading separators. Cyan identifies selection/focus, magenta marks
explicit blocked/failed reports and new file observations. Colour does not establish
liveness, approval, or delivery verification.

The four existing panes and integrated disclosures keep their actual controllers,
Owner/privacy/freshness clearing, selected historical run/current-project distinction,
v1/v2/v3 delivery qualification, task persistence and PR/CI inspection. Long task
titles retain two-line disclosure with a compact decorative chevron and full native
keyboard/tap expansion. No editor, terminal, file contents or live status is invented.

Linked selection colours transition for 160ms. Existing validated new-event IDs
alone receive the one-shot 800ms arrival highlight; unread/follow/pause and file
observation bindings are unchanged. Reduced motion suppresses those transitions and
animations. No pane geometry, source profile, API/Auth/SQL/report contract, credential,
repository permission or deploy behavior changes.

## Verification and integration

[Source-only receipt](qa/mc-reference-theme-20261011/receipt.json): 840 portable
tests passed with build, schema validation and static safety; forbidden workstation
attempts zero. Six 1440/390 × zh-TW/en/ko disclosure/theme cases passed, checking
actual rendered contrast, cyan keyboard focus, white/dark primary action, four
charcoal panes, 44px mobile disclosures, reduced motion and no horizontal overflow.
Minimum sampled text contrast was 8.74:1; sampled control-border contrast was 9.65:1.
These sampled checks are not a claim of a complete accessibility audit.

Six event-follow cases proved real new report ID binding, no unbound animations and
reduced-motion suppression. Existing delivery 6, file-navigation 6, cancellation/
privacy 2 and simple takeover 4 cases passed during the increment. Matching baseline
style comparison 6 cases and before/after screenshots were captured with the actual
app/official SDK and synthetic Owner/source/clipboard. External browser requests and
API mutations were zero. This is local implementation evidence, not served Owner,
physical-device, same-clip fidelity or Joey final appearance acceptance.

After the sole functional writer cherry-picks the delivery commit, run:

```sh
npm run verify:portable
MC_SELECTED_TASK_BRIEF_QA=1 MC_REFERENCE_THEME_QA=1 node tests/browser/dynamic-workbench-qa.mjs
MC_ACTIVITY_QA=1 MC_REFERENCE_THEME_QA=1 node tests/browser/dynamic-workbench-qa.mjs
MC_DELIVERY_QA=1 node tests/browser/dynamic-workbench-qa.mjs
MC_FILE_NAVIGATION_QA=1 node tests/browser/dynamic-workbench-qa.mjs
MC_DIALOG_CANCEL_QA=1 MC_DIALOG_PROMISED=1 node tests/browser/dynamic-workbench-qa.mjs
node tests/browser/joey-simple-takeover-qa.mjs
```

Use the environment's existing Playwright or set `MC_PLAYWRIGHT_MODULE` to its
absolute installed module path; Chromium is expected at `/usr/bin/chromium`.
`MC_BROWSER_SCREEN_DIR` separates output sets. For reproducible comparison, set
`MC_REFERENCE_THEME_BASELINE` to the exact baseline above: only that verified CSS
asset is replayed through the local fixture, with current functional code retained.
The source commit includes neither private reference files nor screenshot/artifact
bundles; screenshots and logs accompany the separate evidence package.
