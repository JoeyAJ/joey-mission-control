# Owner final-decision authority — approved and applied

Joey approved the narrow Owner decision persistence scope at 2026-10-07
13:24:03 UTC, reply “可以”, source `Sentinel_2aba8eeec5e0819196da5d4585feb01f`.
The preceding scope question at13:24:01 is
`Sentinel_7393d4fb3eac819198f59a283bc6660b`. Only Joey explicitly saves ACCEPT or
REJECT, using the existing Owner session after MFA. Version checks and immutable
private audit are required. Agents cannot decide for her or execute the proposal.

Applied migration `mc_owner_coordinator_decisions_20261007`, version
`20261007133100`, frozen SQL SHA256
`3634e70009f533b4518b85c1716bb72a082ef8eac467128fc369f8fced3c0b0b`.
The source template is `contracts/sql/coordinator-owner-decisions.pending.sql`;
its placeholder-expanded bytes match the applied frozen SQL. Actual scope pins
and installation custody stay outside Git and the public build. Do not reapply.

| Object / role | Applied narrow authority |
|---|---|
| `mc_private.coordinator_owner_decisions` | Append-only private decision store; force RLS; one immutable final outcome per proposal; no direct app table access |
| Existing `mc_continuity_executor` | SELECT/INSERT and matching RLS on that table; no UPDATE/DELETE; existing journal read/shared-budget authority reused |
| `public.mc_owner_decide_coordinator_result(request jsonb)` | SECURITY DEFINER, existing executor owner, empty search_path, authenticated-only explicit EXECUTE |
| `public.mc_owner_coordinator_decisions(project,after_revision,page_limit)` | Separate bounded authenticated-only read, maximum50 rows; provider session identifier omitted from projection |

Both RPCs check the fixed Owner, current provider-derived AAL2/session and active
membership using the existing verified helpers; four existing frozen scope pins
remain authoritative. No browser value proves identity. Management calls with
`session_user='postgres'` refuse `OWNER_DECISION_BROWSER_ONLY` before Auth or
append. SQL administrators retain intrinsic administrative power; a catalog
EXECUTE result for postgres does not mean that caller can decide for Joey.

The write locks shared budget before the frozen project head, then rechecks
current actor/session/member. Separate journal and decision revisions enforce
CAS. Exact proposal/result/context/baseline/epoch/acceptance/evidence bindings and
expiry are required. An operation ID with the same stable content returns its
original revision/time without another row/charge; changed content refuses.
Previously committed exact retries still require current Owner authorization,
but can recover an acknowledgement after proposal expiry. New decisions require
unexpired evidence. Capacity shares the existing10,000-record/100MiB budget.

Temporary schema CREATE and postgres role SET used for installation were restored
in the transaction. Readback: both CREATE=false; SET=false; forceRLS=true;
executor SELECT/INSERT=true and UPDATE/DELETE=false; authenticated RPCs=true,
directTable=false; anon/service_role RPCs and directTable=false; PUBLIC EXECUTE0.
Frozen heads4, native events0, active machine writers0, journal rows2 and genuine
Owner decision rows0. No real decision was seeded or submitted by the agent.

Local PostgreSQL fixtures using pinned `@electric-sql/pglite@0.3.15` pass
four-project append/read, synthetic AAL1/session/member denials, CAS, exact replay,
expiry, immutable outcome, quota, changed evidence and rollback. This is isolated
PostgreSQL algorithm verification, not the actual Supabase/Auth runtime. Large
live rollback fixture calls were interrupted without completion receipts; they
are UNCONFIRMED, not PASS. Restart readback found no persistent fixture/grant
residue. Real Joey AAL2 commit/readback, revocation and two-device checks remain
pending her explicit interaction. No password, JWT, TOTP or factor is collected.

Browser tickets and drafts stay in memory. Preparing a choice does not write.
Only the separate final confirmation calls the decision RPC. Unconfirmed response
permits an explicit exact retry; no automatic retry or offline queue exists.
Project/session/member invalidation purges private state while the normal existing
SDK/session remains in place. Saving a decision creates no canonical promotion,
autonomous dispatch, agent approval authority or production release authority.

Current official guidance:
[restricted database functions](https://supabase.com/docs/guides/database/functions),
[MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa),
[local PostgreSQL test engine](https://pglite.dev/docs/).
