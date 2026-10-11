# Existing Owner same-page email OTP — 2026-10-11

Joey approved passwordless direction at22:41:48UTC, preserving private authorization. Priority task-entry feedback/navigation was already published at45cebef30f958934674619fc7e90b25324579d99, exact fixed Preview dpl_3kGhMssHDph5WvTAnxmCwnubYHNo READY. This independent increment prepares the same-page flow; it does not delete the account password or activate anonymous private access.

## Selected flow and executable preparation

Owner enters their existing email, explicitly requests a code, then enters that code on the same page. Official SDK signInWithOtp uses shouldCreateUser:false without emailRedirectTo. verifyOtp uses the same in-memory bound email, code and type:email; exact nonanonymous Owner UUID is required. Its result is only SESSION_RECHECK_REQUIRED. Existing server getUser, authenticator assurance, actual live session/member bridge and all private AAL2/TOTP gates remain mandatory. The original App password flow and approved persistent SDK session custody remain available and unchanged; no extra email/code storage, callback, URL credential or user-controlled activation flag is introduced.

Request is not authenticated. A local ten-minute bound challenge and one-minute conservative request cooldown, mandatory current-generation predicate, queued mutations and existing logout serialization refuse stale continuations. Scope/track switch, page hide, logout or disposal erase transient form/challenge state. Late verified sessions are locally signed out before an acknowledgment. Provider errors are fixed messages; recipient existence is not confirmed. Input codes clear immediately on submission; wrong subject/anonymous users never qualify. Public owner-email-otp-config.js remains enabled:false / AUTH_TEMPLATE_READINESS_NOT_CONFIRMED, absent from the live form. Activation requires verified template readiness, not a URL/localStorage preference. No new signup, account, credential, MFA factor, write/execution route or model selector.

## Read-only findings and exact missing capability

Existing scripts/read-owner-auth-settings.mjs made one normal GET to https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1/settings with the existing public publishable key, no retries/redirect/TLS or proxy bypass. HTTP200 confirms disableSignup:true, anonymousUsers:false, email:true. This proves closure/provider flags, not mail delivery or OTP template content. Connected get_project confirms the existing MC project ACTIVE_HEALTHY, created2026-10-07T00:10:12.932926Z. No secret value or account email is included in receipts.

Connected tools expose project/database reads but no Auth-management config or template read. Supabase CLI is absent. The exact blocked read is GET https://api.supabase.com/v1/projects/scmvedfqwlhkyvljymjj/config/auth through an already authorized management connection, returning only the nonsecret email enabled/signup/anonymous flags, email OTP length/expiry, whether the Magic Link body includes {{ .Token }}, Site URL/exact redirects and existing custom-SMTP-configured boolean. Never output SMTP passwords, OAuth secrets or management credentials. Existing repository recovery readback records localhost Site URL and an exact recovery callback; that historical record is not a fresh OTP read. No new credential/installation or SQL workaround is requested.

