# Authoritative scope and rejected report isolation — 2026-10-10

Baseline: `a0e983387e17d36e6e5434b9478332abf7b41d4e`. Developer Codex, actual model unknown.

## Diagnosis

Actual report HEAD `68857597f1a9b13f78f601b716fe6b43ea1ea64b` contains original Codex completed plus real Claude Desktop started/progress/failed sequence 3. The prepared prompt supplied `contextPaths: []`; Claude did not arbitrarily omit the scope. Standalone validate previously checked schema only, and publisher constructed expected scope from caller packet, making an empty declaration self-consistent. Fixed MC reader correctly rejected it. The original Codex blob remains `d5d9313e0ed4c271819ba3012883bc96fe26bc2f`. No concurrent-writer or terminal-history false conflict was found.

## Authoritative contract

MC profile `.mission-control/source-profile.json` is shared by server policy and generic helper's profile resolver. The helper reads bounded declarative JSON at the selected source SHA using existing Git access, never executes repository content and does not embed a private allowlist. Caller scope must exactly match the selected project/repository/track/ref/path/context list. Both empty and `['README.md']` are refused on start/append/packet validation. Missing old profile fails closed; obtain a new source packet after publication.

MC context paths, in order:

1. `README.md`
2. `docs/PRODUCT_CHARTER.md`
3. `docs/MC_PHASE_PLAN.md`
4. `docs/STAGE_HANDOFF_TEMPLATE.md`

Schema-only `validate --report` explicitly returns `SCHEMA_VALID_NOT_SOURCE_VERIFIED`. `validate --report --packet` resolves profile and checks the original packet baseline, returning `REPOSITORY_PROFILE_SCOPE_VALID`, not MC server acceptance. Only successful Git receipt means published; no receiver/Owner acceptance is inferred.

## Standard registration packet

A genuine complete MC copy contains the source packet generated from fresh private configuration. When incomplete report history prevents full continuation, a new independently authorized task can prepare a **registration-only** packet from its own existing Git access:

```sh
node scripts/report-repository-run.mjs packet --project MISSION_CONTROL --track BASELINE --source-ref codex/mc-command-center-checkpoint-20261006 --output /your/private/temp/source-packet.json
```

Use the new source SHA containing the profile. The command resolves/fetches the current source ref, checks HEAD consistency/profile, hashes the entry and writes a private new local file. It neither publishes a report nor chooses predecessor or supplies trusted run context. Copied generic helper supports the same command. Use a new actual runId/taskId/feature/Agent registration with `predecessorRunId:null`; old rejected run may be described as untrusted failed-test reference in summary prose only. No automatic retry/heartbeat/startup.

## Safe isolation

Only verified SHA/blob/UTF-8/bounds plus per-file schema/scope failures can be quarantined. Diagnostics include validated filename/runId/blob and typed error; no raw rejected body, claimed Agent/state/model/summary enters UI or trusted context. Predecessor dependent lineage is rejected too. Active validated runs sort before terminal history, without choosing a worker/predecessor.

PARTIAL is explicit: validated runs remain visible, other active work and overall completion are unknown, full background/copy is refused. Authorization, unknown directory/list, unreadable bytes, integrity mismatch, accepted-history mutation/rollback/disappearance and cycles stay fail closed. Existing report files/guard/commits are unchanged.

## Evidence and limits

Actual `68857597` bytes replay as PARTIAL with Codex completed visible and Claude scope-invalid file isolated. Four widths 375/390/430/1440 PASS with synthetic Owner boundary and zero external requests. Original unified full-copy fixture four widths PASS when the report set is complete. Focused regressions cover empty/nonempty wrong scope, canonical profile packet generation, distinct schema status, symlink report refusal, dependent rejected lineage, integrity/list/auth failures and partial copy refusing an implicit sole predecessor. Temp-root fixture canonicalizes only test paths; product security checks/assertions remain unchanged.

Final portable verification passes 693 tests, build, validate and static safety checks. Thirteen focused isolation/reporter tests PASS; final symlink-TMPDIR reporter group PASS with unchanged assertions/security checks. Exact remote/READY/alias are recorded externally. Actual served Owner partial display, new Claude retry, Mac rerun and other four report activations are not claimed. No report write, Production/other repo/SQL/access/secret/model dispatch/AWS change; known HTTPS403 is not bypassed.
