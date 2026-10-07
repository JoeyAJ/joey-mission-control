# Owner final-decision authority — proposed, not applied

Joey's 2026-10-07 11:49:15 UTC permission allowed NexAeon management-tool
proposal/result append and Owner reading. It reserved final decisions to Joey;
it did not grant a new browser-to-database decision write path. Current journal
schema permits only proposal/result and returns `ownerDecisionEnabled=false`.
The prepared review UI has no decision RPC, queue, persistence or submit method.

Prepared next functional subset: `contracts/owner-coordinator-decision.mjs`
defines the exact bounded request (operation ID, review binding/digest and expected
decision revision) and immutable stable content for a future server append.
It is a pure offline planner accepting synthetic actors only. Tests cover exact
replay after response loss, changed-content refusal, stale two-device revision,
immutable final-outcome refusal, expired evidence, scope/actor/assurance loss,
shared capacity and corrupt receipt custody. It never emits a verified provider
claim, executes SQL, persists a decision or imports into the browser bundle.
These are protocol reference checks, not actual Postgres/CAS/Auth acceptance.

Concrete smallest future permission: allow Joey's existing verified Owner session
at AAL2 to append one immutable ACCEPT or REJECT decision for one exact current
coordinator proposal/result pair in the existing private MC database, then read
that committed decision. This creates no approval to run the proposed work,
promote canonical project state or deploy another project.

Proposed server surface and privileges, all UNAPPROVED / NOT APPLIED:

| Object / role | Narrow authority to review before installation |
|---|---|
| `mc_private.coordinator_owner_decisions` | One append-only decision store referencing the immutable journal pair; force RLS; no app direct table access |
| Existing `mc_continuity_executor` | SELECT/INSERT and narrow matching RLS policies on that new decision store only; reuse existing journal SELECT/shared-budget privileges after exact readback; no UPDATE/DELETE on receipts/decisions, no new role or login |
| `public.mc_owner_decide_coordinator_result(request jsonb)` | SECURITY DEFINER owned by existing executor, empty search_path and fully qualified objects; EXECUTE to authenticated only, explicit revoke from PUBLIC/anon/service_role; no grant of management append |
| Bounded Owner decision read projection | Separate authenticated-only read wrapper (or explicitly reviewed versioned extension); same Owner/session/scope guards; no weakening of current strict read contract |

Server must verify provider-derived subject, existing fixed Owner, current AAL2
and actual active provider session/member, all four allowed project scope pins,
exact context/baseline/epoch, complete proposal/result/acceptance/evidence digests,
proposal expiry, expected current journal revision and expected decision revision.
Browser draft values are untrusted and never supply proof of identity or authority.
No management call may impersonate Joey or record an Owner decision on her behalf.

Commit requirements: shared-budget then project/decision lock order; CAS makes two
device races choose one consistent revision; fixed operation ID/content digest
replays return original server time/revision without a new charge; changed content
under the same ID refuses; one immutable final outcome per proposal/result.
Server-derived actor/session assurance and commit time stay distinct from client
observation/draft time and coordinator submitter qualification. No offline queue,
automatic retry, stale approval, quota rewind, silent overwrite or autonomous
execution. Pause revokes decision EXECUTE while preserving history/Owner reads.

Acceptance needed before enabling a final-submit UI: exact reviewed SQL manifest,
real ACL readback, rollback-only denial/capacity/CAS/replay tests, actual Owner
AAL1 denial and Owner AAL2 commit/readback, other-subject/nonmember/revoked-session
denial, two-device race and lost-response exact retry. No JWT/password/TOTP is
collected by the agent. Existing SDK carries the user's own normal session.

This is a concrete proposed authorization boundary, not executable migration SQL.
No migration, grant or server decision write is made in the preparation stage.

Suggested one-scope owner wording for the next approval: "Allow Joey alone,
using her existing MC Owner/AAL2 session, to explicitly save ACCEPT or REJECT for
the exact coordinator proposal/result she reviewed, with immutable private audit
and readback in the existing MC Supabase. Allow the narrow decision table/RLS,
existing-executor SELECT/INSERT and authenticated-only guarded decision/read RPCs
above. Preserve journal history, Auth/account/factor configuration and frozen
canonical project heads. No agent may decide for Joey; no dispatch, production
promotion or autonomous write permission is included."

The eventual reviewed install manifest must enumerate any temporary schema
CREATE or postgres role SET needed for existing-executor ownership, restore both
in the same transaction, and verify actual function-owner default ACLs afterward.
They are installation mechanics, not standing application privileges. The exact
SQL/content hashes cannot be claimed until that server implementation is prepared.
Supabase current official guidance requires restricting function EXECUTE and
checking ownership inside SECURITY DEFINER functions independently; AAL2 must be
enforced at the database boundary:
[database functions](https://supabase.com/docs/guides/database/functions),
[MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa).
