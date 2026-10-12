# Local registration flow checkpoint

Isolated branch: `codex/mc-registration-local-flow-20261012`.
Actual canonical code base: `8d0a4ab99d5ac46e72e864e9ceed465418c7356c`.
The reviewed receipt candidate and repair are cherry-picked on this branch.
Live writes, data-branch creation, SQL/auth/credential changes remain off.

Planned source ownership for parent/sole-writer coordination:

- New registration Git adapter, catalog parser/project projection, private application
  server, browser controller and browser view under `src/onboarding/`.
- Existing `src/onboarding/project-registration-server.mjs` and
  `project-registry-writer.mjs`: small adapter/validation reuse changes.
- Existing `src/onboarding/project-onboarding-view.mjs`: one optional registration
  panel hook, preserving draft/bootstrap controls.
- Existing `src/continuity/owner-browser-entry.mjs`: registration client/controller
  injection alongside the existing onboarding controller.
- Existing `api/index.mjs`: private registration/catalog route hooks only, with the
  server-only activation disabled.
- Focused tests and a separate browser fixture. Generated Owner browser bundle is
  rebuilt for local QA and excluded from this isolated integration change.

No task/finalization/report/source allowlist, authentication provider/config,
database schema, canonical snapshot or public project API edits are planned.
Parent owns coordination; integration hooks are kept small for manual conflict
resolution if the sole writer advances those files during closure work.

Review-ready implementation now includes an expectedHeadOid Git mutation, exact
commit/tree/ledger readback, durable lost-reply replay, private catalog GET with
per-project projection, and explicit saved-draft verification/confirmation UI.
41 receipt-boundary tests plus 9 native Git/application tests and 6 browser-client
tests passed. All 1,054 portable tests and 20 full-app browser cases passed; widths
375/390/430/1440, English/Traditional Chinese/Korean, private/public isolation and
revocation are included. Source/auth upstreams are synthetic; Git effects are real
objects in temporary local repositories. No actual Owner acceptance is claimed.

Runtime activation remains `enabled:false`. There is no data-branch creation API,
new repository creation, SQL/ACL/Auth change, deployed credential change, live Git
write or deployment. New private catalog cards are shown in the existing New
Project panel, not embedded in the public snapshot or public browser bundle.

Activation requires the approved private MC `mc/registry` data branch with
deployments disabled and valid seed registry/index/ledger; a repository-scoped
runtime writer binding; and Owner consent for each saved draft's exact existing
private repo/ref and seven fixed regular files. GitHub Contents write is native
repository-level permission; branch/path limits are enforced by the adapter.
Source continuation/reporting, project database membership and verified delivery
remain separately pending. Importing an existing repo is implemented; creating a
new repo is not.

Reproduce: `npm run verify:portable`; then
`MC_REGISTRATION_QA=1 MC_CLOUD_DRAFT_QA=1 node tests/browser/joey-simple-takeover-qa.mjs /tmp/mc-registration-browser.json`.
