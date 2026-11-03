# Buddy historical report maintenance — 2026-11-03

Joey authorized this narrow MC correction and production publication on 2026-11-03. Developer: Codex; actual model ID unavailable. Application baseline: fresh `main` at `3e42213e73d4c0c58e827f23596ee1c182ce5ef9`. This changes MC reporting only; Buddy application source, Owner status, permissions, credentials, repository visibility and registration data are unchanged.

## Problem and preservation

One legacy Buddy report contains unsupported `OPS` and verification method values, a verification SHA/URL for a different workflow, and a verification time earlier than its stated deployment observation. The strict reader correctly rejects it. A resulting `PARTIAL` observation makes the daily summary return no tasks, so the board falls back to its 2026-10-03 snapshot even though valid reports exist. Full takeover also refuses `PARTIAL`.

The original blob remains intact. The server-only maintenance policy names its exact project, repository, track, run, path, blob and rejection code. It additionally requires the exact, independently validated retrospective report blob in the same fully verified scan, including its completed result and canonical handoff. A missing, changed, out-of-scope or predecessor-rejected successor cannot resolve the old rejection. No invalid report is converted into trusted history or a predecessor. Unknown rejections and all byte-integrity, authorization and source failures still fail closed. Existing MC pilot maintenance remains independently enforced.

The authorized receipt is `buddy-terminal-ops-maintenance-20261103`. Server and browser DTO validation agree on its specific classification; exact private report identities stay server-side. The Owner report view explains the preserved invalid history in zh-TW, ko and en. Continuation includes the maintenance audit and the valid retrospective result. Receipt removal or modification invalidates prepared instructions.

## Dates and attribution

Buddy latest source is `d70a7963febb669fd6205d10e2f7e0c3bf16c03a` (2026-10-28); that is a workflow/docs operations change by Claude Code, with Git author NexAeon.JoeyAJ. The latest feature remains Hermes's 2026-10-13 pet diary. Codex's 2026-11-03 record is a retrospective reconciliation, not new Buddy development. Its summary contains the original dates and attribution; the card's report update time is the reconciliation time. Do not describe that as the last product modification date.

The exact retrospective record is retained on Buddy's existing `mc/progress`. Its immutable original three records and deployment guard are preserved. Buddy has no rolling-retention activation. The MC repair's own run uses MC's existing rolling eleven policy; retired MC records remain recoverable through ordinary Git references.

## Verification and limits

Full guarded suite: 1202/1202 PASS (zero failed/cancelled/skipped; forbidden attempts zero). Build, portable validation and static safety checks PASS. Actual-byte browser cases: 18/18 PASS across zh-TW/ko/en, 390px/1440px, card/detail/report views, zero external requests. These do not establish served Owner acceptance.

Validation evidence and release status are recorded in the official MC run `mc-buddy-report-maintenance-20261103`. Focused tests cover exact rejected identity, successor changes/removal, foreign scope, receipt tampering/withdrawal, client audit, copy invalidation and Owner loss. Actual Buddy report bytes are separately replayed through the official reader, server, continuation client, public sanitizer and board rendering. This local replay is not live Owner acceptance.

After the maintenance resolution the daily card can show the valid history and retrospective summary; its paused status stays paused. Version remains unrecorded because no approved release version exists in these report titles. Public touched-file activity remains absent by design; file content and Owner technical evidence are not published through the guest summary. No version or user acceptance is invented.

The existing production Git route publishes MC from `main` after the authorized PR merge. Verify exact deployed SHA and canonical alias, then the live public Buddy summary/card after the 60-second server cache expires. Real Owner clipboard acceptance requires an authorized Owner session and remains separate from local continuation checks. No sharing link or authentication bypass is used.
