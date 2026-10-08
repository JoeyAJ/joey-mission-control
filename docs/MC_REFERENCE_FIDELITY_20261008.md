# Inspected reference fidelity pass, 2026-10-08

Joey reported that pane count alone did not match her reference. This change
reduces chrome and spacing, matches measured column proportions, uses a compact
warm console palette and a split inspector/graph, and applies the same frame to
all four existing projects. Sparse source records stay sparse; no agent, tool,
usage, file-operation or runtime event is invented to imitate the video.

Actual fixed preview baseline verified with authorized Vercel/GitHub reads:
`cfb3d7e20dae2e2ecc39e8efe1adb4bc1d8a6a00`, READY deployment
`dpl_7avtGDPjMh2fsJvj5UeowEjdM7iS`. Branch is
`codex/mc-command-center-checkpoint-20261006`. Local revision was prepared in the
isolated `codex/mc-reference-fidelity-20261008` worktree, without editing the
supervisor candidate or another writer's worktree.

All three 872×512 frames from private reference commit
`dfa1cfc7843a02d9cd6935911426eea5482d06fc` were viewed with `view_image`, and
their exact manifest hashes verified. Frames remain outside public/build output.
The unchanged cfb app was actually rendered at 1440×900, 870×512 and 390×844
before editing; matching after captures were inspected. These are local Chromium
renders of the deployed source/public snapshot, not claimed remote Auth pixels.

## Acceptance criteria and measured result

| Criterion | Before | After / requirement |
| --- | --- | --- |
| 1440 workspace pane start | y=169.5 px | y=77 px; ≤80 px, with Owner entry still 44px |
| Column shares | 14.7 / 38.8 / 12.6 / 33.8% | 19.2 / 33.2 / 15.4 / 32.2%, within 0.3 percentage points |
| Context graph share | approximately 35% | 51%, accepted 49–53% in default context mode |
| First project card | 76 px | 68 px; narrower desktop cards remain bounded |
| Desktop content type | 12px with larger summaries | 11px mono content / 9px secondary labels, tighter line spacing |
| Explorer / file tabs | spacious boxed rows | compact rows and flat tabs; actual source selection unchanged |
| Palette | green panels / large highlight surfaces | near-black transcript, warm olive/beige selection, muted unknown state |
| Narrow desktop toolbar | labels consume room | labeled accessible icon controls; icons remain visible at 870px |
| Mobile | source/header rows consume height | no horizontal or vertical viewport overflow; Owner/main touch controls ≥44px |

The first draft at y=63 was revised to retain the existing 44px Owner entry
acceptance requirement. Pixel identity with the reference is not claimed: MC
contains verified historical records and protected Owner entry; the reference
shows live terminal output, usage meters and a larger file graph that MC does not
currently possess. No fake status, speculative data or dummy content fills that
gap. A reference-sized top strip is not allowed to break the existing login flow.

## Validation

- Full portable suite: 486 PASS, 0 FAIL; build, five schemas and static safety
  checks PASS, forbidden workstation access attempts 0.
- Visual/interaction audit: 48 cases across four projects, four widths
  (1440/870/390/320) and three locales; project ratios, graph split, viewport
  bounds, accessible toolbar, keyboard selection and reachable Owner drawer PASS.
- Workspace reading continuity: 12 cases PASS, including focus, independent
  scroll, refresh failure, history, project switch and mobile panel state.
- Historical file graph: 12 cases PASS using the actual approved 16-file Git
  comparison; paths/diff bytes, keyboard selection, history/reload and public
  withholding preserved.
- Owner SDK lifecycle: 9 synthetic cases PASS, zero network requests; mounted
  form/focus/session lifecycle unchanged. Actual Owner login/AAL2 is not inferred.
- All browser checks: zero external requests and zero API mutations. Source API,
  Auth/config/bundles, deployment settings and real project data are unchanged.

Before/after screenshots, measured geometry, four-project screenshots, audit logs
and the private side-by-side HTML are in `/workspace/mc-deliverables` and are not
published as assets. Only the reviewed presentation patch and this private source
handoff are committed. Publish by ordinary fast-forward push to the existing
fixed preview branch; verify exact SHA, READY and enabled SSO. Production anchor
remains `8b4945b16a0b23f2e72033aa976fa34f94eabec0`.
