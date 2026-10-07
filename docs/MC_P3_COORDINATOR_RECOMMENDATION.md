# P3 recommendation: one tool-mediated coordinator journal

## Product permission to approve

Allow the designated **NexAeon coordinator** to use the existing Supabase
management tools to append scoped **proposal and result records** for NexAeon,
Woosong Buddy, Namyoung Web3D and Joey Asset System. Keep one authoritative
coordination journal in the existing MC private ledger. Joey can read these
records at the same fixed protected preview with her existing Owner session.
Joey's final decisions remain independent; the coordinator cannot approve or
execute work on her behalf. This stage uses explicit tool-mediated writes.
Autonomous app/agent writeback is outside this permission.

No new account, service principal, credential, API key, resource, paid service,
public private-data exposure or other-project write scope is included. Original
project repositories, imported private context, canonical history and decision
stores retain their authority.

Incremental value: stage proposals/results survive a cloud-task restart, carry
their project, source baseline, evidence and test summary, and are visible to the
Owner and next coordinator. Stale submissions cannot overwrite newer records;
response loss/retry cannot duplicate a committed record. The journal does not
claim live execution, automatic synchronization or authenticated Owner approval.

## Actual current capability

Read-only management SQL returned `current_user=postgres`,
`session_user=postgres`, zero authenticated event rows, four frozen read heads,
and zero active machine writers. Existing `mc_api.append_operation` requires a
provider-verified Auth actor. Its event schema requires an Auth subject and AAL.
Management SQL cannot truthfully supply Joey's session or manufacture a machine
identity. Current Owner context wrappers also bind the imported head at revision
zero with writes disabled.

Available tools support reviewed migration and transaction execution through
`supabase_apply_migration` and `supabase_execute_sql`. The existing official
browser SDK supports Owner-only RPC reading. These can implement this bounded
manual/tool-mediated stage after approval. There is no established authenticated
agent-to-app write transport for this task. P2 status remains an explicitly
observed snapshot; no new invocation, event feed or unrelated platform is used.

The designated writer is a workflow assignment. Shared management access does
not cryptographically distinguish one agent from another. Every row records the
server's actual SQL caller and the coordinator's declared invocation reference.
Its qualification is `TOOL_MEDIATED_COORDINATOR_ATTESTATION`; provider subject/AAL
and verified emitter identity remain absent. Management administrators retain
their existing ability to change objects. This is audited tool-mediated custody,
not an autonomous or administrator-tamperproof writer boundary.

## Concrete implementation selected by the agent

Use one new append-only private table, `mc_private.coordinator_receipts`, inside
the existing database. This is the sole store for new coordinator proposal/result
records. The existing Auth-only event stream remains inactive and is not used to
duplicate these records or mislabel tool calls as authenticated user events.

Each receipt contains the fixed project/epoch/baseline/context tuple, its own
coordination revision, operation ID/content digest, bounded human summary,
proposal/result payload and evidence hashes, frozen permission reference,
declared tool invocation reference, fixed coordinator label, actual SQL caller,
and server commit time. Native source heads/contexts and their revision-zero
read contract remain unchanged. No final decision operation is accepted.

Two narrow functions implement the stage:

1. A private management append function accepts only the fixed coordinator mode,
   four frozen project tuples and the approved proposal/result schema. Its
   callable management role is the actual `postgres` SQL caller. PUBLIC, anon,
   authenticated and service_role have no append execution. Existing narrow
   executor ownership and empty search paths are reused; any temporary role/CREATE
   capability needed for installation is restored before commit.
2. An authenticated-only Owner read wrapper checks the existing immutable Owner,
   current AAL2 and active project membership, returns at most 100 bounded receipts,
   and grants no write permission. New table privileges are limited to the
   existing executor's SELECT/INSERT under forced RLS. No schema exposure change
   or direct platform-role table access is added.

Append locks the existing shared budget and then the existing project head, in
that order, without changing the imported head. It derives the coordination
revision from the indexed project/epoch journal while holding those locks.
Expected revision, frozen baseline/context and content identity must match.
Identical ID/content retries return the original receipt without incrementing
revision or refreshing time; changed content under an existing ID is refused.
Delivery invocation IDs are audit fields and are excluded from stable content
identity so a retry may use its new tool-call ID.

Proposal expiry is at most 24 hours. Results require the matching, unexpired
proposal and retain `SUBMITTER_ATTESTED`. No raw code/log/archive/credential body
is accepted. Each record is at most 8 KiB plus a bounded storage charge; the
existing shared 10,000-record/100 MiB budget remains the cap. Indexed keys bind
project/epoch/revision, operation ID and proposal ID. A different source cutover
or native write activation pauses this journal rather than changing authority.

## Recovery and acceptance

Before first write, freeze the reviewed private SQL, four scope pins, permission
receipt and rollback manifest. Permission follows the product scope above;
Joey does not choose roles, table names or internal SQL. The agent prepares and
verifies those implementation details before using the grant.

After approval, verify real PostgreSQL rejection, two concurrent CAS submissions,
exact/changing retries, failure atomicity, expiry and shared-budget behavior.
Export a pinned private receipt checkpoint before dependent cutover. Pause
revokes only the new append path and retains all receipts and Owner reading.
Before any writes, exact-empty rollback may remove only the new objects. After
committed receipts exist, pause/export comes first; no history deletion or quota
counter rewind is automatic. Existing Owner contexts, Auth sessions and six-table
source data are preserved.

The offline draft checker reuses the existing typed continuity operation contract.
It is outside the app import graph and never executes SQL or grants authority.
Targeted tests are source-only evidence, not real database or Owner write proof.
No migration, grant, row write, machine writer or UI activation has occurred in
this preparation stage.

Official design references:
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/database/postgres/row-level-security

Approved implementation follow-up: Joey allowed the product scope at
2026-10-07T11:49:15Z. The source-only preparation above is historical; current
applied boundaries, real SQL evidence and remaining device checks are recorded
in MC_OWNER_COORDINATOR_HANDOFF.md. The offline planner continues to grant no
transport or execution authority.
