# Single rejected pilot maintenance

Joey approved the exact historical exclusion at 2026-10-10T06:36:48Z. Server-only code controls this decision; a reporter cannot supply or authorize a maintenance receipt.

Receipt ID: `mc-terminal-scope-pilot-maintenance-20261010`.
Scope: `MISSION_CONTROL / BASELINE / JoeyAJ/joey-mission-control / mc/progress`.
Run: `claude-mc-desktop-pilot-run-20261010T055619Z-b3e4d1`.
Path: `.mission-control/runs/claude-mc-desktop-pilot-run-20261010T055619Z-b3e4d1.json`.
Original blob: `52a0beae3bf5b35589024e846ca2f8f4b6bae5c5`.
Rejection: `RUN_REPORT_SCOPE_INVALID`.
Validation: `SCHEMA_VALID_TERMINAL_FAILED`.
Maintenance reason: `PREPARED_PROMPT_EMPTY_CONTEXT_PATHS_TERMINAL_FAILED_EXCLUDED`.
Disposition: `EXCLUDED_HISTORY_NOT_TRUSTED_OR_PREDECESSOR`.
Qualification: `SERVER_MAINTENANCE_RESOLVED_REJECTION`.

Every listed file must first pass existing pinned-commit, file type, bounded read, UTF-8 and Git blob integrity checks. Only the exact schema-valid terminal failed rejection can move to resolvedRejections. Missing/read/integrity/auth failure emits no resolved receipts. Dependent predecessor rejection happens before resolution, so a child of the excluded run remains rejected. Other invalid records remain PARTIAL or CONFLICT. No report rewrite, deletion, history truncation, accepted promotion, dispatch, SQL, permissions or secrets changes.

The private client requires exact DTO fields/qualifications/scope and disjoint trusted/rejected IDs. Fresh copy includes maintenanceAudit and its receipt in the source signature and immutable prepared content. Expiry, revocation, receipt removal/modification, failed reread and project/generation changes invalidate prepared content. Copy text explicitly excludes maintenance history from trusted runs, acceptance and predecessor selection. Private exact policy constants are absent from public Owner bundles and generic reporter.

Read-only actual report HEAD: `8cbd1ca2da179462012d85e56791326d5be694f2`.
Claude v3: `claude-mc-desktop-pilot-v3-run-20261010T063128Z-a82e87`, sequence 3 completed, blob `58a1d3d87dc1341fb5e5505fb927ef880388d726`.
Codex: `codex-mc-report-takeover-20261010`, sequence 4 completed, blob `d5d9313e0ed4c271819ba3012883bc96fe26bc2f`.
Approved policy yields FOUND / two trusted completed runs / one resolved failed history. Completed is self-reported and does not establish product acceptance.

Verification: focused resolver exact-tuple negatives; actual pinned reports through server/client integrity/copy gates; receipt forgery/removal, other invalid, rejected predecessor, integrity, outage, Owner revocation and expiry; viewports 375/390/430/1440 with zero external requests. Full app takeover fixture additionally exercises real copy button/background, source change, report outage, expiry, pending-read project switch, focus, reload and BackForward using actual Git bytes and synthetic Owner/document upstreams. These are local checks, not served Owner acceptance. Release SHA/deployment proof is recorded separately after READY.
