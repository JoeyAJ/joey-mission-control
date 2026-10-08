# Ubuntu-1 配對頁面修復（2026-10-08）

此流程取代先批准、再等聊天提供命令的舊操作順序。頁面先準備非機密 worker ID 與固定命令；終端已等碼後，才由 Joey 親自批准一次配對。沒有自動批准、重送或新增 job。

## Joey 的最少操作

1. 重新載入既有 MC 預覽，展開 NEXAEON 的 Owner 區。若顯示舊配對碼已不在頁面，按「撤銷目前 worker」，確認原檢查紀錄為 `CANCELLED`；歷史紀錄會保留。
2. 按「1. 準備終端命令」及「複製終端命令」。到既有 AWS Ubuntu-1 終端貼上、按 Enter；等它顯示「一次性 MC 配對碼（輸入不回顯）:」。此時尚未批准，沒有碼可遺失。
3. 回到 MC，按「2. 終端已顯示等碼提示」，再按「批准一次 Ubuntu-1 配對與 pilot」。
4. 留在 MC，立即按「複製一次性配對碼」，再切到剛才等碼的終端貼上、按 Enter。輸入不回顯是正常的，不需要等聊天指示，也不要再次複製命令。
5. 回 MC 看檢查紀錄。只有實際讀回 `COMPLETED` 與必要事件才能確認此 pilot 完成；結束按「暫停並撤銷 pilot」。

worker ID 已在頁面命令填好，不需貼到聊天。檢查紀錄 ID 是紀錄識別碼，不能當配對碼輸入。

## 清除與驗證邊界

離開分頁仍立即清除記憶體中的配對碼，但保留非機密準備步驟、命令及已讀回的檢查紀錄。返回分頁會先重新核對現有 Owner session，再讀回狀態。SDK token refresh 也清除碼，保留終端準備；session 驗證失敗、登出、換專案與卸載則清除全部準備。碼最長十分鐘，逾時不會自動產生替代碼或 job。

命令只有一行，使用標準 HTTPS/TLS、唯一已批准 bootstrap URL 及 SHA-256 固定值 `6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4`。配對碼不在命令、argv、環境變數、URL、localStorage 或 sessionStorage；RPC 僅收到其 SHA-256。bootstrap、worker artifact、SQL、Edge v4 與既有 Auth/AAL2 驗證條件沒有因本次 UI 修復而變更。

## 證據及尚待真人完成

本機 52 項 contract 測試、17 項 PostgreSQL 整合測試、1440／390／320 像素 Chromium 流程測試及 9 項 Owner SDK 生命週期測試通過。瀏覽器測試涵蓋切走後的命令保留、複製碼後清除、舊撤銷紀錄、無重複批准、無 browser storage、無外部請求及觸控操作。全部使用 synthetic session／code／RPC，不是實際 Owner Auth、AAL2 或 VM 完成證據。

2026-10-08 08:56:20 UTC 的只讀 SQL 顯示兩筆歷史 job 均 `claimed=false`、`spawnIntent=false`、events=0。第二筆配對碼已於 08:37:14 UTC 到期，claim window 也已到期；目前 worker 尚未撤銷。Agent 沒有代按撤銷、批准、取消、配對或執行。重新載入後既有 Owner read 會依原 SQL 的到期規則整理紀錄，仍需 Joey 親自撤銷 worker，才可開始上述流程。
