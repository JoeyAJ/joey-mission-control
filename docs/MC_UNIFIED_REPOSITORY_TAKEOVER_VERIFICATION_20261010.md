# Unified MC repository-report takeover — 2026-10-10

Baseline: `0a4c62717030b29d93c53431572250518132fbf4`. Developer Codex; actual model unknown.

Parent Mac Chrome Owner QA confirmed the baseline's MC selector, fresh HANDOFF, actual Codex completed feature and report/result pointers. It did not exercise copy. Four remaining observed UI problems are addressed in this release.

## One receiving-Agent flow

Open MC simple overview or its workspace. Private document and repository reports are read under the existing verified Owner session. The workspace's complete background and copy buttons both use the same fresh transport and shared instruction formatter as the simple entry. Each action independently re-reads document and report source, then rechecks Owner, source tuple, scope, track, generation and expiry before display/delivery. The background packet has canonical document source plus `repositoryReports` containing actual runId/taskId/workRef, result, source pointers and bounded event history. Old parent `taskEventContext.runId` no longer drives this entry.

The separate historical parent section remains read-only. Its read failures and retries do not block repository takeover, and its old background/copy actions are hidden. No legacy fallback is used if reports fail. No new event write, token, grant, model selector, dispatch or database change.

A legal MC overview with mode=advanced opens the existing MC workspace, retaining MC through reload and BackForward. An unsupported candidate query cannot select Nex or promote MC to a candidate. The instruction accurately labels MC's development branch.

Report cards fold full bounded event history (sequence/kind/time/summary/result). Copy includes startup plus the latest three events and declares total count/truncation. Completed/failed reports need no heartbeat; their reported terminal state persists while the repository source is verified. Source failure still marks current evidence unconfirmed, and active runs still expire after five minutes. Completion never implies merged/deployed/Joey accepted.

## Tests and qualifications

`tests/browser/mc-unified-takeover-qa.mjs` replays actual report commit `379090eab53b78000d9712cf9bc8d408249f3987`, blob `d5d9313e0ed4c271819ba3012883bc96fe26bc2f`, through the deployed report reader alongside six synthetic historical parent events. All four widths 375/390/430/1440 PASS. It covers persistent initial legacy outage, successful background/copy while history is unavailable, event retry, no old parent run in the new packet, actual run/workRef/result/four-event sequence, fresh source HEAD change, report outage, authorization expiry, pending report read switching project, focus, reload/history and MC advanced/candidate URL retention. No external browser requests/writes; Auth/document/journal/clipboard boundaries are synthetic, not actual served Owner acceptance.

Terminal completed/failed freshness and source-loss qualifications have unit coverage. Final portable verification passes 686 tests, build, validate and static safety checks. Existing four-width simple app, twelve real Continue cases and three routing cases PASS with no external browser requests/writes. The complete local static module graph includes the new shared formatter via the same explicit file allowlist. Generated Owner client/reporter remain consistent with source. Exact deployment SHA/READY/alias are recorded in the external receipt.

## Remaining acceptance

Parent can verify the new actual workspace background and copy on the same fixed Preview, then separately exercise a receiving Agent using its own existing authorization. Actual Claude use remains untested. The earlier live Codex completed report is immutable and unchanged; this repair creates no report/run/heartbeat. Other four repos' reports remain unactivated. Production, SQL, credentials/permissions, model dispatch/services/AWS and rejected VM artifacts remain untouched. Existing cloud HTTPS403 is not bypassed.