Official changelog June3 limits Auth-template customization for new Free projects using default SMTP. This MC creation date is after the cutoff, so current plan/SMTP/template editability must be read before any proposal is executable. It is not yet established that MC is on Free/default SMTP, nor that template changes are permitted. [Official restriction](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Concrete settings proposal, not applied

If a fresh read proves template editing is available and the current Magic Link template lacks a numeric code, the sole proposed settings change is the Magic Link email body in existing project scmvedfqwlhkyvljymjj to [this exact pending HTML](contracts/auth/owner-email-otp-template.pending.html). It contains {{ .Token }} and no ConfirmationURL, SiteURL, source metadata or credentials. Preserve the current subject and all other templates, signup/anonymous flags, providers, SMTP credentials, rate/expiry/security settings, account password and redirects. Obtain exact action-time approval before applying that body. If existing OTP length differs from the prepared six-digit UI, adapt and retest the UI to the observed value; do not silently change provider settings. If customization is unavailable, report that concrete limitation and prepare a separately reviewed exact callback alternative before any mail; do not activate a localhost-bound link or broaden redirects.

No email has been sent. The selected flow is explained above; only after readiness/settings qualification may an explicit Owner button request their code. Existing recovery remains isolated and unchanged. Mail delivery and actual Owner acceptance must be separately observed. [Official passwordless guide](https://supabase.com/docs/guides/auth/auth-email-passwordless), [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [nonsecret management read target](https://supabase.com/docs/reference/api/v1-get-auth-service-config).

## Verification and publication

Verification receipts and exact final source/Preview evidence are appended after checks. No Production/SQL/RLS/grants/SMTP/security/password mutation, real workflow merge/deploy, dispatch or AWS activity. Finalization fixture core remains preserved/live-disabled; priority user-facing work is independent. The receiving Agent must fresh-read this handoff/source and the missing readiness fields before activation; older saved config is not current authorization.

## Local verification

Portable945/focused47/build/portable validation/static safety PASS, forbiddenAttempts0. Actual-app/pinned-SDK OTP21 cases across320/390/1440 PASS: same-page request/verify, retained existing TOTP and reload/logout, provider outage/expiry/wrong Owner/bridge denial, pending request and verification scope switch. Password SDK compatibility5 fresh touch cases PASS; current mobile task entry3 PASS. All upstreams synthetic except the explicit read-only public settings200 and connected project metadata; actual email/Owner writes/external/unexpected writes0. Deployed OTP false. [QA receipt](qa/mc-owner-email-otp-20261011/verification.json). Final current-root and publication checks follow.

## Previous root prefix (exact bytes)

```text
# Current mobile task entry / navigation release — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T22:50:49.087Z
Task: Signed-out/checking feedback and visible website/list actions
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: facbb4cfb3660637003918baa61d585d007dc303

Task entry reveals scoped login/checking/loading feedback, focuses login/editor, preserves same-scope input and cancels switch intents; Owner/AAL2/session/membership gates retained. Exact56ea279 navigation slice integrated as5791b0f; candidate pending and known URLs preserved. No hierarchy8049af6.

Evidence: docs/MC_MOBILE_TASK_ENTRY_20261011.md. Baseline RED; entry3/navigation9(54 scopes), focused137/portable936/build/validate/check/root20 PASS. Runtime6b3465b exact fixed Preview dpl_2ysABZv3ukKtD1eH1QtrmTWy7cEM READY, Production unchanged. Final docs receipt follows. Preflight/motion/SQL/Auth settings unchanged. No email/actual Owner writes. Fixture finalization core22 groups/review4 PASS, live disabled; docs/MC_FINALIZATION_CORE_20261011.md records missing connections/action grants.

Next Action: finish final exact Preview/terminal, then approved passwordless readiness/code. Joey22:41:48UTC approved direction; prefer same-page OTP with existing TOTP/AAL2/private gates. No password deletion/SMTP/signup/redirect/security changes without exact required approval; no sending before flow explanation. CONNECT403 before app not bypassed, served/Owner acceptance pending. No Production/new keys/SQL/permissions/dispatch/AWS.

```

## Verified disabled-code publication

Runtimec97a2508100c199f70fd057a0be3a48a1871fce9 exact canonical remote and fixed Preview dpl_6bDyUTJTEduX2F47XsSGRpLX77Jq READY; connected alias and independent ID match. Original Production dpl_5GgJ8LhD4Ec73RGz9CEFe1ppZQnh / 8b4945b16a0b23f2e72033aa976fa34f94eabec0 unchanged. Current root20 PASS, prior dated handoff history preserved; earlier task feedback/navigation and finalization core unchanged. OTP still false, no email/settings mutation. [Runtime receipt](qa/mc-owner-email-otp-20261011/runtime-publication.json). Normal cloud HTTPS still CONNECT403/HTTP000 before application, servedCheckedSha=null; no bypass. Final documentation HEAD is checked independently before the terminal, with final metadata and immutable report verification kept in the private final receipt. Missing exact read remains the readiness blocker described above.
