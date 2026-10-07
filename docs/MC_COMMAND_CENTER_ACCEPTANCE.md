# Command Center: reference and functional acceptance

Owner: Joey, Product Owner and Final Approver. Candidate task derives from approved 8b478f0d8c017defdd2a5f5dab92ea9972479c78; preserved deployment baseline remains 8b4945b16a0b23f2e72033aa976fa34f94eabec0. No production acceptance or release implied.

Reference is an operating-console direction, not a replacement product. Consumer-local video materialization previously failed; parent independently inspected representative frames. This matrix uses the supplied reference description, not a claim that this executor viewed unavailable video bytes.

| Core | UI acceptance | Functional acceptance | Candidate state / gap |
|---|---|---|---|
| Sessions / projects | Responsive persistent project entries, explicit session qualification | Selection links evidence/context/history; current session must have authenticated task binding | Four project entries implemented; MC observer history implemented separately. Parent-supplied actual task status snapshot implemented, with observed time and stale→unknown. Actual Claude/Codex/Terminal session roster and tool stream still unavailable |
| Central task workflow | Evidence list, event selection, reading/error/recovery state | Standard JSONL → pure reducer → single writer atomic/CAS receipt → refresh/history | Candidate isolated flow implemented; imported/synthetic identity stays unverified, current runtime disconnected |
| Explorer / inspector | Source/context detail with stable navigation | Claim-specific provenance, baseline, next/blocker/approval, unknown reasons | Real private restore and safe source receipts mapped. Fixed16file historical Explorer implemented; arbitrary private code browsing/tool output not exposed |
| Code / diff | Show source revision and context without false operations | Show only supported approved evidence; never invent reads/writes/diff | Historical8b478→91b171b Explorer and bounded diff implemented privately; public safe counts/version only. No live file/diff source: **missing platform evidence** |
| Relationship graph | Selectable graph shares selected evidence | Source and mission relationships are grounded and distinct | Implemented; relationship does not claim file operation telemetry |
| Joey decision entry | Existing decision view remains reachable | Preserve owner authority and final-approval workflow | Existing owner decision paths preserved. Private restore preview remains GET-only; formal writer cutover not done |
| Any-agent continuation | Handoff/Continue entry and private Git checkpoints | New agent can reconstruct source/revision/authority and resume safely | Repo handoff, contracts, patch, manifest and receipts provided; automatic dispatch/runtime attachment absent |
| Work-result writeback | Clearly qualified candidate receipts visible after reread | Idempotence, CAS, restart, corruption/failure recovery, expiry, no self-auth promotion | Candidate report writeback implemented. Canonical mission/owner writeback requires formal authority/cutover |
| Cloud storage | Private source checkpoint, no raw public payload | Private non-force Git checkpoint with independent SHA/tree readback | Existing authorized private branch; no new DB/Auth/keys/paid storage |

## Continuation and phase acceptance

1. Recorded-source console and exact private restore: implemented and browser verified; history is not current runtime.
2. Bounded observer: standard-event filtering, isolated candidate store, read-only history, true qualification; synthetic interruption/replay/integrity tests and browser checks required before checkpoint.
3. Real current-task attachment: blocked only by a supported platform event feed. Smallest option: platform provides a read-only feed for this exact authorized task, or parent supplies JSONL from an already-approved existing invocation with transport/session binding evidence. CLI `--json` availability is not this thread's event hook. No extra model invocation or session-path/auth read.
4. Verified producer and formal result/approval loop: requires authenticated transport evidence plus named canonical per-store writer authority. Persistent credential, canonical cutover, new invocation or production release remains a distinct decision.

Do not stop at visual acceptance or offline contract success and call the final console complete. Continue independent authorized phases, save private receipts, and report exact platform/resource gaps. Mobile and three-language usability, source truth, existing four projects/Assetcase/privacy and production URL remain acceptance requirements.

Parent-supplied cloud_threads.read snapshot is now usable as a recent observation only. Source qualification/receipt transport remain explicit; app does not read that connector. Snapshot status is never proof of per-tool execution, current actor/model or automatic sync.
