# Owner decision RPC correction candidate

The fixed preview remains guarded at source7ae2c06 and READY deployment
`dpl_G4j85xVGJnEJvJxFYzrZe2TLwWjW`. Only decision submission is disabled;
existing authenticated reads, saved-decision reads, Auth/session and SSO remain.
Old loaded pages need a reload; the browser flag does not revoke SQL EXECUTE.
Production remains8b4945b. The candidate branch is
`codex/mc-owner-decision-correction-20261007`; exact candidate SHA/tree and
file digests belong to the private external correction checkpoint.

The source correction changes two existing function bodies only. The read RPC
produces metadata and its bounded page in one SQL statement. The write RPC
requires proposalId, proposalOperationId and resultOperationId to be JSON strings
matching `^[A-Za-z0-9_-]{1,80}$` before digest, replay, CAS or INSERT processing.
Original Auth guards, signatures, owners, ACLs, security-definer/search_path,
CAS/idempotency and budget logic are preserved. The original installer remains
unchanged and must not be reapplied.

The planner and two pending SQL files are under `docs/contracts/`. Each patch
has statement_timeout5s and lock_timeout2s, requires existing owner/schema
privileges and checks the exact original definition MD5 before replacement.
It introduces no grants, roles, tables, credentials or real decisions. It refuses
source drift or repeated application. These pending files have not been applied
to Supabase.

Validation uses native PostgreSQL17.10 with two distinct Unix-socket backend
connections, not in-memory emulation. Ten bounded check groups pass with driver
exit0 and initdb/start/stop exit0. The old numeric-ID coercions and split-snapshot
race reproduce; corrected type/format rejection, actual concurrent CAS conflict,
exact concurrent replay, single budget charge, expiry/quota,100 reads alongside
100 fixture appends, and50/50/1/0 paging pass. The old snapshot race uses an
explicit test-only between-SELECT advisory barrier; the corrected read body
has no such instrumentation. Pending-patch success preserves owner/ACL/settings,
and missing-owner/repeated-patch refusal preserves definitions and rows.

The native harness uses synthetic identities, local Auth/scope helpers and local
fixture schemas only. Successful-patch testing adapts only schema names and the
original-definition fingerprint. Synthetic Auth guards do not prove actual
Supabase Auth, Joey AAL2 or two-device behavior. Live Auth/Supabase test requests0;
the native server stops after verification. Test-only packages are pinned outside
product dependencies: `@embedded-postgres/linux-x64@17.10.0-beta.17` and
`pg@8.16.3`. Product package.json/lock, API, CSP and Auth configuration are unchanged.
Reproduce with `node scripts/verify-owner-decision-native-postgres.mjs <prefix>`
after installing those exact packages in an isolated prefix. Portable485/485,
build/schema/static safety and forbidden workstation attempts0 also pass.

Live readback is still blocked for replacement: current_user/session_user are
postgres, a non-superuser, with owner-role USAGE=false and SET=false. Both RPCs
are owned by mc_continuity_executor; its temporary public/private schema CREATE
privileges remain false. Read MD5 is43bcb9bbda9e44b2f675188abbf46b24; write MD5
is80e2e69e1038153e0b698105759b759a. Decision rows0, journal rows2, native events0,
frozen heads4 and active machine writers0. No live DDL or permission expansion
was attempted in this correction stage.

Next requires an existing authorized function-owner execution path or separately
approved exact temporary ownership/schema permission mechanics. The current
instruction forbids expanding CREATE/SET without that approval. Do not obtain
another credential, repeat the original migration, bypass ownership or enable
submission. After an authorized replacement, read back exact definitions,
owner/ACL/search_path and unchanged data counts using bounded read-only queries;
complete applicable integration verification before enabling submission. Actual
Supabase rollback fixtures remain interrupted without a receipt; real Joey
decision commit/readback, revocation and two-device acceptance remain pending.

PostgreSQL documents that replacement requires ownership and preserves existing
owner/permissions, and that volatile queries can acquire separate snapshots:
[CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html),
[volatility](https://www.postgresql.org/docs/17/xfunc-volatility.html).
Supabase guidance reviewed: [database functions](https://supabase.com/docs/guides/database/functions).
