# Applied Owner decision RPC correction

The prior fixed guard is source7ae2c06/READY
`dpl_G4j85xVGJnEJvJxFYzrZe2TLwWjW`. The same fixed alias now receives the
applied correction checkpoint; its exact SHA/tree/deployment are external.
Only decision submission remains disabled;
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
source drift or repeated application. Their two body edits were applied through
the exact approved combined transaction; do not rerun these pending patches.

Validation uses native PostgreSQL17.10 with two distinct Unix-socket backend
connections, not in-memory emulation. Twelve bounded check groups pass with driver
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
Reproduce the core eleven groups with
`node scripts/verify-owner-decision-native-postgres.mjs <prefix>`; an optional
third argument names the private review-only permission wrapper for group12.
Install the exact packages in an isolated prefix. Portable485/485,
build/schema/static safety and forbidden workstation attempts0 also pass.

Joey approved the exact temporary inheritance scope at21:51:44 UTC, replying
「允許」 to the21:33:58 permission request. The tested SQL SHA256 is
243dd77a82b6b267cda2d9fe9c243d7d6d3f1ac14864b16025e6d35859eb7844.
Migration `mc_owner_decision_rpc_correction_20261007`, version `20261007215457`,
succeeded on the first attempt. One transaction/one DO block uses statement
timeout5s, lock timeout2s and idle-transaction timeout5s. Only the existing
postgres-grantor mc_continuity_executor→postgres membership briefly used
INHERIT=true, then returned to false before commit. SET stayed false and no
schema CREATE grant, role, credential, table or real decision was added.

Actual readback matches both predicted corrected definitions: read MD5
8d5927fb516d1d5f5f358865d52e973c; write MD5
8973fe68d12a11094ff38073cd1f1509. All eight function owners/ACL/configs remain
unchanged, and the other six definition hashes match the saved baseline. Both
grantor rows are restored exactly: postgres ADMIN=false/INHERIT=false/SET=false;
supabase_admin ADMIN=true/INHERIT=false/SET=false. Effective postgres owner USAGE
and SET are false; executor public/private CREATE remains false; the caller's
pre-existing public CREATE remains true. Decision rows0, journal rows2, native
events0, frozen heads4 and active machine writers0 are unchanged.

Bounded actual read-only calls to both RPCs from the management session produce
OWNER_DECISION_BROWSER_ONLY, with no decision row. Standard HTTPS/TLS GET to the
same approved host's read RPC, using only the approved publishable identifier,
returns401/42501 permission denied; no Owner token or private data is returned.
These tests verify deployed refusal paths, not an authenticated Owner read/write.
Guarded browser9, SDK lifecycle9, portable485/485 and build/schema/static safety
pass. All browser fixture Auth/RPC traffic is synthetic. The native12-group
proof remains preserved separately from provider integration observations.

Submission stays false pending the existing Owner session's fresh read-only
smoke of the corrected decision projection. The agent will not obtain an Owner
JWT, password/TOTP or submit a real decision. Actual Joey AAL2 final commit,
readback, revocation, cross-device and real lost-response acceptance remain
pending. The earlier actual Supabase rollback fixtures remain interrupted
without a completion receipt; later local success does not change that status.
No further authority expansion is implied by this one-transaction approval.

Security advisor notices were recorded without changing scope. The six
intentional authenticated SECURITY DEFINER entrypoints retain their bounded
Owner/session/scope guards and original ACLs; see the
[advisor rule](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Auth leaked-password protection is reported disabled; no Auth setting was changed.
[Auth guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

PostgreSQL documents that replacement requires ownership and preserves existing
owner/permissions, and that volatile queries can acquire separate snapshots:
[CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html),
[volatility](https://www.postgresql.org/docs/17/xfunc-volatility.html),
[GRANT](https://www.postgresql.org/docs/17/sql-grant.html).
Supabase guidance reviewed: [database functions](https://supabase.com/docs/guides/database/functions).
