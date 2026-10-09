# Four-project source sync preparation — 2026-10-09

Status: SOURCE_WIRING_FIXTURE_VERIFIED_RUNTIME_PENDING. MC baseline: 3fc3f8b0462fd592f2bed38646f38e75bcfeea5f. The approved allowlist and thin entry adapter now connect through the existing private endpoint and 30-second consumer. Exact publication identity is in the sealed receipt. Settings scope is parent-verified; normal authenticated Preview readback is still pending. No secret value or environment setting was read or changed through tools.

## Minimal implementation

Reuse createGitHubHandoffRepositoryReader for explicit repository/ref/path GETs and immutable revision reads. Reuse createRemoteHandoffReader for the existing 30-second visible-session scheduler, exact Owner checks, expiry, retry, stale last-confirmed source and private-data purge. Reuse the private source renderer. Do not add a second reader, API, scheduler or UI.

The current MC-specific handoff parser requires MC handoff paths and structured fields, so it rejects real README entries before I/O. The thin entry adapter verifies file type, UTF-8, size, Git blob and SHA-256, resolves one HEAD per read, then pins entry/context reads to that SHA. Plain entries with no signature remain successful reads with unknown Agent/update time. Only explicit primary-entry header metadata is used; historical sections, fenced examples, context authors and Git authors are not signatures. Runtime connection, current Agent/model, execution authorization and product acceptance stay false/unknown. Errors expose fixed categories and never upstream bodies or credential values.

The existing deployment factory now selects these fixed configs and the thin adapter for four-project reads. Owner/AAL2 verification remains before and after source I/O. The same renderer shows source SHA/read time, unknown document time/signature and immutable verified links; project/candidate switches clear the old source. Copy refreshes and revalidates; no second API, reader, scheduler or model selector is added. The prior private snapshot endpoint remains available for compatibility, while the current UI uses the source component.

## Exact application read allowlist

| Project / repository | Ref / primary entry | Context files |
|---|---|---|
| NEXAEON / JoeyAJ/nexaeon-web | main / README.md | docs/development-history/README.md; docs/STAGE_5_2_ACCEPTANCE.md; docs/architecture/ADR-0054-n8n-tool-runtime.md; docs/STAGE_5_4_B_EXPLORER_N8N_CONFIGURATION.md |
| WOOSONG_BUDDY / JoeyAJ/woosongbuddy | main / README.md | AGENTS.md; CLAUDE.md; docs/RELEASE_20261006.md; docs/THEME_PUBLIC_TEST_RELEASE_20261006.md |
| NAMYOUNG_WEB3D / JoeyAJ/namyoung-web3d | main / README.md | docs/PRODUCTION_REBUILD.md |
| JOEY_ASSET_SYSTEM / JoeyAJ/joey-asset-system | main / README.md | SYSTEM_CHARTER.md; cases/CASE_001_NAMYOUNG/README.md; provenance/CASE_001_NAMYOUNG_RECOVERY.md |
| Asset University, explicit separate candidate | migration/university-v04-portable / DEVELOPMENT.md | modules/education/university-lifecycle/docs/HANDOFF.md; docs/UNIVERSITY_PORTABLE_MIGRATION.md; docs/CASE_002_UNIVERSITY_HANDOFF.md |

The last row never replaces main or implies Joey acceptance. No arbitrary repo/ref/path, feature branch, environment file, account/auth cache, student record, archive or binary is included. Each source read is capped at 65,536 bytes per file. Existing observed SHAs are comparison anchors, not latest-HEAD assertions.

## Read scope approved and configured — parent evidence 2026-10-09

Joey approved the exact four-repository expansion. Parent reports the separate Mac worker saved and reopened the existing token settings: selected repositories are MC plus exactly the four below; Contents/Metadata remain read only; no user permissions; original expiration 2026-11-08; no token value read or regeneration; Vercel unchanged. This is settings evidence, not a website runtime readback. The list below preserves the approved scope; no repeated permission request is needed. Private wiring is implemented and fixture verified; normal authenticated source readback remains pending.

The completed selected-repository scope retains MC and adds exactly JoeyAJ/nexaeon-web, JoeyAJ/woosongbuddy, JoeyAJ/namyoung-web3d and JoeyAJ/joey-asset-system. Preserve its existing owner, token type, expiration, Contents read and Metadata read. No token creation, regeneration, expiration extension, value disclosure or additional permission is requested.

GitHub's reference and repository-content GETs require Contents read for fine-grained credentials: [Get a reference](https://docs.github.com/en/rest/git/refs#get-a-reference), [Get repository content](https://docs.github.com/en/rest/repos/contents#get-repository-content). Selected-repository access is repository scope; the application enforces the narrower branch/file allowlist above. [GitHub token management](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) documents repository selection, permission selection and expiration.

Keep the existing Vercel project/team and Preview-only binding for codex/mc-command-center-checkpoint-20261006. Preserve the existing expiration and Production settings. No Actions, pull-request, issue, administration, account or organization permissions are needed. No new key, domain, service, grant, SQL or other-project write is requested. The expiration/scope evidence is supplied by parent from the settings worker; actual runtime repository access remains unverified.

Permission approval and setting changes are not live-sync acceptance. The reviewed wiring replaces the MC-only factory restriction with these fixed configs and retains Owner/AAL2 checks and the existing scheduler/rendering. Bounded real readback still must establish access, current SHA, verified entry bytes and all context statuses for each default main entry and explicitly selected candidate. Fixture requests use synthetic credentials only; no real cross-repository token request was made by tools.

## Verification and next acceptance

63 affected unit/contract checks pass; 12 actual-app/official-SDK four-project browser cases plus three MC takeover and three local transport regressions pass. Synthetic credentials and fetch responses exercise all four entries, revision changes, same-SHA file reads, unknown signatures, conflict/missing/oversize/invalid blobs, denial purge, sanitized outage/retry, 30-second scheduling, revocation, expiry and late replies. No real GitHub token reads, SQL, model execution or external requests were used. Browser/build results are recorded in the stage receipt separately; synthetic Owner checks do not prove normal Owner HTTPS acceptance.

Next connected stage acceptance: actual latest SHA and readAt are visible separately from documentTimestamp; ordinary README without root handoff works; only verified files receive immutable links; absent signatures remain unknown; transient failures retain clearly stale last-confirmed evidence; denial/expiry/logout/project switch clears private content and suppresses late replies; main/candidate qualification remains distinct; private source bytes and credential/config stay outside the public bundle; desktop/mobile and existing MC takeover regressions pass. The shared [stage template](STAGE_HANDOFF_TEMPLATE.md) lets a newly executing Agent record its own actual signature, tested source, tests and next steps without asking Joey to reconstruct history.
