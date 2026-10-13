# Reading panes, graph and stable refresh — 2026-10-13

Project: MISSION_CONTROL
Timestamp: 2026-10-13T14:34:27.000Z
Task: Implement authorized reading panes, source-backed graph and stable refresh
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Canonical baseline: `8a045905b31386e4686148c75149ba4d3dcdc266`.
Feature branch: `codex/mc-reading-graph-refresh-20261013`.

## Summary

The exact underlying model identifier was not supplied by the API environment.

Joey explicitly authorized all three UI changes at 13:32 UTC. The local candidate implements resizable/collapsible/enlarged reading panes, source-backed project/Agent/task/outcome graph selection and stable refresh with the existing NexAeon fisheye border marker. Report reading DOM, native selection, focus, scroll and pane preferences persist across data refresh. Existing source/data/security boundaries remain intact.

## Verification

[Implementation, tests, visual evidence, limitations and separate publication instructions](docs/MC_READING_GRAPH_REFRESH_HANDOFF_20261013.md). Full portable suite: 1111 PASS; local Chromium reading/network/file QA: 18 PASS across desktop/mobile and three locales; build/check PASS. Mac canonical `validate` is unavailable; an obsolete Joey-only browser entry fails identically on canonical baseline. Real Owner/device/served Preview and Joey acceptance remain pending.

## Next Action

Only local implementation, tests, documentation and commit were authorized here. Nothing was pushed, merged or deployed; Production/Preview, database, grants, credentials, automatic intake/approval runtime, pet diary and AI Interactive Experience Engine remain unchanged. The prior attributed handoff is retained verbatim below.

---

# Reviewed runtime-OFF integration — 2026-10-12

Project: MISSION_CONTROL
Timestamp: 2026-10-12T23:50:20.000Z
Task: Integrate reviewed dynamic-project code while preserving inactive runtime and live schema
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Reviewed source: ef3b26bfcbbe1a3e9a57316b95d17c85ac36ed4b

## Summary

Parent independent review GO permits code integration with dynamic runtime OFF. Real-router/private catalog fencing, three-project list isolation, same-scope form, revision-bound review and current-review final handoff are integrated. Canonical vercel.json is retained byte-exact; the reviewed guard and its commit ancestry are excluded. Publication uses one new commit parented only by canonical e1a5c88. No live grant, credential, migration or real task execution is included.

## Verification

156 focused tests and build pass on this integration. Prior repaired candidate passed real app/router synthetic lifecycle and four maintained existing UI cases. [Release scope and live preflight](docs/MC_RUNTIME_OFF_INTEGRATION_RELEASE_20261012.md); [reviewed runtime repair evidence](docs/MC_DYNAMIC_PROJECT_RUNTIME_REPAIR_20261012.md). Actual served-page/Owner/Agent acceptance remains unverified.

## Next Action

Read-only live schema source/ownership/ACL/RLS fingerprint matches the recorded baseline. SQL installation is still HOLD: both membership rows are not fully enforced by the proposed guards, and PostgreSQL17 live role attributes differ from the PostgreSQL16 fixture. Parent owns the specific installation approval after resolving these items. Registry secure writer binding and named-project grants are separately pending. Dynamic runtime, automatic dispatch/merge/deploy remain OFF; Production and eleven reports/history are unchanged.

## History

[Prior private review handoff](docs/history/HANDOFF_20261012_ef3b26bf.md) and linked earlier handoffs remain byte-exact. New release metadata/actual acceptance are recorded separately; this attributed checkpoint is not a runtime or product-completion assertion.
