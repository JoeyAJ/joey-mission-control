# MC bounded delivery-evidence stage

Started from e63d71bdcc50ae9139c8dc7793598b710a829964; recorded 2026-10-10T23:52:42.932409Z. Joey authorized a backward-compatible versioned report/helper/reader/UI stage through parent. Existing MC branch/fixed Preview only. Actual Codex development run codex-mc-delivery-evidence-20261010 (v1 until support publication), predecessor codex-mc-activity-follow-20261010. No existing terminal run append/version conversion.

## Minimal design

Retain strict mc.repository-run.v1 and default helper behavior byte shapes. Explicit mc.repository-run.v2 adds immutable taskKind and event.delivery (null or complete bounded snapshot); existing result codeSha/tests/nextSteps/handoff is unchanged. Every delivery snapshot is AGENT_REPORTED and binds project/track/repository/run/task/workRef/code SHA. Deployment target/ID/status/deployed SHA, permitted public HTTPS URL, actual functional check method/result/time/evidence, handoff currentness and data/migration state are declarative. A null/new snapshot never inherits a previous deployment check. No caller trusted-verification field and no arbitrary URL fetch. Fixed alias evidence is dated, not proof of a later deployment.

Only MC BASELINE's already authorized Preview target and fixed public HTTPS URL are permitted by the current public policy. Other scopes can use v2 with missing evidence; new URL/target/N/A policy must be explicitly approved before expanding support. Documentation-only deployment/URL N/A requires MC_DOCUMENTATION_ONLY and a reason; data N/A requires MC_NO_DATA_CHANGE and a reason. Feature deployment cannot be skipped by prose. No private repository/Owner identity is added to the public helper policy.

## Work and verification

Implement strict v2 validator, default-v1 generic helper plus private delivery-template preparation, source/read/continuation support, localized simple/report/workbench presentation and cross-agent closure instruction. Tests cover old v1 roundtrip, valid/invalid v2, missing evidence, credential/foreign target/URL/trusted-status/SHA/scope/time rejection, N/A policy, terminal immutability, copied-helper mixed-version publication, private reader and currentness withdrawal. Browser actual app/official SDK uses synthetic Auth/GitHub/report/clipboard at 1440/390 × zhTW/ko/en; inspect actual screenshots. Run applicable full unit/build/privacy/source/reading/cancellation regressions.

Parent's additional equal-time ordering defect is included: timestamp ties sort by runId, numeric sequence, then deterministic final key; activity latest selects highest numeric run sequence. Equal-time z-start / a-progress and reversed array tests must show sequence 2, not older 1.

## Publication order and real example

First publish tested versioned reader/helper/UI support and verify exact remote SHA/Preview READY/alias. Only then emit a new-version same-scope delivery followup run with predecessor. Use actual existing Git/Vercel observations and an actual permitted fixed-URL attempt only; cloud CONNECT403 stays BLOCKED/unverified, never PASS. Old reports remain byte-for-byte and terminal. Consolidate current HANDOFF, contract, checks, private receipt and next actions. Independent provider/served verification is not ingested through any trusted UI path; it remains absent/pending. Product acceptance remains Joey pending. No background fetch, new credential/permission, SQL, Production or other repository/report change.
