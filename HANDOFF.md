# Mission Control 自身入口與交接 — 2026-11-02

Project: MISSION_CONTROL
Timestamp: 2026-11-02T11:14:12.264Z
Task: MC 自身日常入口、已開發功能盤點與下一階段規劃
Status: DEPLOYED_OWNER_ACCEPTANCE_PENDING
Last Developer: Codex
Executed by: Codex
Actual Model: 未提供可核實的實際模型 ID
Branch: main

## Summary

### 最新安全修正：PR25 共用 identity guard 的寫入回歸

獨立審查確認 P1：PR25 的 identity() 同時被 readSnapshot 與 commitFiles 使用，接受 public MC host 也會在已配置 writer 的環境允許 PRIVATE_GIT_REGISTRATION 將八份 ledger／memory 寫入 public host。Owner-only API 不保護直接 Git repository 讀取；先前「沒有存取擴張」的概括說法不正確。

本次限制性修正將讀寫契約分開：讀取只接受同一固定 numeric ID／名稱、private/public 一致且未封存／未停用的原私人 host 或已核實 public host；寫入必須 private=true、visibility=private，並在 authorization callback 之後、送 GraphQL POST 前再次核對。public host 在第一個 write guard 即拒絕，visibility 中途變 public 也拒絕；fixture tag／credential 不構成豁免。Owner/AAL2 與私人匯入專案契約保持嚴格。

所有寫入測試只在無外部網路的隔離 fixture／暫存 Git 執行；未對正式 public registry 做測試寫入。可讀 mc/registry head 仍為 `9cd11d75ba355d640e115c1f455f73584b8d66f9`，與 PR25 前觀察一致，該 reachable head 的最新 commit 為 2026-10-23；目前未觀察到 PR25 後的 registry branch 變更。這不排除未觀察的 refs／暫存變更／讀取，也不代表既有 public catalog 沒有保密性問題。既有資料的 public confidentiality 是另一事項，此次不更改 repo visibility、credentials 或 permissions。

Production metadata 目前僅有 READ token；writer token 只綁舊 checkpoint preview，這是額外目前配置證據，不能代替程式 writer guard 或聲稱從未發生暴露。本次 exact release 與收尾見 [官方安全修正 run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-catalog-public-write-safety-20261102.json)。Engine 實際 Owner 可見性仍需在安全修正發布後確認。

### 最新根因與修正 — 2026-11-02 11:01 UTC Owner 診斷

Joey 實際 Owner 截圖回傳 `REGISTRATION_PRIVATE_IDENTITY_MISMATCH · HTTP 409`。在 GET catalog 路徑，唯一對應 throw 位於 `createRegistrationGitPort` 的 MC **catalog host** identity check；它在 Owner 前置驗證及 GitHub repo metadata HTTP 200 之後、讀 registry 之前。這不是 Google 帳號或 Engine 專案 ID 的比對。

新讀取的 GitHub metadata：`JoeyAJ/joey-mission-control`，ID `1404959099`，visibility **public**，archived=false。舊程式對同一個固定 MC host 強制 private=true／visibility=private，與實際 host 不符，足以產生截圖的 409。之前的 fixture 把 MC host 模擬成 private，因此未涵蓋正式情況。

修正：固定 catalog HOST 使用獨立 `registrationCatalogHostIdentity`（public／private=false／未封存／未停用），並繼續嚴格核對同一 repo numeric ID、full name 與全部 flags；缺欄位、不同 ID／名稱／visibility、archived／disabled 都拒絕。待匯入專案的 private=true／visibility=private 契約保持原樣，Owner/AAL2、token、scope、registry、來源 hash 及外部 credentials/permissions 設定未變；但共享 guard 引入了上方已說明的寫入行為回歸，現已補上限制性 private writer guard。沒有更改 repository visibility。

此根因修正的 exact release 與回報見 [官方 run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-engine-host-identity-fix-20261102.json)。部署後需在 Joey 現有已驗證 Owner flow 確認 Engine 真正可見；目前不以 mock 或 READY 宣稱實機驗收通過。只需正常重新整理／重新讀取，不要求重新登入或新的通用診斷截圖。

