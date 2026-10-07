# Command Center current capability acceptance

Reviewed against `PRODUCT_CHARTER.md`, `MC_PHASE_PLAN.md`,
`COMMAND_WORKSPACE_CONTINUATION.md`, the three actual reference frames, and the
917d publication/readback receipt. The repo contains the operative product contract;
no separate newer PRD file was found. Joey remains Product Owner and Final Approver.
Published fixed preview: `917d7c1fd766b7694fe63e06db338cf765689280`.
Prepared follow-up is isolated; it does not replace the fixed preview during QA.

| Product capability | Implemented and verified | Implemented, awaiting actual acceptance | Unsupported or permission bound |
|---|---|---|---|
| Four-project workspace | Linked recorded sessions/events/context/graph; stable URLs/filter/history/reload; three locales; 1440/870/390/320 layouts; parent actual Mac pane QA | Final Joey usable-target acceptance | A project entry/history does not establish a current running agent |
| Private Owner context / Explorer | Existing authenticated read of all four frozen contexts verified on task-owned Mac; per-field source/time/missing reason; scoped continuation; purge on project/session changes | New-release phone route acceptance | Arbitrary private source/log browsing and continuous canonical sync unavailable |
| Proposal / result continuity | Management-only private append, one real proposal and result; CAS concurrency and exact replay; integrity export; authenticated read wrapper with Owner/AAL2/current session; parent actual Mac NEXAEON journal read PASS (one proposal + one result, revision2, pending Joey) | iPhone and two-device journal acceptance remain unverified | Autonomous agent/app write transport not granted; submitter attestation is not an Owner decision |
| Joey accept / reject | Existing local/synthetic exact-decision contracts retained. Isolated follow-up prepares exact in-memory choices using current Owner/AAL2 and immutable proposal/result bindings | Prepared UI browser checks only; no live final-decision test possible | Final decision RPC/store/grants, CAS and readback not approved or applied; canonical promotion/dispatch remain separate |
| Current work / tool / code events | Bounded isolated observer/reducer/store/replay/expiry and qualified parent task snapshot | A real bound producer trial has not run | Exact-task authenticated event feed unavailable; no fabricated live status or tool stream |
| Code / diff evidence | Approved fixed historical Explorer/diff and source revision qualification | No additional real event acceptance | Current file/tool/diff events require the missing producer; historical diffs cannot supply them |
| Any-agent handoff | Source-qualified private continuation, approved private Git checkpoint, bounded P3 custody export; raw private data excluded from public build | Restart handoff is document/custody based; new reader must verify current scope | Automatic dispatch, canonical writeback and continuous Mac/cloud synchronization unavailable |
| Owner identity / recovery | Existing Owner/AAL2 bridge and four real context reads; safe sign-in phase/code/http/request/time diagnostics; 5 fresh official-SDK synthetic touch flows; recovery/lifecycle regressions | Actual iPhone post-sign-in cause still unestablished; Safari/WebKit not run here; two-device/revocation acceptance pending | No credential collection, factor reset, new account or authentication success inferred from synthetic checks |
| Reference/UI target and release | Actual 2s/18s/34s frames inspected and hashes verified; persistent panes/split inspector/graph; mobile Explorer/filter fixes; no overflow in supported checks | Final Joey reference/usability acceptance | Production promotion not authorized by a development checkpoint; protection remains enabled |

917d engineering evidence: 466/466 portable tests, build/schema/safety PASS;
journal/private/lifecycle/Recovery browser regressions; fresh-touch official SDK
5 synthetic cases; real Postgres management CAS/replay and rollback-only denial
tests. Zero live Auth requests in synthetic browser checks. These do not prove
actual phone Auth, AAL2, Owner journal read or final decision persistence.

P3 migrations applied, not merely prepared:

| Migration | Version | Applied SQL SHA256 |
|---|---|---|
| `mc_coordinator_tool_receipts_20261007` | `20261007120315` | `721f645022502b180a1dd61bef50dfac473fcf9e0e5cfe29f6a460c00946178c` |
| `mc_coordinator_tool_receipts_acl_20261007` | `20261007120637` | `eedc6e2d8b382221822f8efdad58d68c961e589629703a84fe2567dcc5d2ee46` |

Final ACL readback: `postgres` alone may execute private management append;
PUBLIC/anon/authenticated/service_role append denied. Owner read wrapper execute
is authenticated-only and separately checks actual Owner/AAL2/session/membership
and frozen scope. App roles have no direct private-table access; forced RLS is
enabled. Temporary CREATE and role SET are restored. Original three Owner
functions are byte-identical; four imported heads remain revision0/write-disabled.
One proposal + one result persist, synthetic rows0, native Auth events0, active
machine writers0. Owner final review remains pending.

Next capability boundaries are exact: a supported current-task event source;
Owner-only decision append authority in `MC_OWNER_DECISION_GRANT_SCOPE.md`;
canonical per-store cutover/synchronization and supported execution adapters.
No invented modules, universal control, new credential or autonomous authority
is needed or claimed for the prepared local review feature.
