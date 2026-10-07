# Owner private context read

The fixed protected preview now supports an explicit read of the four approved
project contexts after the existing Owner session has current AAL2 and active
Owner membership. Open the private workspace entry and choose **Read private
project context** (「讀取私人專案資料」). Initial mounting performs no private
context fetch. The existing pinned official SDK and normal session storage are
reused; no second Auth client or recovery session is created.

Joey authorized the reviewed import and Owner-only read scope at
2026-10-07 10:15:26 UTC. The applied database scope contains four frozen heads,
four filtered contexts, one budget row, and four active Owner mappings. No writer
mapping, event, or checkpoint was created. Writes remain disabled at revision
zero. Historical source claims remain qualified records, not new authenticated
decisions or canonical project promotion.

The applied migration `mc_owner_private_read_scope_20261007` exposes two bounded
RPCs: `mc_owner_context_scope(text)` discovers only the approved project/hash pair,
and `mc_owner_read_context(text,text)` returns that context. Both independently
require the fixed Owner, current provider session AAL2, and active Owner mapping.
The executor owns the SECURITY DEFINER functions with empty search paths.
Authenticated callers alone have wrapper execution; PUBLIC, anonymous, and
service-role execution is denied. Direct private-schema access remains denied,
and all six private tables retain forced RLS. The temporary public-schema CREATE
and admin role-switch privileges were restored before transaction commit.

Private SQL, approved pins, imports, rollback bundles, and source archives remain
in private custody outside Git and public assets. The offline scope SQL generator
accepts privately supplied pins; it is absent from the browser import graph.
The browser learns pins only through the authorized lookup, verifies the returned
filtered claims against their digest, and rechecks the Owner session before
display. Values use text nodes and remain in memory. Project change, session
change, logout, expiration, pagehide, and disposal purge them. A late response
cannot restore an invalidated read. Membership loss closes private reading while
preserving the existing valid sign-in session.

Validation completed:

- Portable tests/build/schema/safety checks: 445 passed, zero failures.
- Private read browser matrix: nine cases across Chinese, English, Korean and
  1440/390/320px widths, with explicit reads, digest refusal, escaped text, project
  changes, membership loss, late logout, and pagehide purge.
- Existing Owner lifecycle and integrated recovery regression: nine cases each.
- All four actual frozen contexts match the browser digest without printing their
  hashes or values.
- Live database count, row-integrity, wrapper ACL, forced RLS, and restored
  privilege checks passed. Unauthenticated and anonymous calls were rejected;
  the wrong pin was rejected. Negative checks did not impersonate the Owner or
  change Auth sessions/factors.

Browser tests use synthetic SDK responses and make zero live Auth/DB requests.
Live server metadata independently showed one unexpired Owner AAL2 session;
no JWT, password, authenticator code, QR content, or raw Auth row was collected.
Parent reported actual NexAeon Owner UI read acceptance at 10:49 UTC, based on
native review of four scroll sections of that one project showing verified
identity and loaded private content without read errors. Missing completion facts
remain unknown. This does not establish live reads for the other three projects,
writes, runtime, two-device or revocation acceptance. Effective Data API
exposed-schema configuration was not available
from supported readback; no schema-exposure setting was changed. Two-device and
provider revocation acceptance remain separate future checks.

Publication target is the existing private branch
`codex/mc-command-center-checkpoint-20261006` and fixed protected preview:
https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/#workspace?project=NEXAEON&panel=entries

Production remains at `8b4945b16a0b23f2e72033aa976fa34f94eabec0` and deployment
protection remains enabled. The external publication receipt records the actual
release SHA and deployment after Git publication.

Official references:
https://supabase.com/docs/reference/javascript/rpc
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/auth/auth-mfa
