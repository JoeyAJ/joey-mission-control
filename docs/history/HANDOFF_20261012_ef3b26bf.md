# Dynamic-project integration repair — guarded private review

Project: MISSION_CONTROL
Timestamp: 2026-10-12T23:30:37.000Z
Task: Complete runtime scope routes, real router and revision-bound review/handoff; repair independent HOLD
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Prior reviewed/HOLD source: 0e60883249dc1fa76014be79ca82e7b1789051a6

## Summary

One real app/router synthetic workflow now selects an explicitly authorized new project, saves its task through scoped RPC, reads completed reports and PR/tests, records request changes for rev1, saves rev2, records approval for that exact tuple, and prepares final handoff with the current Owner review. The fixture includes one fixed and two authorized dynamic projects. Registration-only stays disabled; revocation purges private selection. No actual Agent, task/repository creation or live deployment ran.

## Verification

The four independent HOLD groups are repaired and tested: real router/current scope; generation-fenced catalog and retained same-scope form; scope-safe global task list with physical capacity/CAS; structural immutable SQL CHECK plus grant-enforced read/write boundaries using fresh clock after locks. Apply/rollback uses a non-superuser postgres fixture with ADMIN membership, SET/INHERIT false at rest, the recorded temporary ownership protocol, and exact ACL/volatility restoration. Native auth helpers remain synthetic. [Evidence, schema contracts and activation steps](docs/MC_DYNAMIC_PROJECT_RUNTIME_REPAIR_20261012.md).

## Next Action

Independent review of this coherent source/SQL candidate. Runtime activation remains OFF; SQL and grants are NOT APPLIED. Verify exact installed schema/membership preconditions before any explicit SQL approval. Morning secure registry binding is separately pending. Then one reviewed canonical Preview release and actual Owner/Agent acceptance. Autonomous dispatch/provision/merge/deploy and Production remain unchanged.

## Integration boundary

vercel.json deploymentEnabled:false is review-branch-only. Eventual canonical integration must retain its original vercel.json (read its exact blob from canonical e1a5c88) and exclude review guard ancestry from canonical commits. Do not blindly merge this guarded review commit. The current canonical e1a5c88 tree is the source of truth.

## History

[Prior private handoff](docs/history/HANDOFF_20261012_0e608832.md) and linked e1a5c88/older archives remain byte-exact. The earlier component-only fixture is not real-router evidence and is superseded by this repair.
