# PR/CI reviewer corrections — bounded privacy and source correlation

Baseline: 95d850f6779089cd6e6d61863c7079e8065cdcf1. Actual developer: Codex; actual model UNKNOWN. These corrections preserve the existing read-only surface, Owner policy, canonical scopes, exact code/report bindings, task/draft activation and report history. No new feature, SQL, credential/grant, model, AWS, dispatch, merge or deploy executor is introduced.

The reviewer reproduced two defects. Provider workflow/check/status-context names with quoted credential keys passed the previous narrower label guard and could reach the Owner response/DOM. The server now reuses the established development-task sensitive-text guard, retaining its prior conservative prefix/control checks. The client independently rejects such labels and status-context IDs. Unsafe provider names are redacted before a response; provider output/body/log fields remain dropped. Tests cover double/single quotes, whitespace, case, embedded credential dictionaries, all three name channels, both server response and client trust boundaries.

A delayed response could also be accepted after the current browser canonical source finished reading a newer HEAD. This is stale correlation, not a demonstrated different-repo/code attribution. Reconciliation now requires current connected FOUND source, captures its project/track/repo/ref/HEAD and source generation, and compares that exact tuple with current source and the response after every dependent read/Owner check. Source reading/change invalidates pending work even if the source returns to the previous HEAD. The final outer Owner await has the same post-await source guard. Ordered actual-client tests cover an initially reading source, changes during report refresh/response/final Owner check, silent snapshot changes, change-and-return, and project/track/repo/ref changes. Actual-app browser tests hold a completed authenticated response, refresh the actual source to a new HEAD, then release the old response; no old result is displayed.

The exact short Owner flow and safe diagnostic categories are in [the one-screen test](MC_OWNER_PR_CI_ONE_SCREEN_TEST_20261011.md). New-task cloud save/reload can be tested independently. The MC legacy-report-to-new-task-ID mismatch is stated honestly; no report is reassigned or fabricated to enable the button. Runtime GitHub permissions remain UNKNOWN until an eligible actual Owner endpoint result is observed. Vercel bounded count/schema/file-tree reads cannot substitute for it; no session/credential/protection bypass was accessed.

Supporting synthetic and publication evidence: [private receipt](contracts/repository-reporting/receipts/pr-ci-review-fixes-20261011.json). Original terminal PR/CI run remains terminal; corrections register a new v2 BUGFIX receiving-Agent run with its own immutable baseline and predecessor. The original 20 files and first page2 report stay unchanged.

## Preserved prior current checkpoint

The following prefix is copied byte-for-byte from 95d850f before replacing the current root checkpoint. SHA256 07b39eaf7e292ecd9d466fdc06090001eb3515186086eb17e76d1e6304fffc3d. All pre-existing dated root history below its boundary stays in place. No report history is moved.

# Current PR/CI read-only increment — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T09:45:26.058Z
Task: Existing task / Agent report / exact-commit PR-CI inspection
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: fe1a5b6d783e4dd1768b0fd98520524ae2aba21d

Private completed-task inspection separates Agent tests from GitHub PR/check/status/Actions metadata. Full report scan and canonical repo/track/exact commit, pre/post Owner/HEAD/report binding, bounded complete reads and expiry/switch/edit/failure clearing; no arbitrary URLs/logs/raw output/storage. CI empty/permission/outage/conflict/overflow stay qualified; no acceptance/merge/deploy action. Report lacks requirements revision; Joey must check current request. University candidate stays pending; main PR cannot qualify it.

Portable840/build/validate/check, focused9 and32 synthetic actual-app browser cases PASS. Live runtime PR/CI permission UNKNOWN; connected-app reads are a distinct credential. Actual Owner HTTP/device acceptance pending; cloud CONNECT403 is not bypassed. Existing approved tasks/drafts ON, fresh Continue and40-run history preserved. New Codex run starts page2, predecessor prior terminal task run; never append that terminal run. SQL/Auth/secrets/permissions/Production/other repo/AWS/model/dispatch unchanged. Do not recreate rejected VM artifacts.

Next Action: authorized Preview c4d089f READY; Owner inspects a completed task via 重新核對 PR／CI. Details and current publication receipt: docs/MC_PR_CI_RECONCILIATION_20261011.md.

