# MC UX final implementation verification — 2026-10-10

This closes the authorized UX implementation stage, not Joey product acceptance. Exact publication/report receipts are in HANDOFF; current acceptance authority is [MC_CURRENT_ACCEPTANCE](MC_CURRENT_ACCEPTANCE.md).

- Unit suite: 715 PASS, zero failed/skipped.
- Browser: zh-TW, ko, en × 375, 390, 430, 1440px = twelve cases, thirteen states each (156 visits): signed-out, loading, NO_REPORTS, running, blocked, failed, completed, stale, PARTIAL, synthetic maintenance, expired, revoked, long zhTW. Scope change, Back/Forward, reload, keyboard focus, localization and copy qualification checked per case. All PASS.
- Primary button contrast 12.09:1; main text 13.86:1. Checked mobile primary/settings/source/account controls have minimum 44px height. No horizontal overflow at requested widths. These checks are scoped controls, not a claim of a complete WCAG audit.
- Existing four-width fresh-source/report copy browser regression PASS; 188 report reads, 288 source reads, 1400 fixture Git reads, zero external calls/writes.
- Prior second-stage actual reference QA (five sizes), independent reading QA (three locales/twelve cases), source/candidate/history/fresh gates remain established. Build regenerated owner client; syntax/schema/safety checks PASS.

Fixture uses actual application, reader/parser/API factories with synthetic Owner, private source content, reports and clipboard. Synthetic maintenance injects a bounded client-contract receipt; real backend exact-blob maintenance policy remains covered separately by existing tests. Configuration completion is explicitly distinct from product completion. No real phone/clipboard or Joey acceptance is inferred.

Latest renders, inspected after these changes, are durable private repo artifacts: [1440px](qa/mc-ux-final-20261010/synthetic-1440.png), [390px](qa/mc-ux-final-20261010/synthetic-390.png). Both show synthetic configuration verification completion and an explicit product-acceptance qualification. They contain no real Owner credentials, private source packet or actual operational reports. Build output copies public only; these docs images are not served in Preview. No old rejected operational artifacts were uploaded/recreated.

Requested private Library saving was attempted via current official prepared-upload helper and failed at hosted-app tools/list with network error before any prepare/upload/finalize mutation. No Library IDs or successful attachment delivery is claimed; private Git artifacts are the durable fallback. Actual Library ID delivery remains blocked by that runtime transport limitation.

Publication checks use connected Vercel exact SHA/READY/alias metadata. Previously blocked public HTTPS (CONNECT 403) is not bypassed; served bytes and real Owner/browser remain unverified in cloud. Production remains unchanged. Joey final visual and actual iPhone/clipboard acceptance remain the next user-dependent step.

Functional publication: `d1e7c90f6780fd4ac28b9998facaad34813a960f`, `dpl_Btv5En4F5pq9orhB8ViCYA3HnTMB` READY; connected fixed-alias lookup matched exact SHA. Existing actual Codex run completed sequence 9, report commit `b20759032115d1a8a477bde78ad90e89fac5d3a1`, blob `ee768a8edd579e307cfeb500a12f3d3a894ddda2`; private Git exact-blob/parser readback PASS. This documentation closure preserves functional result pointers and original registration baseline; no fictitious active run waiting for Joey acceptance.

## Additional advanced review artifacts and mobile disclosure QA

Latest current renderer/CSS: [1440×900 advanced full workspace](qa/mc-ux-final-20261010/advanced-synthetic-1440-after.png), [872×512 advanced](qa/mc-ux-final-20261010/advanced-synthetic-872-after.png). Same synthetic data, current renderer and shell geometry with immutable old CSS: [872×512 before CSS replay](qa/mc-ux-final-20261010/advanced-synthetic-872-before-css-replay.png). All three captures were actually viewed. Entirely synthetic project manifests; no actual Owner session, transcript/execution or private report content. Sessions explicitly says no connected execution Session. Timeline records synthetic evidence. No execution feed is invented.

The screenshot harness uses the actual current `renderCommandWorkspace` and stylesheet, the real header and workspace shell classes, and synthetic manifests. It does not run the full app state/route controller or verify live Owner/source connectivity; previous full-app route/source QA retains that qualification. Before is immutable baseline CSS `8765dacd8aa2c2baa27bd740e0e7fe8f0234f128` replay, not a historical live screenshot. Approved original reference frames remain the three previously inspected private 872×512 frames recorded in MC_ADVANCED_REFERENCE_VERIFICATION_20261010.md; no original private frame is republished here.

| Reference / comparison property | Checked latest synthetic advanced |
|---|---|
| Four columns: Sessions, Timeline, Explorer, right content/graph | Visible at 1440×900 and 872×512; ratios 19.2 / 33.2 / 15.4 / 32.2%, tolerance <0.4 percentage points |
| Right top content, bottom graph | Both visible; graph starts after inspector, bottom within 2px of right pane bottom |
| Source/report section density and tone | Old CSS blue-bordered rounded source box becomes flat warm olive source section; selected evidence and Explorer retain muted warm hierarchy |
| Page bounds | No horizontal or document-height overflow; pane content retains its own scrolling |
| Runtime / acceptance | Disconnected execution is explicit; no live session or Joey acceptance inferred |

Advanced QA: three captures/cases PASS, zero external requests/writes. Mobile supplemental QA: zhTW 390px, fifteen states PASS, including long blocked and long failed disclosure. The visible “Agent 回報與驗證紀錄” summary opens the full report; its “事件紀錄” summary opens full events. Assertions verify the failed overview starts with “回報失敗”, blocked status remains explicit, the complete long blocked/failed strings remain exact, and expanded failed content is visible. Three-line overview clipping does not alter the report/event data. This is local synthetic browser QA, not Joey or real-device acceptance.

Only QA harnesses, three private docs screenshots and documentation change in this follow-up. Public application/bundled client are unchanged; screenshots remain outside public/dist. Existing completed run sequence 9 and report commit b207590 remain untouched; no new run or report is created. Private Library transport and cloud served-byte limitations remain as above.
