# Approved historical file review handoff

The approved real comparison API returns sixteen bounded files without a summary
object. The published Explorer assumed summary.changedFiles and failed to render
the whole Workspace when that actual private response loaded. Baseline browser
reproduction on0a32eae confirms this failure without exposing source content.
The new stage fixes the shape mismatch and completes one historical review
flow: Explorer ↔ compared-file tabs/path ↔ literal numbered diff ↔ file graph.

Branch:`codex/mc-historical-filegraph-20261007`.
Parent:0a32eaefa79173a5e8ed3b155ccd15c3f1373ef9;
parent tree:1ae9eb345a4e3e5d3bd529ec632943bca7b9abca.
Exact final source/tree, push/fetch-back, candidate/fixed READY and SSO receipts
are external in `/workspace/mc-deliverables/historical-file-review-checkpoint.json`.
The same fixed preview branch/alias is retained; production stays8b4945b.

Source scope is unchanged: actual MC historical Git comparison
8b478f0d8c017defdd2a5f5dab92ea9972479c78 →
91b171beddeddc2b69d26143fae5a2e4285f0539. All sixteen approved files are available.
The existing provider still caps each excerpt at200 lines/32KiB, git output256KiB,
and execution5s, with no external diff/textconv or arbitrary ref/path request.
No new file read, provider, endpoint, Owner login, SQL, credential or writer exists.

Private local review uses the already loaded files. MC comparison membership
stays separate from the selected project's source evidence. Folder/file edges
represent recorded path membership, not dependencies or operations. Selecting a
node opens its same bounded diff and highlights its Explorer/tab/graph ID.
Graph/Explorer mode preserves a selected historical file through mobile panels,
URL, Back/Forward and reload. Only the chosen graph pane scrolls to keep a focused
control visible when changing from full graph to split diff. File selectors retain
horizontal position and show the selected file. No private content is added to
reading-state storage; it remains transient numeric geometry and ID matching.

Diff text is rendered as literal text nodes. Old/new line offsets derive only
from valid unified hunk headers; malformed/unavailable offsets remain absent.
Added/removed/context/metadata markers do not change the exact source bytes.
Tabs mean loaded comparison files, not fictitious open editor sessions.
The public graph uses only the pre-existing approved areas/count/range; no
private filename, source or diff appears in public API/build assets/screenshots.
Public current agent stays unknown/runtime disconnected.

Verification: real app/controller/static handler and actual fixed Git source,
1440/870/390/320 ×zh-TW/en/ko, twelve private+public cases. Checks cover the
actual crash reproduction, all16files, exact selected bounded text, tabs/path,
graph/Explorer/diff linkage, far-node keyboard visibility, modes/history/reload,
read failure retention/recovery and public withholding; external requests0/API
mutations0. Six focused diff/source tests include literal XSS-shaped source,
real hunk offsets and malformed offset refusal. Portable486 plus build/schema/
validate/static safety and forbidden workstation reads0; reading-flow12 and
protected Owner helper9 synthetic cases are separate preserved regressions.
Exact completed results/digests are recorded in the external checkpoint.

Private source is neither printed nor screenshotted by this QA. Only public-safe
screenshots at1440/390 are saved outside Git. Reproduce with pinned existing deps:
`MC_QA_OUTPUT=<private-output> node tests/browser/historical-filegraph-qa.mjs`;
`npm run verify:portable`; existing reading/Owner guarded browser scripts.
Before-fix mode uses MC_QA_FILEGRAPH_BEFORE=true against the actual parent source.

The complete requirement/evidence/blocker/visual map is
[MC_FINAL_REQUIREMENTS_GAP_MAP.md](MC_FINAL_REQUIREMENTS_GAP_MAP.md).
Owner fresh corrected projection smoke remains Transport closed; submit=false.
Real current-task event producer, canonical writer/cutover/sync and supported
execution adapters remain missing. The source-backed historical review is not
live code execution, true Owner/AAL2 acceptance or final target completion.
