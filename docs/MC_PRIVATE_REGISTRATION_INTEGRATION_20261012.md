# Private project registration integration — 2026-10-12

Qualification: reviewed code and guarded empty private catalog initialized; runtime registration unavailable. Actual served Preview and Owner/provider HTTP remain unverified. No project was imported.

Canonical integration base: `6861fa68c87b89e84e0d75482304e56fe4aa8097`.
Independently reviewed worker source: `623995ce551d39b7b3288c17c6a7c24621a5e3fa` on `codex/mc-registration-local-flow-20261012`. Parent relayed narrow review GO before live changes. Three prior blockers were confirmed repaired: HTTP401/403 purges private state with zero catalog fallback; unlisted existing project tree paths cannot be overwritten; revocation/receipt expiry during final destination identity read prevents the Git mutation.

Joey's explicit approval at2026-10-12T14:05:00Z covers the existing private MC repository's `mc/registry` data branch, its deployment exclusion and bounded server registration write connection after review. Each actual private project still needs exact Owner selection/read confirmation. It grants no arbitrary import, new credential/credential transmission, Agent execution/report writes, automatic merge/deploy or Production release.

## Storage and deployment evidence

Created exactly `refs/heads/mc/registry` in private `JoeyAJ/joey-mission-control` (numeric1404959099), initial commit `8ecae766a50bc9793f1dcb6bb64349e815e81676`, tree `8a4607211fdb056d151b4216a9c1b2d6e1fa208c`. Orphan commit has no application parent. Remote fetch/ref/complete tree/blob readback and repaired catalog validation passed. Four files only:

- `PROJECT_REGISTRY_V1.0.md` and `MEMORY_INDEX.md`, empty valid private catalog documents.
- `.mission-control/registration-ledger.json`, zero entries and the five exact reserved existing repository numeric IDs.
- `vercel.json`, exact `{"git":{"deploymentEnabled":false}}`, present in the initial tree before branch publication.

No app source/workflow/secret/project import was placed in the branch. Existing effective repo-root evidence is recorded in MC_REPORT_AWARE_TAKEOVER_VERIFICATION_20261010.md. No Vercel project/other branch setting changed. Two subsequent branch-filtered Vercel deployment lists returned count0; GitHub combined-status listing was empty. This is guard/static configuration plus observed deployment absence, not a provider-signed skipped-build receipt. Existing `mc/progress` guard/report data was read-only.

## Runtime remains fail-closed

Non-decrypted Vercel project environment metadata shows only `MC_GITHUB_READ_TOKEN`, Preview canonical branch. No `MC_GITHUB_REGISTRY_WRITE_TOKEN` is configured. Existing supported GitHub development connector has viewer push/admin permission; it is not a deployed credential. Connect project links returned404 and team connector listing403; no runtime write binding was established or token requested.

Server activation stays `enabled:false`, qualification `APPROVED_CATALOG_RUNTIME_BINDING_UNAVAILABLE`, approval reference `owner-registration-20261012`. The browser's inactive message says registration is unavailable in zhTW/en/ko without repeating an approval request. Inactive capabilities perform no new private source/catalog read or write. Owner/AAL2/current-session/private/no-store guards remain. The source reader token was not decrypted or repurposed.

Supported secure user-direct setup: Vercel's authenticated MC project Environment Variables form, name `MC_GITHUB_REGISTRY_WRITE_TOKEN`, Type Secret, Preview only, branch `codex/mc-command-center-checkpoint-20261006`; user/admin enters an existing authorized MC-only Contents-write credential directly in Value and saves. No secret belongs in chat/tool arguments. No agent-side secure input form was exposed. If such an existing credential does not exist, new MC-only fine-grained credential/App grant issuance and secure provisioning need separate authorization. No immediate user redeploy is needed; the sole integration writer owns the reviewed Preview release. Registration is not activated by metadata alone.

References: [Vercel branch guard](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled), [direct environment form](https://vercel.com/docs/environment-variables/managing-environment-variables), [Secret values](https://vercel.com/docs/environment-variables/sensitive-environment-variables), [GitHub minimal repository/permission selection](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

## Verification

- Reviewed merge into canonical has no conflicts. Full portable1079 tests/build/schema validation/static safety checks PASS, forbiddenAttempts0.
- Focused registration63 PASS, rerun after inactive qualification/message correction. Final build PASS and regenerated official Owner browser bundle included.
- Actual-app browser fixtures20 cases at375/390/430/1440 with zhTW/en/ko preview labels, exact saved draft/source consent, real local eight-file Git commits/readback, private catalog and revocation clearing: PASS. Four intended local commits/four synthetic draft saves; external requests/writes0, task writes0. Owner/GitHub upstreams synthetic; screenshots remain local and were not uploaded. Initial run omitted the required cloud-draft fixture flag and timed out at hidden Save; corrected invocation passed. It was not an app defect or actual Owner success.
- Canonical baseline Preview `dpl_B65ED5p38aQQPRY9HAinyvguho9M` metadata READY/exactSHA/alias verified. Ordinary served GET returned CONNECT403 before app. No bypass. This integration's code release metadata will be reported separately after its one authorized push; documentation does not preclaim it deployed.

No SQL/grants/Owner auth change, saved-only task execution, progress write/history rewrite, AWS pilot, other-repository write, automatic dispatch/merge/deploy, private source/screenshot upload or Production change occurred. Existing installed private finalization journal is separate; actual OwnerHTTP remains pending. Existing handoff retrieval failed before bytes and was not bypassed; unpublished83bec03 work is excluded.

Remaining gates: verified authorized server binding, policy enablement after connection/exclusion checks, actual Owner-selected private project/source confirmation and normal OwnerHTTP registration/readback. Registered projects still have separately pending source continuation/report scope/development/task membership/delivery. Overall MC product acceptance is not complete.

Rollback: keep runtime OFF; preserve guarded catalog and every receipt/history. If later a mutation's response is lost, reconcile original request/digest at pinned catalog head instead of deleting/repeating with a new ID. Disable only a newly added registry writer binding through its authorized provider administrator if needed; do not touch existing reader/Owner/other-project grants. Do not force-reset/delete data branches or alter other deployment policies.