### Engine 驗收失敗後的當前狀態 — 2026-11-02 10:03 UTC

Joey 截圖顯示正式站右上角「私人工作區登入／已驗證／私人資料可讀取」，同時私人清單載入失敗，五卡含 MC 但沒有 Engine。這不是單純 guest 顯示；前端狀態也不代表 server catalog API 已接受。Engine **仍未解決，不能宣稱驗收通過**。

本次小增量只補安全診斷：Owner 的既有錯誤提示顯示固定 error code、catalog HTTP status，以及 GitHub 失敗的數字 HTTP status。可區分 `OWNER_AUTHORIZATION_DENIED`、`REGISTRATION_CATALOG_UNAVAILABLE`、`REGISTRATION_CATALOG_INVALID`、`CATALOG_TIMEOUT` 等；不顯示 raw exception、URL、repo/Owner IDs、response body 或 token。guest 不顯示診斷碼。未改憑證、授權、registry 或 auth policy，未自行增加讀取權限，也沒有再無證據要求重新登入。

正式 production metadata 已確認 READ token 綁定存在，writer 僅 legacy preview（不是 catalog 讀取阻擋）；token 的有效性／repo 權限未由 metadata 證明。15 分鐘 runtime console logs 無事件，不能當成 API 成功或沒請求的證據。當前需要 Joey 以既有已驗證 Owner 畫面按一次重新讀取，再提供顯示診斷碼的截圖；不需要 developer tools 或 token。診斷增量 exact release／回報見 [官方 run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-engine-catalog-diagnostics-20261102.json)。

2026-11-02 08:21 UTC Joey 已明確同意 PR #21 ready／merge／正式發布；先前拒絕動作重試一次成功，未提交 APPROVE。PR #21 已 merge 為 `641cfc7fb9de51527ceebe6b9135448f7b6fd628`，Vercel 正式部署 `dpl_EhzQuyauq4ZwoHNar4yYzzYCE7U4` READY。另依 Joey 08:22 指示修正 Engine catalog 顯示失敗的靜默處理。最終修正發布 exact SHA／URL 與結束回報見官方 [後續 run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-catalog-release-20261102.json) 及驗證紀錄。

沿用既有 MISSION_CONTROL／BASELINE 身分加入日常清單，不新登記系統、不更動五個專案資料。Owner 詳情的技術區連至 main 程式庫、最新交接、功能盤點與下一階段。讀取 MC 報告沿用原 scope；卡片不憑空填入版本、Agent 或時間。

## Canonical entry and scope

Repository: https://github.com/JoeyAJ/joey-mission-control
應用程式 canonical branch：main；本次 fresh-read 基準 `030a83f2cc721f1bd149e5e47efece0cfb7afead`。
正式網址：https://joey-mission-control-one.vercel.app/#joey 。main 由既有 Vercel Git 路線發布。

`.mission-control/source-profile.json` 回報來源仍為 `codex/mc-command-center-checkpoint-20261006`，本次 fresh-read `06840bafd2cabf2cff81e822b8a63299e32cb366`。這是既有已授權報告綁定，不是當前應用程式基準。本次不盲改 ref 或 contextPaths，避免歷史報告失效或擴大讀取權限。MC 複製交接加上 main fresh-read 指示；進階工作台仍如實顯示 legacy 來源。未來若遷移 scope，需獨立設計舊回報相容性與授權，不能部署舊 checkpoint 覆蓋 main。

本次 Joey 已要求部署 MC 自身入口、功能記錄、Handoff 與待辦；不包含 runner、自動化升級、新服務、credentials、付費模型、其他專案開發或 Agent 代 Joey 驗收。PR 預設 draft；不自行提交 APPROVE。

## Changes

