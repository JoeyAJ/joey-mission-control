# Reference-inspected command workspace

The executor viewed all three private reference PNGs (02s, 18s, 34s) with
`view_image` and verified their manifest hashes at source commit
`dfa1cfc7843a02d9cd6935911426eea5482d06fc`. Images stay outside public assets;
no reference-branch configuration was merged.

The workspace now uses persistent desktop project sessions, a compact recorded
work transcript, a separate Explorer, and a split source inspector / relationship
graph. Explorer and graph select the same scoped loaded evidence. The graph
shows evidence relationships, without implying current file operations. Historical
MC comparison has its own explicit scope; public Explorer has no private files.
Mobile retains project/events/context panels and URL/history/reload selection.

This changes presentation only. Public source summaries remain fixed recorded
snapshots. Owner-authorized private read and qualified handoff remain separate.
No working agent, tool stream, runtime connection or P3 writer is fabricated.
Owner Auth/Recovery bundles, SDK config, API, CSP and deployment config are
unchanged from 13bc7fb. Existing four-project Owner read acceptance predates this
visual stage; new-stage browser evidence is local/synthetic.

Validation: full portable suite, build, five-schema validation and static checks
PASS with zero forbidden workstation reads. Browser checks cover 1440/870/390/320,
three languages, column placement, Explorer/graph linkage, public file withholding,
selection/history/reload and one-viewport containment. Cold startup/deep links
PASS at 1440/390/320. Owner SDK lifecycle and private read/continuation regressions
PASS in nine synthetic cases each, with zero live Auth/DB requests. Safe public
screenshots and complete logs stay in /workspace/mc-deliverables outside Git.

Publish only by ordinary push to the existing preview branch. Verify exact SHA,
READY, fixed alias and SSO; preserve the existing production SHA. Protected remote
pixel acceptance remains the task-owned Mac's authenticated verification.
