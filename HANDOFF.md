# Authorized new-project client slice — private review checkpoint

Project: MISSION_CONTROL
Timestamp: 2026-10-12T22:48:00.000Z
Task: Connect explicit project authorization to picker, task RPC and Agent handoff
Status: LOCAL_SYNTHETIC_VERIFIED_PRIVATE_REVIEW_PENDING
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540

## Summary

The actual picker and existing task/source/report UI consume a separately Owner-authorized registered project. Synthetic end-to-end selection, RPC save, first bound report and project-specific handoff pass. Registration alone remains unavailable; revocation purges selection. No real Agent, task, repository creation or deployment ran.

## Verification

123 related unit tests and the synthetic new-project browser flow plus four maintained existing UI cases pass; build passes. Disposable PostgreSQL validates proposed scope SQL and exact rollback with a synthetic session helper. Live SQL/grants/credentials and actual Owner/Agent acceptance are unchanged and unverified. See [client slice evidence and remaining activation work](docs/MC_DYNAMIC_PROJECT_CLIENT_SLICE_20261012.md). Existing eleven reports/history and Production remain unchanged.

## Next Action

Review this source-only private candidate. Complete authoritative runtime grant/routing and review/reconciliation consumer wiring, independently review the exact SQL against the installed baseline, and activate one specifically authorized private project only after required connection/approval. Registry writer binding remains pending. Autonomous dispatch/provision/merge/deploy remain OFF.

## Previous handoff

Canonical e1a5c88 root bytes are preserved in [previous handoff](docs/history/HANDOFF_20261012_e1a5c88.md); older linked history remains intact. This guarded private review branch must not deploy.
