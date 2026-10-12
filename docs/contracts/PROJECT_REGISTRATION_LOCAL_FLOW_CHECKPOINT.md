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
