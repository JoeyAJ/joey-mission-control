# MC Owner bridge — applied migration, effective access blocked

Sole writer transferred by parent on 2026-10-07; continued exact private branch `codex/mc-command-center-checkpoint-20261006` from `2dfd7b532f9e3a4f8494a492052d2ec0a57e049d`. Old writer stopped. Existing saved checkout at `32b77ee` was preserved. Candidate is `/workspace/mc-owner-candidate`.

## Actual progress and evidence

1. Fresh normal proxy/TLS GET readback at 05:35:19 UTC: HTTP 200, `disable_signup=true`, `external.anonymous_users=false`, `external.email=true`. One read, no retries/redirects. This supersedes the prior network-blocked settings evidence only. No signup/login/email/password/TOTP/token operation was performed.
2. Exact Owner UUID `6f0ca2ae-83e0-4684-af12-0b37d08182db` rechecked through non-sensitive Auth metadata: confirmed, nonanonymous, not deleted or banned. No password/hash/session token/factor secret column was read. Owner sessions count remains zero.
3. Approved bridge SQL SHA-256 `37aca08d8c601a6af0b695f14da0e0a2ebd796dffd6b1ed29ef450bd9b2a284e` matched exactly; applied once through official Supabase migration to `scmvedfqwlhkyvljymjj`. Official version **20261007053940**, name `mc_owner_identity_current_session_bridge`. Earlier foundation/executor migrations were not replayed. Preserve the frozen original pending SQL bytes; this receipt supersedes its historical NOT APPLIED comment.
4. `current_actor` remains executor-owned SECURITY INVOKER; `public.mc_owner_session(text)` is executor-owned SECURITY DEFINER with empty search_path and authenticated-only EXECUTE. anon/service_role have no EXECUTE. Exactly 12 non-secret Auth metadata columns have executor SELECT grants. Executor remains NOLOGIN/NOBYPASSRLS/NOINHERIT; temporary CREATE removed; both postgres memberships SET=false/INHERIT=false. All six core tables retain FORCE RLS and zero rows; enabled writers zero.
5. **Migration success is not effective bridge readiness.** `auth` schema owner is `supabase_admin`. The tool runs as nonsuperuser `postgres`, which has USAGE but no grant option and no membership/SET path to `supabase_admin` or `supabase_auth_admin`. `GRANT USAGE` in the migration did not take effect: executor auth USAGE is false. Auth users/sessions/mfa_factors all have RLS enabled and no policies. Thus even resolving schema USAGE alone would not expose required metadata to this NOBYPASSRLS executor. The prepared SQL-admin synthetic rejection fixture actually failed with 42501 `permission denied for schema auth`, before the expected 28000 session rejection. Never record it as PASS.
6. Real unauthenticated identity-only HTTP RPC, with existing publishable identifier only and no user token, returned HTTP 401/code42501 at 05:44:49 UTC. Existing-role raw/private RPC SQL access-denial checks PASS; they do not validate a positive Owner session. No real user, session or signed JWT was fabricated.

## Concrete next action

The managed-owner policy repair route is retired by parent's latest instruction. Do not assume supabase_admin/supabase_auth_admin, change managed ownership or obtain extra credentials. The historical policy proposal was never applied; its former SHA is retained in checkpoint a183db6.

Read [the exact private verifier review](MC_OWNER_AUTH_HELPER_REVIEW.md). Parent is requesting Joey's approval for one new limited privilege delegation: a private postgres-owned parameterless verifier using existing safe Auth read authority, executor-only EXECUTE, and minimal verified tuple/clipped expiry. Both current_actor and identity RPC lose their direct Auth reads; all workflow rules remain with the original executor. The new SQL/rollback are prepared only. **Do not apply before parent transmits Joey's exact approval.** Login flags remain off and no SQL trial was made.

The Supabase managed-schema announcement permits policies on listed auth.users/auth.sessions tables; it does not establish an executable three-table repair for this connector. Do not describe all Auth policies as unsupported. Actual effective auth schema USAGE denial remains recorded. Static candidate checks do not replace post-approval effective ACL/rejection checks or Joey's actual Auth/AAL2/revocation acceptance.

## Application checkpoint and verification

Frozen public config now records the actual closed-Auth settings readback, but ownerSubject remains null and sessionBridgeVerified=false. No credential form or SDK initialization is reachable on any current origin. All three languages describe incomplete sign-in setup without falsely claiming signup/anonymous closure is unknown. Real sign-in/TOTP entry remains **BLOCKED**, not delivered as working. Fixed stage remains the existing alias; no production promotion or resource creation.

- Full portable verification: 398/398 PASS, zero fail/skipped; build/validate/check PASS, forbiddenAttempts=0.
- Affected unit/static reader/adapter tests: 21/21 PASS.
- Existing synthetic SDK browser lifecycle: PASS; six renders/three languages/one SDK client+listener, interrupted TOTP recovery, verification and QR/code purge, unknown-project denial, zero network. Harness now resolves the selected runtime Playwright module instead of a stale executor path. This is synthetic only.
- Actual local server: 1440/390/320 × zh-TW/en/ko, reload/repeated refresh/no credential form/no overflow/page errors PASS; four private source/receipt/SQL/metadata paths GET404. Synthetic canonical fixtures only. Initial browser harness used a string predicate rejected by app CSP; corrected to a function predicate without weakening CSP.
- Git diff check: generated SDK bundle's intentional upstream template-string trailing whitespace is recorded through a file-specific .gitattributes setting; source files retain ordinary whitespace checks.
- Security advisor: two WARNs retained. Authenticated SECURITY DEFINER identity RPC is intentional bounded architecture; effective access is currently blocked. Leaked password protection is disabled and was not changed. No all-advisors-clean claim. Remediation links: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Evidence outside served output: `/workspace/mc-deliverables/owner-bridge-full-final.log`, `owner-bridge-sdk-browser.log`, `owner-sdk-lifecycle-browser.json`, `owner-bridge-local-browser.json`, `owner-bridge-unauth-http.json`. Scoped DB evidence is `docs/contracts/MC_OWNER_BRIDGE_EXECUTION_RECEIPT.json`; no credentials in it. Private source/docs/SQL/checkpoint metadata stay excluded from served output. Actual remote HTTP/browser acceptance must be recorded separately from Vercel READY metadata.

Production before this checkpoint: `dpl_3quBFohZs1gYJK4PnwjNFZnDTefR`, exact `8b4945b16a0b23f2e72033aa976fa34f94eabec0`, target production. Do not change its alias. New candidate full SHA/deployment receipt is supplied in parent final and external evidence after push/readback; do not infer it from this document's own commit.

Real Owner Auth/AAL2/revocation/two-device/CAS/backup/private workflow acceptance NOT RUN. No members, heads, contexts, events, checkpoints or storage budget seeded; workflow writer stays disabled. Admin authority remains capable of spoofing SQL settings/changing code; audit is not admin-tamperproof.

Official primary references: https://www.postgresql.org/docs/current/sql-grant.html ; https://www.postgresql.org/docs/current/sql-createpolicy.html ; https://supabase.com/docs/guides/auth/sessions ; https://supabase.com/docs/guides/auth/auth-mfa/totp .
