# Linked Development Workspace motion

Source branch: `codex/mc-workspace-linked-motion-20261011`.
Base: `d29123b0599a92ec19386f2414b8f44c91f9ed93`, including the canonical writer's creation preflight. Earlier isolated checkpoints remain on `codex/mc-workspace-motion-20261011`; integrate the final source commit from this branch once, rather than those preparatory commits.

Choosing an Agent/task, manifest file or reported event gives the newly rendered, visible linked panes one coordinated 180ms fade and 3px arrival. Each pane uses the same existing validated run/event/file selection. The current selection renders immediately; there is no old-content snapshot or delayed source change. Rapid choices cancel pending and active effects, leaving only the final selection. The compact summary, native disclosures, Joey View and reference palette stay in place.

Initial/identical reads remain still. A real appended, validated report can produce an arrival cue only while its run is fresh and its event time (and explicit file observation time, when present) is within five minutes and not in the future. Stale, denied, empty, disconnected and unconfirmed states cancel motion. Unread counts and original report timestamps retain their existing meaning. Selecting dated history is a navigation cue over currently verified source metadata; its dated qualification remains visible and it receives no new-report highlight.

A selection intent lasts at most two seconds across a transient source/session recheck and must still match the current tuple after verification. Refusal and expiry discard it. Each mount has a cleanup token because the workspace mounts its replacement before disposing its predecessor; outgoing cleanup cannot cancel the replacement frame. Reduced-motion changes cancel queued and active effects immediately. Hidden mobile panes do not animate; missing Web Animations/requestAnimationFrame support keeps the immediate render.

No Auth, onboarding/task controllers, database, report contracts, source allowlists, transport or deployment changes. File rows still require the existing explicit v3 metadata/manifest; unobserved files remain unobserved. There is no terminal stream, source editor, fabricated diff or invented runtime. Reported completion still leaves independent verification and Joey acceptance pending.

## Reference inspection

Both supplied PNGs were byte/hash checked and pixel-inspected before the earlier palette work, which is included in this base. The exact supported Reddit reference was read at <https://www.reddit.com/r/ClaudeCode/s/6DtHhn3Dqu>. Actual frames from the permitted author alternative <https://github.com/steventsvik/GhosttyEXTREME/raw/custom/images/readme/demo.gif> were also inspected (1200×676, 329 frames, 4,345,262 bytes). That GIF is an author alternative, not proven to be the same Reddit clip. It informed the restrained session-selection cue, without importing terminal/editor content. Original PNG/GIF bytes remain outside Git and the QA package.

## Verification

- `npm run verify:portable`: 897 passed, 0 failed; build/schema/static safety passed; portability forbidden attempts 0.
- `MC_WORKSPACE_MOTION_QA=1 node tests/browser/dynamic-workbench-qa.mjs`: 6 cases at 1440/390 in zh-TW/ko/en. Native animations are observed rather than mocked. Includes keyboard focus, rapid final selection, task/file/event linking, dated history, honest unobserved files, changed reduced-motion preference, idle rereads, real appended reports, stale data, disconnected source, empty scope and Owner refusal.
- Existing file navigation, follow/unread, v1/v2 delivery and compact disclosure/reference theme cases: 6 each, 24 total.
- Existing handoff dialog privacy/cancellation: 2. Existing simple Joey takeover: 4.
- Total browser cases: 36, no external requests or writes. These use the actual app/source bundles, official SDK and server factories with synthetic Owner/source/clipboard data. They are not served Preview or real Owner acceptance.
- Screenshots cover task selection and linked file history at both sizes in all three languages. Native Chromium desktop recording: VP8 WebM, 1440×900, 5.64 seconds. Recording is an actual fixture run, not a reconstruction.

The machine-readable receipt is `docs/qa/mc-workspace-motion-20261011/receipt.json`. Screenshots, recording, logs and a portable patch are supplied separately from source.

## Integration by the sole canonical writer

Fetch this private source branch and cherry-pick its final commit after functional work. Only seven source/test/documentation files are included. Resolve any later workbench renderer overlap against the writer's current implementation. The generated `public/owner-auth-client.js` is deliberately excluded: rebuild from the integrated source so newer preflight/Auth/controller code is preserved.

```sh
git fetch origin codex/mc-workspace-linked-motion-20261011
git cherry-pick <final source commit SHA supplied with the handoff>
npm run build
npm run verify:portable
MC_WORKSPACE_MOTION_QA=1 node tests/browser/dynamic-workbench-qa.mjs
```

Native recording is optional (`MC_MOTION_RECORDING=1`) and needs Playwright's ffmpeg executable. It does not affect ordinary QA. This environment used `/usr/bin/chromium` and a workspace-local ffmpeg link, with no new credentials or private network. No canonical push, merge or deployment was performed. Real served Owner/Joey acceptance remains for the canonical writer and Joey.
