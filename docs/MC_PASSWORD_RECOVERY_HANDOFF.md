# MC app password recovery

The private workspace sign-in now opens a separate recovery page at
`/owner-password-recovery.html`. The user enters their own MC account email and
explicitly submits the request. The request supplies the exact configured preview
origin plus this callback path as `redirectTo`; it does not rely on the provider's
default Site URL. Request completion deliberately does not confirm whether an
account exists.

The callback uses the pinned official SDK in an isolated, nonpersistent session.
Before allowing an explicit password update, it confirms the current provider
user, the configured Owner subject, and the fresh server session bridge. An
existing verified authenticator is challenged when required. Recovery does not
enroll or remove factors, replace the normal Owner session, or unlock private
records or execution. URL credentials are scrubbed after initialization; password
and authenticator inputs are cleared on submission and disposal.

The email-request adapter has its own nonpersistent client and does not consume
callback credentials. No account email is embedded in source. Loading the page,
changing language, or returning to sign-in sends no email and changes no password.
Return navigation preserves the approved project and language and opens the
private workspace sign-in. Traditional Chinese, English, and Korean are supported.

## Configuration and publication boundary

The existing public Owner configuration supplies the approved provider, public
identifier, fixed Owner subject, and preview origin. The separate recovery flags
record the authorized exact callback readback and permit user-triggered actions.
They are client gates, not a replacement for provider authorization. The authorized
settings task confirmed the exact callback allowlist entry; its default Site URL
remains localhost and its email template remains the default ConfirmationURL.
Use this app's explicit request rather than a dashboard reset that omits redirect.

This change contains generic source, official SDK output, isolated tests, and this
handoff. No database migration, Auth setting change, production alias change,
private import, or deployment-protection change accompanies it. The existing
protected preview requires Vercel access in the browser before the app or emailed
callback can be opened.

## Validation and remaining acceptance

- Portable verification: 426 tests passed, zero failures, skips, or forbidden
  attempts; build, validate, and check passed.
- Browser verification: nine existing Owner lifecycle cases, nine recovery UI
  cases, and nine integrated recovery cases passed across three languages and
  desktop, 390px, and 320px widths. All Auth operations used isolated synthetic
  fixtures; no real email was sent and no real credential was changed.
- Integrated cases cover exact redirects, delayed recovery events, invalid links,
  verified versus unfinished factors, explicit submissions, secret-field cleanup,
  normal-session preservation, return navigation, reload, and disabled configuration.
- Official output excludes test fixtures and private repository modules. The
  static allowlist exposes only the required public recovery assets.

Publication state and the exact remote/deployment SHA must be recorded separately
after readback. Real email delivery, protected callback browser acceptance, Owner
sign-in, and AAL2 remain for the Owner to complete personally. A build or fixture
pass does not establish those real-user results.
