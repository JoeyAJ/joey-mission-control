# Approved tool-mediated coordinator journal

Joey allowed the minimum four-project proposal/result append scope on
2026-10-07 at 11:49:15 UTC. This stage implements the recommendation through the
existing MC Supabase management connection. No autonomous writer, credential,
account, role, public append, final decision or project-production change exists.

Applied migrations: `mc_coordinator_tool_receipts_20261007` version
`20261007120315` and `mc_coordinator_tool_receipts_acl_20261007` version
`20261007120637`. Applied SQL hashes and current ACL summary are recorded in
`MC_COMMAND_CENTER_ACCEPTANCE.md`. The first reviewed install attempt
rolled back on the existing canonical helper ACL; the one approved retry used
the existing executor for its integrity check. Post-install readback found
function-owner default ACLs, so a narrow repair executed the revocations as the
existing function owner. Final readback proves app roles cannot append or access
the private table; only authenticated may invoke the Owner read wrapper. Current
provider Owner/AAL2/session/membership and frozen scope are still required.
Temporary CREATE/SET privileges are restored. Original three Owner functions
remain byte-identical; all four imported heads remain revision zero/write-disabled.

One append-only private table is the sole new coordination journal. Management
append locks the shared budget then frozen project head, enforces exact scope,
CAS, stable content idempotence, 24h proposal expiry, bounded records/shared quota,
and matching submitter-attested results. Server SQL caller/commit time and declared
tool reference stay distinct from provider identity. Shared management authority
cannot cryptographically identify different agents; designation is workflow custody.
The existing Auth-only native event stream and active machine writers remain zero.

A genuine P3 implementation proposal was committed once. Two concurrent same-
revision deliveries produced one acceptance and one revision conflict. An exact
retry with a new declared tool reference returned the original revision/digest/time
without a second row. Four-project synthetic SQL validation was rollback-only;
no synthetic receipt or budget change remains. A completion result may be appended
only after its exact code/check/publication evidence exists, and stays pending
Joey's final review. No final decision operation is accepted.

The published917d result has now been appended with verified publication evidence.
Final custody contains one genuine proposal and one result, no synthetic rows,
two budget events, four frozen heads, zero native Auth events and machine writers.
Owner acceptance is still pending. The subsequent isolated Owner review stage
prepares memory-only choices; its exact unapproved server decision grant is in
`MC_OWNER_DECISION_GRANT_SCOPE.md`. It changes no applied P3 authority.

The protected fixed preview offers an explicit **Read coordinator records** button
inside the existing Owner entry. It uses the same SDK/session, validates the
scoped context and each content digest, pages 50 records, and presents human
summaries/audit evidence. Other projects truthfully show no records yet. No
automatic read or append is added. Logout, expiry, membership loss, project switch,
pagehide and disposal purge the in-memory receipt view; private data never enters
public API snapshots, local storage, screenshots or public build assets.

Pause revokes only management append and retains reading/history. Empty rollback
refuses any committed rows. After data exists, pause/export preserves history;
no automatic deletion or quota rewind. Private SQL, scope pins, acceptance evidence
and exports stay under /tmp/mc-private-restore/receipts, outside Git/public.

P5 follow-up: Explorer/filter selection is retained in URL/history/reload;
mobile has an Explorer inspector entry; duplicate public qualification is removed
while private per-field qualification/time stays distinct. Desktop/mobile pane
checks cover 1440/870/390/320 and three languages.

Phone sign-in investigation: the former generic UI combined sign-in service,
identity/assurance and MC session-RPC failures. Safe localized stage classification
and selectable diagnostics now show only stage, allowlisted code, HTTP status,
UUID request ID if exposed, and client observation time. No email, token, body,
private URL or automatic retry/reset is recorded. The account/factor are unchanged.
Five fresh touch/iPhone-profile Chromium contexts use the actual pinned SDK against
isolated synthetic endpoints to verify existing-factor MFA, blocked storage and
provider/network/RPC error classification. WebKit is unavailable here; actual
iPhone failure cause and new-stage real Owner journal reading remain unverified.

Validation: 466/466 portable tests, build, schema validation and static checks PASS;
zero forbidden workstation reads. Journal/private-read/lifecycle/Recovery browser
regressions and fresh-device official-SDK checks use isolated synthetic values,
zero live Auth/DB requests. Real SQL tests prove management CAS/retry/rollback and
ACL denial; they do not substitute for real Owner/AAL2/cross-device acceptance.