- `public/mission-control-project.js`：補入既有 MC 卡片、去重、三語文件連結與 main 接手說明。
- `public/app.js`：日常卡片／報告讀取包含 MC，沿用原 Owner／guest 讀取及交接路徑。
- `public/control-tower.js`：MC Owner 詳情技術區加入四個 main 連結；guest 不顯示私人技術入口。
- [完整功能盤點](docs/MC_FEATURE_INVENTORY.md)：逐項列出程式與測試來源，區分歷史部署、當前驗證、未知與待開發。
- [下一階段](docs/MC_NEXT_PHASE.md)：需求到真實 Agent、獨立分支、測試／review／有界修正、PR／預覽／回報和 Joey 驗收；含影片與 pstack 來源、已知限制、費用前提。
- 舊交接完整保留於 [歷史](docs/MC_CONTROL_TOWER_HANDOFF_HISTORY_20261014.md)，其帶日期的 pending／accepted 狀態不能套用為今日現況。

## AI 沉浸式學習第五項診斷

前序 reviewer 的唯讀證據：registry head `9cd11d75ba355d640e115c1f455f73584b8d66f9`，Engine 五個 memory SHA256 與 ledger 相符，無刪除證據。四個固定卡片來自 production snapshot；Engine 來自 Owner-only registry。未登入正式畫面顯示四卡，是可解釋的權限分界，使用者當時本機登入狀態仍未確認。此次測試 Owner catalog 與 MC 共存；不公開 registry、不繞過 Owner token 或 hash 驗證。若登入後仍少卡，再查 catalog lease、整包驗證與 approved connection；不重建或重複登記。

## Verification

PR #22 修正已合併並正式部署：應用程式 SHA `40188c50206993a9a33916f5ded550dbbe4e86ee`（與完整測試的 `2bef7f1332cca5dae75d010a57e9882b9d19bc88` tree 完全相同）；deployment `dpl_Btb4c5uUuiCbsYcm8vwfBUTjq4Ac`，production／main／READY。1192/1192 guarded tests、build/check、portable validate 與 15 組 Chromium QA PASS。後續文件收尾不變更應用程式行為；最新整體部署 SHA 以官方 successor run 收尾 receipt 為準。

重新 fresh-read `mc/registry`：`9cd11d75ba355d640e115c1f455f73584b8d66f9`；官方 `validateRegistrationCatalog` 通過，1 個登記項目、Engine 五份 memory hashes 均符合 ledger，無登記刪除。正式 guest 預期五卡＝原四卡＋MC；已驗證 Owner 且 catalog 載入成功預期六卡＝再加 Engine。MC 的第五卡不是 Engine 公開化。

本次精確 commit、測試、UI／部署結果與未驗證項目記於 [驗證紀錄](docs/MC_SELF_PROJECT_VERIFICATION_20261102.md)。只有實際 PASS 才可填入；Agent 自報完成、部署 READY、獨立證據和 Joey 驗收分別保留。

## Next Action

當前已由實際 409 及 GitHub host metadata 定位並修正 catalog host 映射，發布後在既有 Owner flow 確認 Engine 可見；不要把下列預期當成已完成的 Owner 驗收。預期正式網址：未登入看到原四項＋MC；Owner 登入並完成驗證後看到 Engine。私人清單失敗會顯示三語提示與重新讀取，不能當作已刪除；10 秒未回覆會明確失敗，catalog 成功本身足以建立 Owner-ready，其他回報／草稿暫時失敗不會降為 guest。失去 Owner 或 catalog 失敗會清掉舊私人卡片，避免殘留。

先 fetch main，讀 AGENT_CONTROL.md B、此文件、功能盤點、下一階段與官方 run 的 exact release receipt。新任務要用官方 atomic reporter；保留 mc/progress rolling retention。下一階段 runner 仍僅是規劃，勿啟用自動 merge／deploy。

## Acceptance and blockers

Joey 已授權本次 ready／merge／正式發布及小範圍 catalog 修正，前次 ready 阻擋已解除。真實 Owner/AAL2 登入、Joey 裝置 clipboard 與最終產品驗收仍待確認。Vercel metadata 可確認 exact production SHA／READY；本環境的正式 HTTP 行為讀取不可用：web open 無法訪問、Vercel web_fetch_vercel_url 回覆部署找不到或連線授權不足，且無可用 Vercel CLI fallback。未建立共享連結或改訪問權限。這項限制不等同 UI 測試失敗；也不能以 metadata 或 synthetic Owner 測試冒充遠端實際登入驗證。
