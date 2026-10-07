# Owner authenticator rendering correction

The previous UI could complete a provider MFA operation without presenting its
result. A session-refresh event started a status check that incremented the same
generation used to protect an in-flight enrollment or explicit restart. The
completed result was then discarded. Status-check revisions are now separate from
the generation that invalidates work on logout, project changes, or disposal.
Fresh provider user and server-session checks still guard each MFA operation.

The pinned official SDK prepends a data-URL header to raw provider SVG. Assigning
that value directly to an image can interpret SVG color hashes as URL fragments.
The UI now accepts the provider generator's XML declaration and comment header,
percent-encodes the SVG, keeps it in an image rather than injecting
markup, and reports image-load failure. Bounded SVG above the old 100KB threshold
is supported. Only the approved SVG format is accepted, with a 1MB input limit.
No CSP or host permission was loosened.

Provider errors previously shared a generic sign-in failure. The UI now presents
fixed, localized MFA reasons and a fixed `data-mfa-error` classification. Raw
provider messages, enrollment payloads, account identifiers, QR content, and codes
are not included in diagnostics. Confirmed factor removal clears the old restart
target before new enrollment; unconfirmed removal does not trigger enrollment.
Existing verified factors require only their current code. New enrollment and
unfinished-factor removal remain explicit user actions. Nothing repeats those
actions automatically.

Validation uses provider-shaped synthetic responses, raw SVG, image-load checks
under the deployed CSP shape, session refresh during enrollment and restart,
verified factors, safe provider errors, invalid SVG, and logout during enrollment.
The old revision reproduces missing results and failed image rendering. The new
revision is checked across three languages and desktop, 390px, and 320px widths,
alongside the existing Owner and recovery regression suites. Portable verification
passes 430 tests. The MFA browser matrix passes 72 cases, with nine existing Owner
and nine integrated Recovery regression cases passing separately.

These tests identify reproducible code defects; they do not reveal the user's
actual provider failure code. A read-only browser check of the corrected UI can
capture only the fixed classification if the real operation still fails. No real
factor, credential, session, provider setting, or database was changed by testing.
The fixed protected preview is the release target; production and protection
remain unchanged. Real Owner/AAL2 acceptance remains a user-owned check.

Official references:
https://supabase.com/docs/reference/javascript/auth-mfa-enroll
https://supabase.com/docs/guides/auth/auth-mfa/totp
https://github.com/supabase/auth/blob/master/internal/api/mfa.go
