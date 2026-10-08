# 下一個獨立範圍：私人 worker 執行證據檢視

狀態：**已界定並呈報，尚未實作**。功能基線是 `7c0053d24fa0df10b510c20175122aa82ef7cd23`；這份文件不啟用功能、連接新 producer 或批准任何 pilot。Parent 要求先回報具體範圍與驗收，再開始下一個階段；目前 sole writer 仍是此 delegated agent。

## 已有需求與實際缺口

[PRODUCT_CHARTER.md](PRODUCT_CHARTER.md) 要求 Joey 在 5–10 秒內分辨狀態、已確認結果、下一步與 blocker，且 event time/read time 分開。[COMMAND_WORKSPACE_CONTINUATION.md](COMMAND_WORKSPACE_CONTINUATION.md) 與 [MC_COMMAND_CENTER_ACCEPTANCE.md](MC_COMMAND_CENTER_ACCEPTANCE.md) 已授權 qualified evidence、inspector 與受限來源的失效／恢復呈現；最終 Development OS 的 execution/control/sync acceptance 仍未完成。

目前 `src/continuity/owner-vm-link-ui.mjs` 對每筆已讀回 job 只列一行狀態與 `seq · payload.kind · observedAt`。已有私有 readback 提供固定 job/attempt/fence、claimed/spawnIntent/terminal/outcome、lease/expires，以及最多 128 筆 safe events；因此可以補一個可選取事件的私人 evidence inspector，不取得新 credential、不新增 RPC 或事件來源。它改善目前資料的可判讀性，不把 smoke worker 升格為一般 Agent/tool/code feed。

## 範圍

新增一個純資料 projection 與只讀 renderer，接收現有已驗證的 NEXAEON `0.1.1` Owner view，在既有私人 Owner pilot 區的 job 紀錄下呈現：

- 已批准／等待領取、已領取、已記錄 spawn intent、safe provider/process 事件及資料庫 terminal outcome，分開標示；沒有事件就明示「尚無執行證據」。
- 切換 job／event 的 bounded inspector，只顯示既有 allowlist 的 kind、sequence、來源 observedAt、nullable IDs/type/status、exit/signal/error classification；不取得或顯示原始 message/reasoning/command/output/file/log。
- 事件來源時間與此 viewer 收到成功讀回的時間分開；保留缺漏與過期原因。簽章資格只寫 `SIGNED_BY_APPROVED_WORKER`，Agent/model/current-process identity 若未供應仍為 unknown。

沿用現有 view，不新增讀取、polling、storage 或 Owner mutation。準備命令、TTY 等碼、批准、碼複製、clear-on-hide、session 驗證、撤銷與 pause 流程保持原行為；新的 viewer 不操作這些 control/state。SQL、Edge v4、bootstrap/worker pins、Auth SDK policy、grants、部署設定與 public data boundary 不改。

## 驗收條件

1. **來源綁定與拒絕：** 僅接受既有 NEXAEON/release/policy/artifact pins；16 jobs／128 events 上限，job/attempt/fence 與 sequence 不混合。Malformed safe payload、隱藏額外欄位、錯誤時間型別與跨 job 混入 fail closed；不嘗試修正或回寫來源。
2. **結果不誤判：** `claimed`、`spawnIntent`、turn completion、process exit 與 server terminal outcome 各自保留。只有 server `COMPLETED`、turn_completed、process_exit=0 且沒有取消／失敗／禁止工具證據相符，才顯示「此 pilot 完成證據相符」；exit 0 或 turn_completed 單獨不足。衝突顯示未確認，保留原 server outcome 供讀者核對。
3. **時間與失效：** event observedAt 不被 read time 覆蓋；lease 到期、revoked/disabled worker、沒有 fresh event 或讀取失敗不顯示「正在執行／在線」。不推導缺失的 start/claim/code expiry。Last confirmed terminal evidence 保留，另標本次讀取失敗／目前狀態未知。
4. **私人閱讀操作：** job/event 選取在記憶體，沿用合格 Owner 區的顯示與登出／換 project／失效清除。文字節點呈現，鍵盤可操作、touch≥44 px；1440/390/320 三種寬度無溢出，選取與刷新不清除配對準備或增加批准次數。
5. **操作與部署隔離：** synthetic fixtures 測試等待、claimed、spawn intent、完成、失敗、取消、late/replayed event、stale lease、conflict、read failure/recovery 與 logout/project purge；不執行 live pilot。比較原配對步驟、command/bootstrap digest 與既有操作 call counts，確認不變；public API/build 無私人 events/code，SQL/Edge/worker bytes 不變。
6. **完成資格：** 單元／瀏覽器 PASS 只證明 viewer；實際 worker proof 仍需 Joey 回來後親自配對、取得 genuine safe events。不得宣稱 Auth/AAL2、通用 Agent/tool source、canonical writeback 或最終產品已完成。

## 下一階段的交付與順序

交付為 projection、read-only inspector、必要的 scope/privacy/time/terminal/interaction 測試，以及 exact source/private checkpoint；先向 parent 回報此範圍，維持一個 writer。當前只保存這份 proposal，不把它混進已發布的配對修復，也不新增基礎設施、權限、費用、production promotion 或自動 VM jobs。

已發布配對流程與真人待辦以 [MC_VM_LINK_GUIDED_PAIRING_HANDOFF.md](MC_VM_LINK_GUIDED_PAIRING_HANDOFF.md) 為準。既有 canonical writer/cutover 與 Owner final-decision acceptance 仍依原獨立 gates，不屬此 slice。
