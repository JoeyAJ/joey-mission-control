# Isolated visual refinement checkpoint

Status: BLOCKED_BEFORE_VISUAL_EDITS. This document is a preparation checkpoint,
not a delivered visual refinement, served verification, or Joey acceptance.

Joey authorized simultaneous UI and functional work at 2026-10-11 07:27:05 UTC.
The UI checkout is `/workspace/mc-ui-refinement`, branch
`codex/mc-workspace-visual-20261011`. It was cloned with independent Git objects;
the functional checkout was not edited. Actual fetched baseline was
`cd6ae579720192cc2bd55dbd0497be7caa10c0c6` on
`codex/mc-command-center-checkpoint-20261006`, newer than the supplied
`dc0a64fa16f57753cf87a2a62e2e0ee829a8459e`. Early local checkpoint is
`f90703a2a7ba129eb528d6ef609d88cfd1aef8f3`.

## Required pixels remain unavailable

The current Library skill and its unchanged transfer helper were read from the
current skill source. Consumer-local materialization was prepared for the exact
supplied Library IDs. Both original transfers and one supported fresh retry
failed with `library file transfer failed: download failed`. No downloaded
image bytes are readable in this environment. No storage address was guessed,
parent path substituted, or access block bypassed.

Library `image_file` reads returned metadata, asset pointers and descriptions,
with no inline image pixels. These descriptions are not pixel inspection.
The required references are:

- Color: `libfile_435715b4325481918744e3dd914b733a`, image/png, 92059 bytes,
  1026 by 772 according to Library metadata.
- Overloaded UI: `libfile_bc18570fc70c819188ae97daa8b2423b`, image/png,
  1533770 bytes, 2048 by 1486 according to Library metadata.

The exact [Reddit reference](https://www.reddit.com/r/ClaudeCode/s/6DtHhn3Dqu)
was accessible through supported browsing. Its author describes session status,
linked editor/repository activity and review context. The clip pixels were not
inspected. MC must retain its actual metadata capability: no invented terminal,
editor, diff, file contents, live status or implied execution verification.

## Source map for the authorized implementation

No AGENTS.md or applicable .agents/skills was present in the fetched checkout or
mounted .agents directory. AGENT_CONTROL.md, current HANDOFF, product charter,
current acceptance and the historical reference fidelity document were read.
This delegation's isolated-branch/no-publish scope overrides the historical
canonical-branch publishing instructions.

1. `src/reporting/selected-task-summary.mjs` renders the shared selected-run
   title, Agent/state/time, delivery grid, summary and full next step. Preserve
   its exact run/project/track binding and explicit independent/Joey PENDING.
   Once the supplied pixels are inspected, this is the primary place to keep
   the compact overview and move long evidence/next steps behind disclosure.
2. `src/reporting/workbench-view.mjs` repeats title/Agent/state/time in session
   cards, the selected summary and inspector. Keep one full overview, compact
   selectors, dated selected-event detail, and four truthful linked panes.
   Existing appended-event identities, follow pause/resume, unread hints,
   scope memory clearing, post-await Owner checks and current-project handoff
   must continue to use their existing controllers.
3. `public/joey-takeover.js` separately renders the selected-run brief, three
   history events, and project-wide latest reports. Keep the project-wide
   blocker/decision visible; put long history and duplicated result context
   behind explicit click/tap disclosure with scope labels preserved.
4. `public/styles.css` contains the historic olive console palette, simple
   view styling around lines 502–559, workbench rules around 561 onwards, and
   selected-task rules near the end. Apply the supplied charcoal/cyan/
   periwinkle/magenta palette only after pixel inspection. Keep mobile panels,
   focus/touch sizing, contrast and reduced-motion behavior.
5. `public/owner-auth-client.js` is a generated bundle. Rebuild through
   `npm run build` after changing reporting renderers; avoid hand-editing it.
   No database, Auth, report contract, transport or source-profile changes are
   part of this visual increment.

## Fresh baseline evidence

- Five focused regression files: 25 PASS, 0 FAIL. They cover selected-task
  v1/v2/v3 qualification, fresh scope, linked file/event selection and activity
  follow behavior.
- `npm run verify:portable`: 805 PASS, 0 FAIL, build/schema validation/static
  safety PASS, portability guard forbiddenAttempts=0. It uses local fixtures.
- Plain `npm run validate` lacks Joey's workstation canonical directory in
  this environment; do not retry it against private workstation sources.
  The portable runner's validation and check both passed.
- Existing selected-task browser QA: six PASS at 1440/390 in zh-TW/en/ko,
  external requests=0 and writes=0, against the unchanged baseline,
  using the actual app/official SDK and synthetic Owner/source/report/clipboard.
  Screenshots are baseline observations only, not an after state or actual
  served Owner/device acceptance. Final receipt is in the local deliverables.

No UI source change, canonical push, database/Auth mutation, deployment, merge,
new private network access or credential collection was performed. Resume from
this isolated branch when the exact supplied image bytes are readable in the
consumer environment; inspect those pixels before the first visual edit, then
run the selected-task, activity-follow, file navigation, delivery, simple
takeover and cancellation/privacy regressions at 1440 and 390 in zh-TW/en/ko.
