# Owner identity entry — approved helper applied, private workflow closed

Joey approved the narrow private helper at **2026-10-07T06:18:36Z**, message `Sentinel_9be2be282e488191b6f823562c8963a7` (`允許`). Applied once to exact MC project `scmvedfqwlhkyvljymjj`; actual official migration **20261007062024**, `mc_owner_private_auth_verifier`.

Approved bytes SHA-256 **5f5ccdbc132f5531f8be000d716e881d09718fc17ad412b95c022fcf46ffa554**; rollback **31149c39bd2ac220dd21d148a0cc59345fad5ec6b8d44d1d271c273590e21de6**. Preserve the frozen SQL bytes, including historical NOT APPROVED / NOT APPLIED comments; this execution receipt supersedes them. Do not replay either migration or silently apply rollback.

## Actual verification

The helper is postgres-owned SECURITY DEFINER, VOLATILE, private, no arguments, empty search_path. ACL is exactly owner postgres plus executor EXECUTE; PUBLIC/anon/authenticated/service_role are denied. current_actor stays executor-owned SECURITY INVOKER. Identity RPC stays executor-owned, authenticated-only, same four projects. Both callers have no direct Auth read. Executor is NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOINHERIT, auth USAGE=false, temporary CREATE removed, postgres SET=false/INHERIT=false memberships restored. Managed Auth ACL and three-table policies are unchanged; the old twelve column grants remain twelve.

The six private core tables keep FORCE RLS and zero rows; enabled writers zero. All mc_api workflow functions remain executor-owned and anon/authenticated/service_role EXECUTE=false. The helper never reads private workflow tables. All existing membership/CAS/digest/backup/capacity/writes_enabled checks remain in the original executor workflow functions.

- Existing SQL-admin synthetic claim fixture: **13/13 rejection cases PASS**, now expected 28000 rather than prior permission error. This does not verify JWT signatures.
- Direct helper ACL fixture: **3 caller roles denied PASS**.
- Existing private table/RPC denial fixture: **PASS** for the three existing roles.
- Positive synthetic call-chain wiring: **4 cases PASS**, current_actor and identity RPC at AAL1/AAL2, exact expiry forwarding and memberActive=false. An uncommitted helper stub was visible only inside the test transaction and rolled back. No Auth row/user/JWT or private row was created; no writer activated. Real helper source fingerprint and role reset were verified after rollback.
- Actual anonymous identity RPC at **06:26:31.832Z**: existing publishable-only official SDK, no user JWT/Auth initialization, HTTP401 / **SQLSTATE42501**, CONNECT200/TLS pass. This is real unauthenticated denial, not positive Owner Auth.
- Full portable checks: **407/407 PASS**, build/validate/check PASS, forbiddenAttempts=0. Current runtime/UI checks are recorded with their synthetic/local qualifications below and in the external manifest.

One external read-only preflight summary failed with syntax 42601 (missing final parenthesis); its failure is retained. The frozen migration's internal preconditions passed and the effective post-apply/final catalog and zero counts were checked. Never rewrite the failed read as PASS.

Security advisor retains two WARNs: [authenticated bounded identity SECURITY DEFINER RPC](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [leaked password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No advisors-clean claim or automatic Auth setting change.

## REST metadata401 diagnosis and exposure

Existing official edge logs for the two root metadata GETs give exact error **UNAUTHORIZED_INVALID_API_KEY_TYPE**, message **Secret API key required**, hint **Only secret API keys can be used for this endpoint.** It is a gateway key-type restriction on `/rest/v1/` metadata, not PGRST/schema permission, invalid key value, or proof mc_private is unexposed. Both bare apikey-only and pinned SDK standard headers received that result. The same existing publishable identifier reaches the bounded identity RPC and receives the expected DB denial. No legacy anon, secret/service key, OwnerJWT, new credential or repeat root probe was used to bypass the metadata endpoint restriction; that action is stopped.

Data API exposed-schema configuration therefore remains **UNKNOWN**. Existing mc_private/mc_api schema USAGE/CREATE and private-function EXECUTE for all three visitor/platform caller roles are false. A future official Dashboard/Management API config read may resolve exposure; do not expand schemas or request secret keys for this task. No private/unexposed config PASS is claimed. This uncertainty does not grant visitors helper access or turn the identity-only entry into private workflow authority.

## Ready entry and human acceptance

The candidate enables the confirmed Owner UUID and verified helper dependency only on the existing fixed protected stage. It opens the Owner sign-in panel, gives visible Email/App password labels and bounds inputs/QR/buttons for mobile. First-use signed-out status prompts sign-in. Production and every other origin have no Owner credential form. Public workflow status remains unconfigured/authenticated=false/runtimeConnected=false/executionAuthorized=false.

Entry: `https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/#workspace?project=NEXAEON&panel=entries`.

Joey enters the app user's email and MC app password herself, then uses Set up / verify app TOTP. On first enrollment, Mac can display the transient QR for her phone authenticator; she scans it and enters six digits herself. Existing verified TOTP can be challenged on a phone. The app's explicit restart removes only her unfinished MC enrollment after fresh verification; verified factors are not silently removed. Agent never sees/screenshots/logs her password, QR, seed, code or session token.

This entry is identity/MFA setup only. It loads no private workflow records, does not seed membership and cannot save a final private decision. Real Owner login/AAL2/current revocation/two-device acceptance remains **NOT RUN until Joey's actual browser flow**. Helper reads live session/user/factor metadata on each call, retaining original not_after/stored-AAL predicates; concurrent provider revocation after the validation read is not claimed to cancel an already-running transaction atomically.

Synthetic SDK lifecycle covers one client/listener, repeated views, unfinished enrollment recovery, successful synthetic challenge and QR/code purge with zero network. The UI matrix uses current local files at a simulated frozen stage origin; it is not an authenticated protected-preview browser or real provider login. Exact deployed SHA/READY receipt is supplied in the parent checkpoint after push. Production remains exact `8b4945b16a0b23f2e72033aa976fa34f94eabec0`.

Evidence: `docs/contracts/MC_OWNER_AUTH_HELPER_EXECUTION_RECEIPT.json`; external `owner-auth-helper-{applied-portable-final.log,unauth-http.json,sdk-browser.log}`, `owner-auth-stage-entry-browser.json`. The applied receipt supersedes historical blocked/prepared receipts without deleting their errors. Private docs/SQL/receipt/source are excluded from served output.
