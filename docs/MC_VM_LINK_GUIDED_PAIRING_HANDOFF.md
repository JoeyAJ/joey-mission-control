# MC 目前交接：已發布的終端先等碼配對流程

功能來源版本：`7c0053d24fa0df10b510c20175122aa82ef7cd23`，private `JoeyAJ/joey-mission-control`，remote branch `codex/mc-command-center-checkpoint-20261006`。實作者是此 delegated Codex agent；本任務沒有 model identity 的可驗證記錄，model 保留未知。此版本已發布並核對實際資產，不代表 Owner Auth/AAL2、VM 配對或 pilot 執行已成功。

## 精確版本、部署與證據

- 固定 preview：`https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/#workspace?project=NEXAEON&panel=entries`。
- deployment `dpl_3E8FyGBsQRj9uPdTUtfEUJbm1dMc`，READY，target=null，exact Git SHA 同上。2026-10-08 09:14 UTC 的 provider metadata 再次確認 alias 仍指向此部署。
- production 仍為 `dpl_3quBFohZs1gYJK4PnwjNFZnDTefR`／`8b4945b16a0b23f2e72033aa976fa34f94eabec0`；本次交接不推 production。
- 實際 served Owner JS SHA-256：`4d52b328d82a450d1dd8b2183cb6f353a887363a4242d4c8186b5d067e2b61ef`；CSS：`7addc2d78229ea8e0ec92c87cf2212e5af39f79b7bbe78e63c9bb9486267375c`；config：`a84b578bab5206135583add1b87aedcc9739b13f8d5e18bb52e9135c0ba01177`。三者與本機已驗證 bytes 一致。
- 全套 538/538、其中 VM contract 52/52；native PostgreSQL 17 cases、Chromium 1440/390/320、Owner SDK lifecycle 9 cases、build PASS。瀏覽器與 Auth session 都是 synthetic；沒有真人 Auth/AAL2 proof。
- [私有證據 manifest](contracts/vm-link/receipts/guided-pairing-7c0053d/manifest.json) 保存各份 report/log 的 SHA-256 與 bytes；[完整版本 checkpoint](contracts/vm-link/receipts/guided-pairing-7c0053d/guided-pairing-repair-checkpoint.json)、[served-assets receipt](contracts/vm-link/receipts/guided-pairing-7c0053d/guided-pairing-served-assets.json) 與 [通勤期間 readback](contracts/vm-link/receipts/guided-pairing-7c0053d/commute-followup.json) 同屬 private repo handoff，沒有加入 public build。

## 已實作的行為與固定邊界

頁面先在記憶體準備非機密 worker ID 與一行 pinned bootstrap command；這一步不送 Owner mutation、不產生碼或 job。Joey 先在既有 Ubuntu-1 terminal 啟動命令，停在 masked 等碼提示，再回頁面親自確認、批准、立即複製碼，最後貼入已等待的 TTY。

clear-on-hide 保留：離開分頁立即清除碼，保留非機密準備及 job view；返回只使用既有 Owner verifier/read RPC。SDK TOKEN_REFRESHED 仍清除碼，再核對 session，保留非機密命令；session 驗證失敗、登出、換 project、pagehide/dispose 清除全部準備。碼最長十分鐘，不放入 argv、環境、URL、storage 或 chat，RPC 只收 SHA-256。沒有自動批准或 replacement job。

此 UI 版本不變更 worker、bootstrap、SQL、Edge v4、Auth role/grant 或 canonical writer。Bootstrap SHA-256 `6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4`；已批准 SQL SHA-256 `bba24c9b6154daaee4fd73a22851e24c08337325cc3db3e20f96a18de49aff76`。它不是通用 agent/tool/file feed，也不是 canonical writeback 或新控制權限。

## 原紀錄、Joey 回來後的操作

2026-10-08 **09:14:29.98959 UTC** 只讀 SQL：broker enabled；fence 1 是 CANCELLED；fence 2 仍 `terminal=false/outcome=null`，但配對碼 08:37:14 UTC 到期、claim window 08:42:14 UTC 到期。兩筆皆 `claimed=false/spawnIntent=false/events=0`。目前 worker unpaired、disabled、keyRegistered=false、尚未 revoked。總 receipts=5 是既有紀錄；09:01:20 的 worker receipts=0，不能把總 receipts 當成 VM 配對或執行證據。Agent 沒有取消、撤銷、批准、重送、安裝或執行。

Parent 09:08 UTC（minute precision）回報 Joey 通勤中，約 1–1.5 小時後取得 Mac。這只是可用性預估，不是排程或啟動批准。等待期間不新增、重新批准或啟動 pilot。

Joey 回來後的最少步驟在[頁面流程交接](contracts/vm-link/docs/GUIDED_PAIRING_FLOW_ZH_TW.md)：

1. 重載固定 preview，展開 NEXAEON Owner 區；親自撤銷目前 expired worker，確認舊紀錄 CANCELLED，保留歷史。
2. 準備／複製頁面已填好 ID 的命令，在既有 Ubuntu-1 貼上，停在 masked 等碼提示。
3. 回 MC 確認 terminal 已等碼，親自批准一次。
4. 在 MC 立即複製碼，再切 terminal 貼上、Enter；不需等 chat，也不要再複製命令。
5. 讀回實際 job/events，只有必要 turn/process 證據與 COMPLETED 一致才確認這個 pilot；結束按暫停並撤銷。

Owner read 原 SQL 會依既有到期規則整理未 claimed job；agent 的 metadata SELECT 沒有代做這個動作。仍需真人撤銷 worker 後才能開始新的 terminal preparation。剩餘 blocker 是真人操作及 actual VM readback，不是新 secret、grant、resource 或重做 SQL。

## 接續順序

Stable pairing flow 在本階段凍結。下一個不依賴憑證的範圍先以具體 proposal/acceptance 回報給 parent，尚未實作；維持此 agent 為唯一指定 writer，不同階段不混入同一功能變更。完整 Development OS 仍未達最終驗收。
