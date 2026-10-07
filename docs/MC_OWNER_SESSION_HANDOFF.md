# Owner session candidate and approved setup handoff

Implemented: private synthetic owner-session coordinator and zh-TW/en/ko DOM renderer, integrated with the private continuity repository. Public MC remains honestly unconfigured; no credential form or synthetic state is reachable through its route/query/hash. These modules are outside public imports and served assets.

The coordinator checks exact project/owner subject/OWNER role/current session/AAL against repository identity, expires and purges private views, invalidates reviews on logout/revocation/offline/cross-tab signals, and binds explicit one-use ACCEPT/REJECT confirmation to baseline, epoch, proposal, context, acceptance, latest result receipt, operation ID and revision. Retry binds the unchanged pending operation digests and preserves backend CAS; uncertain commits never become a ready/success claim. Offline drafts use the existing private pending store only when explicitly saved. Return destinations accept only the fixed protected stage's workspace project and entries/events/context panel; deeper module/item focus is not yet restored.

Joey approved the Owner-only Auth bundle at 2026-10-07T04:49:38Z (Sentinel_ff1eadef96dc81918f0db23dc4241274「允許」, responding to Sentinel_2cadfd552b388191a0686eaa6796ec56). One owner email: joeyaj11@gmail.com. No repeat same-scope approval is needed. The approved Supabase origin is https://scmvedfqwlhkyvljymjj.supabase.co; only a publishable key belongs in client configuration. No service_role, DB password, worker identity, OAuth or additional domain/resource.

Actual read-only preflight: exact owner email has zero auth.users matches; UUID remains unknown. Current callable connector inventory has no Auth-config action and no publishable-only key lookup. No Auth configuration was changed, no identity or key was created/read, no real Auth adapter exists, and the current_actor bridge still refuses. Existing applied SQL is the prior default-deny foundation/executor only; no Auth bridge/grant or private-data/writer activation occurred in this stage.

Shortest official UI handoff (required setup input, not another permission request):

1. Joey opens this MC project in the official Supabase dashboard. Under Auth configuration, close new-user signup and anonymous sign-in; inspect current email/password and exact existing stage URL settings. Do not add a social provider, wildcard redirect or paid addon.
2. In Auth Users, Joey creates only her app user for joeyaj11@gmail.com and personally enters the app password. She does not send the password/TOTP seed/recovery codes/session tokens to chat or Git. Parent/cloud can then resolve the immutable UUID through the already authorized read-only query. Console MFA is separate from app-user TOTP.
3. From official project API Keys, supply only the publishable client value through the owner/parent configuration path. Do not expose a screen/export containing secret keys. No connector capability to retrieve this value safely is claimed here.
4. Cloud continues within the existing approval: implement the official in-browser provider session adapter and private Auth/RPC bridge bound to that UUID; review minimal current-session/factor metadata privileges, preserve raw-table denial, and test first on the existing fixed protected stage. Joey personally enters app credentials and enrolls/challenges app TOTP in the resulting tested MC UI. That real MC screen is not available yet.
5. Run real closed-signup/anonymous denial, unknown UUID denial, owner reads, AAL1 rejection/AAL2 explicit decision, current revocation despite cached JWT, parallel CAS/atomicity, private browser boundary and two-device continuation before new epoch/private seed/writer cutover. Deployment acceptance remains parent/Joey owned; production is not promoted.

Validation:

- Full `npm run verify:portable`: 385/385 PASS, zero fail/skipped; build/validate/check PASS; portability guard forbiddenAttempts=0.
- Affected tests: 36/36 PASS. Independent review: 36/36 PASS, four P2 fixed, no remaining P1/P2.
- Isolated Chromium about:blank renderer QA: 1440/390/320 × zh-TW/en/ko PASS, real DOM callbacks, no credentials/raw private fields/overflow/page errors. It exercises synthetic states, not provider Auth or live two-device sessions.
- Existing public UI unchanged in this stage; its earlier actual local routing/refresh/recovery/privacy QA remains separate evidence. Protected deployed HTTP/browser Auth QA NOT RUN. Real Auth/owner RLS/session revocation/parallel CAS/two-device acceptance NOT RUN.

Private evidence outside served output: /workspace/mc-deliverables/owner-session-focused.log, owner-session-full-verify.log, owner-session-ui-browser.json and owner-session-preflight.json. Candidate modules: src/continuity/owner-session.mjs and owner-ui.mjs; tests: tests/owner-session*.test.mjs and tests/browser/owner-session-ui-qa.cjs. All public original URL/baseline/privacy/source truth boundaries are retained. Management-admin authority is not technically prevented from changing functions or spoofing an approval; audit is not admin-tamperproof. No automatic agent telemetry is connected.

Official references: https://supabase.com/docs/guides/auth/general-configuration ; https://supabase.com/docs/guides/getting-started/api-keys ; https://supabase.com/docs/guides/auth/auth-mfa/totp ; https://supabase.com/docs/guides/auth/sessions .
