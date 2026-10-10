# Mission Control active-view focus and one-tap copy repair

Project: MISSION_CONTROL
Timestamp: 2026-10-10T03:51:07Z
Task: Preserve visible Owner entry and one-tap fresh continuation copy
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e1995cc7b6337fb0ddcca0f835c00633cd249f1b

## Summary

Parent independently reproduced focus moving the simple Joey login/source singleton into hidden Workspace. Joey separately reported actual iPhone automatic-copy failure at 03:44 UTC and explicitly required one tap at 03:45. This narrow repair preserves the simple UI and existing fresh Owner/source gates.

## Changes

Focus and public task-observation expiry now refresh the active view; hidden Workspace cannot rerender/reparent the singleton. Simple signed-out forms and verified source remain attached across focus, blur/return and public refresh/expiry. Cross-view disposal, private invalidation, legal candidate track and history remain intact.

Where ClipboardItem promise + clipboard.write are available, the write is initiated synchronously in the original click gesture. Its plain-text promise is fulfilled only after the existing fresh FOUND, Owner, immutable tuple, project/track/generation gates succeed. Failure/cancellation rejects the promise; no old packet is supplied. Other browser paths remain explicit about failure. Manual fallback adds a “全選指令” button and system-copy explanation; it never reports clipboard success. No permission workaround or new access path.

## Verification and qualifications

[Focus/copy verification](docs/MC_JOEY_FOCUS_CLIPBOARD_VERIFICATION_20261010.md) records before-fix reproduction, current fixtures, official technical sources and final release. Browser results use actual app/official SDK with synthetic auth/repository/clipboard and an iOS-like gesture restriction; no current real iPhone clipboard success is claimed. Joey should not retry until parent is notified of completion. No installation, pairing, Mac setup or permission change is required by this repair. Parent's earlier real Chrome source PASS remains limited to 73c08ae.

## Next Action

Functional repair `b14b0f4fb7c0ef5cd59323daa7bc43026b16511c`, tree `3bfee5179ccc71e39b13438199078377af21f8fd`, is remote and fixed Preview READY `dpl_8KiXSavDTYWxWjzXi8eGZ5bot163` with matching alias. 660 portable checks, four focus/clipboard viewport cases, 12 Continue, three route and 24 status cases PASS. Final completion commit changes docs only; exact final docs HEAD/READY stays in the external receipt. Complete that readback and release sole writer with no background work. Production and other repos, SQL/access/secrets/services, model/dispatch and AWS/pilot remain unchanged. Known cloud HTTPS403 stays unbypassed; connected metadata does not prove served bytes. Rejected operational artifacts and equivalent payloads remain excluded. Preserve device acceptance qualification.

## Preserved previous published simple-view stage

# Mission Control simple Joey takeover entry

Project: MISSION_CONTROL
Timestamp: 2026-10-10T03:38:00Z
Task: Simplify mobile project progress and verified Agent takeover
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 133e1b6239be19e5c8c55c567b7bf70327b0c70d

## Summary

Joey's actual phone feedback relayed by parent at 03:12 UTC was “點進去，不知道點那太複雜。” The previous product acceptance failed on discoverability. Default home/#joey now presents select project → known document progress → one primary takeover action. Direct entry is the fixed Preview with `#joey?project=NEXAEON&module=overview`. Engineering Workspace, full Joey view (`mode=advanced`) and other modules remain available.

## Changes

The simple view reuses existing Owner login/AAL2 and private verified source controller. It explains sign-in, verification, reading, error and retry steps; technical details are collapsed. Copy first performs a fresh FOUND read, checks project/track/generation and immutable source, then formats a portable instruction with repository/ref/exact SHA/digest/read time/entry/context paths. Private content stays in memory and the explicit clipboard/manual fallback, never route/storage. Expiry/denial/switch/lifecycle clears private instruction and progress. Main and University candidate remain distinct; candidate remains JoeyAcceptancePending. Unsigned developer and absent document timestamps stay 未記錄, runtime activity stays 未確認. No model selector or automatic Agent dispatch.

The local static-file allowlist explicitly serves the new module. Generated Owner client is rebuilt from source. Historical Production endpoints and legacy Continue remain fail closed.

## Verification

See [simple Joey verification](docs/MC_JOEY_SIMPLE_TAKEOVER_VERIFICATION_20261010.md) for checks, screenshot locations and qualifications. Local actual-app browser coverage includes 375/390/430/1440, signed-out/signing-in/reading/ready/error, four projects, University candidate, history/reload, HEAD change, copy refusal, pending-read switch, denial/expiry/recovery, engineering routes and privacy. Auth/repository/clipboard upstreams are synthetic; this is not actual phone/Owner acceptance.

Parent-relayed Chrome Owner Continue/history/reload/isolation PASS applies only to tested `73c08ae20170c78a2a71687de01926bdc2b7a8cc`, before this simple view. Clipboard NOT WRITTEN. Real phone feedback established usability failure, not source regression; final phone acceptance of this change is unverified. No repeat Mac run is requested.

## Publication and scope

Publish only current private branch to the existing fixed Preview/project. Verify exact remote SHA, READY and alias through connected tools. CONNECT403 is not retried or bypassed; served HTTPS bytes and actual Owner execution cannot be inferred from deployment metadata. Production remains the prior exact deployment/SHA. No other repo writes, SQL, credentials/access change, services, AWS/pilot, model selection or dispatch. The two previously rejected operational artifacts and equivalent payloads remain excluded.

## Next Action

Functional release `4e65e2dccdbd540354b3fe0586d7ae2a3694dcf3`, tree `282357be5bfdb9bcb4309daa0780a659d37fe00a`, is remote and fixed Preview READY `dpl_913iji2zFQQq9wNV8joUeRoQC87Z`, with matching fixed alias. 660 portable tests, 4 simple browser cases and the retained regression checks PASS. This final docs-only commit records completion; exact final docs HEAD/READY stays in the external release receipt to avoid a self-reference. Release sole-writer ownership after that readback, with no background work. Preserve current result and device/source qualifications when another Agent takes over. Historical notes are preserved in [prior handoff archive](docs/MC_HANDOFF_HISTORY_BEFORE_SIMPLE_JOEY_20261010.md); read this current entry first. [Product charter](docs/PRODUCT_CHARTER.md), [phase plan](docs/MC_PHASE_PLAN.md) and [acceptance record](docs/MC_COMMAND_CENTER_ACCEPTANCE.md) retain product authority.
