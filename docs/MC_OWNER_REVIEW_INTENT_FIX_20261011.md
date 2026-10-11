# Owner decision click intent integrity 修復 — 2026-10-11

Independent actual-controller probe 在 `9b87948fc058e3a691f3ac87ac978417dd29ce6f` 重現：Owner 點擊決定後，controller 先 await `tasks.reconcile(runId)`，才建立 review binding。期間相同 run 的 report HEAD/blob/code 或 canonical HEAD 更新，請求會使用更新後的 tuple；server 只能驗證收到的新 tuple，無法還原點擊時的意圖。此前發版的批准意圖資格由本修復 supersede；此前 SQL/ACL/native 證據仍獨立保留。

## 修復與邊界

使用既有「重新核對 PR／CI」先顯示綁定，之後 Owner 明確按批准／要求修改。決定 click 不再 reconcile；在第一個 await 前同步捕捉完整 displayed review tuple、selected task/requirements/CI key、source/report epochs。選定 run 必須和已顯示的核對 run 相同。每個 capability/list/append await 前後檢查 generation 與 tuple；漂移先拒絕、不 retarget、不 ack，重新核對後須再次明確點擊。Server 既有 pre/post Owner、saved task、report、Git metadata fresh 驗證保持；無效的 clicked tuple不會改成最新版本。Post-write drift仍標 unconfirmed，不能宣稱 rollback。

UI 沒有有效、未過期的 displayed CI 時禁用決定按鈕。Lost-response exact operation retry、dated history、容量及 candidate 資格維持。`executionAuthorized:false`；沒有 Agent、merge/deploy、自動派發、model selector 或 candidate accepted promotion。

未改 SQL、migration、grants、Auth、secrets、Supabase config、Production 或其他 repo。既有 SQL exact SHA256 `b2b675098ffc76f6adf1215c90e2947c11d557d09e75f836a2c4b2ebae0c0249` 保持。沒有執行 harmless saved test 或寫真實 Owner decision。

## 驗證

Actual `createDevelopmentTasks` + review controller 的新五組測試：report HEAD/blob/code、canonical HEAD、requirements revision、project/run switch 在第一個 capability await 漂移皆無 append/ack；A→B→A generation 仍拒絕；不變 tuple成功；新 tuple需要另一個 click；決定 click不再呼叫會替換 tuple的 reconcile。舊版 bundle 對最後一個 regression test 明確 RED（C變D），新版 focused18 PASS。

Actual app／normal deployment factory／official SDK，375/390/430/1440，每寬度 Buddy＋University候選 PASS：先 disabled、單獨 CI stage再 enabled、synthetic Owner decisions、lost ACK exact retry、reload history、revision需新 report/stage、pending switch清除、private body-only/mobile。24 intended synthetic review writes、16 intended task writes，external/unexpected0，actual Owner/provider HTTP=false。完整 portable877/build/validate/check及root intake20 PASS；forbiddenAttempts0。所有 evidence只表示 synthetic/runtime implementation 驗證；不冒充 Owner device/API 或真實 Agent 任務閉環。

## 真實任務與後續限制

既有 readonly connected Supabase admin SQL 可讀 Owner saved task，不需借 browser JWT；但現有唯一任務明示只保存不執行，非測試 candidate數0、Owner draft0、decision0（13:55查核）。Admin read不等於 Owner/AAL2 API驗收。Reporter fresh registration packet + genuine saved task exact requirements 可用 Agent自身 Git權限建立，不以 UI copy為技術必要條件；不得偽造已執行任務或把舊 terminal回報綁上該 harmless task。

最小必要 Owner 動作：保存一件有明確開發意圖的真實任務及允許開始，提供 taskId/project/track（UI完整 copy亦可），再於真實 completed MATCH report和明確 PR/CI stage後親自記錄批准／修改。無需重裝或提供 JWT/secrets。真正 bound Agent report、Owner UI/API驗收、runtime GitHub channel permissions仍未證實。新專案只有 draft＋offline canonical files，repo/scope/report provisioning尚未啟用；新repo/private source registration需另行明確授權，不能從既有五scope推定。

固定 Preview 的 exact metadata/READY與普通 served HTTP是分開的證据；cloud CONNECT403不能繞過，servedCheckedSha:null。Production固定原 deployment/SHA。禁止的 VM operational artifacts未重製或上傳。

## 前一 root prefix（exact bytes）

```text
# Current Owner task acceptance records — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T13:38:05Z
Task: Approved bounded private acceptance ledger and UI
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 86806a73eafcd95993a8734e094115ed6af84564

Owner approval12:43:39 UTC covers exactly four objects and original caps. Migration applied; ten existing tables/data and old functions/ACLs/schema/memberships unchanged. Native15 and live10 denial checks PASS; new table has zero rows. Server-only capability ON after gates. Approve/request-changes bind saved task requirements, fresh completed report and exact code/source; executionAuthorized false. No Agent/merge/deploy or candidate promotion.

Evidence: docs/MC_OWNER_TASK_REVIEW_20261011.md. Portable872/build/validate/check,root20/browser8 PASS; runtime2c5b7f8 exact READY,terminal3/other27 unchanged. Prior prefix preserved byte-for-byte; dated history unchanged. Currentness repair already independently released86806a7 READY, portable859/browser20. Owner save/reload acceptance10:52 UTC retained; harmless task never executed.

Next Action: independent review and Owner device acceptance. Genuine bound task Agent run/new Owner UI device acceptance pending; GitHub permissions UNKNOWN. No Production/other repo/new keys/Auth mutation/AWS/model/dispatch. CONNECT403 not bypassed; servedCheckedSha null. Do not recreate rejected VM artifacts.

```

## Exact runtime publication 與 terminal 收尾

Runtime `40fa1e794a23213dd20030dabde53588236715ef` 已 push canonical branch，remote exact。固定 Preview alias與 independent deployment `dpl_4hiie51J7rZeYxCns3rv4xPKkyJk` 均 exact SHA／READY、target null（Preview），build metadata取得成功。Production `dpl_5GgJ8LhD4Ec73RGz9CEFe1ppZQnh`／`8b4945b16a0b23f2e72033aa976fa34f94eabec0` 未變。HTTPS仍 curl56 CONNECT403／HTTP000 before app，不 bypass，servedCheckedSha:null。

新的 actual bugfix run `codex-mc-owner-review-intent-fix-20261011` 在 `mc/progress` terminal sequence3／commit `ab4c7314acdf06aef24134f6fa30bbaf58ece6df`／blob `db1ae34c50be427910f70e1d0bb4376d38f9938b`，6519bytes；external Draft2020-12＋FormatChecker PASS，header/start/progress immutable，舊28 blob unchanged／total29、remote exact。此前 terminal沒有 append。此 run是實際修復工作，不冒充雲端 saved task 的 Agent完成回報。Delivery READY metadata＋BLOCKED served，MC_NO_DATA_CHANGE。

Root安全 intake20 PASS、prior prefix exact preserved／dated history unchanged，`ed04d315162d01bcfed56f71166e57d6251ad31b` 仍為 ancestor。最後 docs-only closure維持 runtime功能 tree相同；精確 final SHA／READY證據放 executor私有 `/tmp/mc-owner-review-intent-20261011/final-publication.json`，避免自我引用 commit。
