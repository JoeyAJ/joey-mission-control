# UI module navigation review candidate

Base: `9bad17b98fbf557dcc66f5667b2c8c1461e31e08`
Isolated private branch: `codex/mc-ui-module-navigation-20261012`
Early local checkpoint: `ba5e96693afb6341f7b2bd00939b7048a11d7476`

JoeyView now has Overview / Tasks / Sources shortcuts that focus and open the existing native disclosures. Task/project creation uses the original guarded controls in one clearly labelled area; opening either form keeps both entry buttons together and the form uses the full card. Workbench mobile controls have clearer selection, 44px touch targets and Arrow / Home / End keyboard navigation. Desktop retains its existing workspace toolbar and four-pane composition.

Actual supplied color and overloaded-UI reference PNG pixels were inspected from this consumer workspace before edits. The charcoal, cyan, periwinkle, magenta and thin-outline treatment is retained. The author GIF was inspected as an alternative reference, not represented as the inaccessible Reddit clip.

Production source delta:

- `public/joey-takeover.js`
- `public/command-workspace.js`
- `public/styles.css`

No database/auth/report contract, registry activation, provider binding, source collection, graph model or event-motion code changed. Current-project continuation and selected historical run remain separate. Blockers, Owner decisions, stale/unconfirmed status and reported-delivery qualifications remain visible. Reduced motion disables the added transitions and smooth navigation. Creation controls remain unavailable outside their existing supported private entry.

## Verification

Local Chromium uses the actual app and official SDK with explicitly synthetic Owner/Git/report providers. These checks do not establish actual Owner acceptance, provider execution or served Preview delivery. Every browser receipt reports zero external requests and zero unintended writes.

- Site/module navigation: 9 viewport/language cases, 54 project/track scope checks; 1440 / 390 / 320px, zh-TW / en / ko.
- Task entry: 3 cases at 320 / 390 / 1440px, plus module/creation checks in all three languages per width. Login refusal, focus, repeated input preservation, changed scope, expiry and private clearing pass.
- Project creation: 4 cases at 375 / 390 / 430 / 1440px; packet/download/import, copy, existing-source conflict, outage, expiry/revocation and pending logout pass. Final 390px rerun passes after creation-row alignment.
- Workspace focus/composition/toolbar: 6 cases at 1440 / 390px in all three languages. One selected overview, mobile module keyboard controls, persistent project action, current versus dated task, visible blockers, disclosure/focus restoration and refusal clearing pass.
- Real graph: 6 cases; source-backed node/edge membership and event order, drag updating edges, mouse/keyboard pan, button/wheel zoom, graph selection preserving details, unobserved-file qualification and denial purge pass.
- Event-linked motion: 6 cases; real appended event only, no idle replay, task/file/history selection, last rapid selection, preference change cancellation, stale/disconnected/empty/refused states and reduced motion pass.
- Local motion video: additional 1440px zh-TW case passes; 12.44s WebM captured using the already installed system encoder through a temporary local Playwright cache. No package download or installation.
- Syntax / diff whitespace / build / schema validation / static checks pass.
- Portable suite: **1078 / 1079 pass; one inherited canonical failure**, detailed below.

Two existing browser assertions were repaired: toolbar geometry now checks the actual vertical mobile arrangement; the negative expiry/revocation check invokes the guarded synthetic handler even when proactive expiry has already hidden the button. Ordinary successful creation/copy flows still use real pointer clicks.

## Canonical blocker reproduced without UI changes

Untouched detached `9bad17b` reproduces 18/19 in `tests/remote-handoff-adapter.test.mjs`, failing “the root entry is an attributed document checkpoint without runtime or model authority”. Canonical `HANDOFF.md` is **67,397 bytes**, above the existing **65,536-byte** reader bound; direct reader output is `TOO_LARGE`. The newest top checkpoint also lacks the structured Timestamp/developer/sections expected by the reader and uses a status outside that existing test's allowed set. The UI branch leaves the document and reader contract unchanged. Canonical writer should repair the current root checkpoint and archive dated content while preserving the size/privacy guard, then rerun portable verification.

## Consumer-local evidence

Root: `/workspace/mc-ui-module-evidence/` (not uploaded; paths do not transfer between consumers).

- `task-entry/1440-en-module-navigation.png`, `task-entry/390-en-module-navigation.png`
- `task-entry/390-task-entry-buddy-verified.png`
- `project-entry/1440-new-project-start.png`
- `focus/1440-en-after-blocked.png`, `focus/390-en-after-blocked.png`
- `network/1440-en-compact-network.png`, `network/390-en-compact-network.png`
- `workspace-linked-events-1440-zh-TW.webm`
- `site/receipt.json`, `task-entry.json`, `project-entry.json`, `project-entry-final-390.json`, `focus/receipt.json`, `network/receipt.json`, `motion/receipt.json`, `animation/receipt.json`
- `portable-verification.log`, `baseline-handoff-test.log`, `build.log`, `validate.log`, `check.log`

The implementation agent inspected desktop/mobile screenshots locally. Independent visual review remains the parent's task; no remote reference pixels, screenshot package or private source artifact was uploaded.

## Integration

Fetch this isolated branch from the existing private origin, inspect the final source commit and cherry-pick it after canonical feature work. The early checkpoint commit is optional. Rebuild generated browser artifacts from canonical source, rerun the listed browser flags and portable verification after the root handoff repair. Resolve any frontend overlap against the writer's current version while retaining existing guards and graph/motion behavior.

No generated bundle is part of the review source delta. No canonical push, merge, manual deployment, auth/credential/service change or external package/upload was performed. A single normal push of the final isolated private branch is authorized; parent owns integration, activation and release.
