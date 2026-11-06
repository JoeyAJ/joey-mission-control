# Mission Control 自身入口與交接 — 2026-11-03

## NexAeon V2 成果匯出 — 2026-11-06

範圍驗收後續：既有授權來源共五個，加入原本即有 report/source scope 的 NAMYOUNG_WEB3D；新增受驗證的來源目錄，網站從 MC 取得公開投影欄位，不需兩端人工維護清單。不新增 source grants 或私人 repo 權限。下方四來源描述屬前一個已發布版本。

Codex 已依 Joey 本次端到端開發、測試、PR、合併與部署授權，新增限定四個既有 BASELINE 的 server-to-server 成果匯出；不改 source profiles、scope grants、Owner／registry／報告內容或其他專案。實際模型 ID 未由環境提供。PR #29 已以 `8fb4984877ca3ddda61a90d5e15c8f7a8a8ed8ad` 合併，精確 head `bde7711e6e4dfa7f8bffdab56dd2e24880583cd4` Linux CI 的 1210 項測試、build、validate、check 全過，正式 Vercel Git 部署 Ready。

正式跨系統測試發現：MC 本身舊報告尚無成功 CI；其他來源在 CI 讀取回傳無法連接。後續修正只增加公開 repo identity 驗證後的免私人權限 CI 讀取，以及受限的上游 HTTP 狀態；私人 repo 不回退或擴權。待該修正精確 CI／部署及真實匯出結果後才能聲稱串接完成。NexAeon 的 50 筆研究資產已登錄且全為私人，零變更重跑通過。首次公開內容仍須 Joey 審核，不由工程授權代替。契約與回滾：[MC_RESEARCH_IMPACT_EXPORT](docs/MC_RESEARCH_IMPACT_EXPORT.md)。

Project: MISSION_CONTROL
Timestamp: 2026-11-03T00:48:48.580Z
Task: Owner 回報失敗時保留既有公開歷史顯示
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Last Developer: Codex
Executed by: Codex
Actual Model: 未提供可核實的實際模型 ID
Branch: main

## Summary

### Owner 仍無 Buddy 紀錄 — 2026-11-03 後續修正

Joey 新截圖在 Owner 畫面仍無紀錄，並顯示 catalog503／GitHub403；parent 的實際 guest 檢查已有最新 Buddy 回報，不能把 guest 成功當 Owner 驗收。已定位 `readOwnerTowerRuns` 全部失敗仍回傳空物件，而日常畫面因物件為 truthy 跳過既有公開摘要。改為逐個固定公開專案選來源；可用私人回報優先，缺失／未確認時才顯示該專案既有安全公開摘要。私人 catalog-only 專案與接手／複製授權不變，catalog錯誤仍明確顯示。PR #27 精確隔離、全部歷史、Joey暫停、未知版本與Buddy來源保留。

403 目前不能判定為權限或限流，原 transport 沒有保留相應 headers，Vercel 查詢沒有應用程式日誌；不是「沒有錯誤」。新 server-only 固定診斷只記操作、HTTP狀態與有證據的限流／SSO／未分類拒絕，不記原始body、URL、repo、身分或憑證，不改scope、不自動重試。詳見[診斷、修正與驗收邊界](docs/MC_OWNER_PUBLIC_REPORT_FALLBACK_20261103.md)。發布 exact SHA、檢查與未完成項目以[官方 run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-owner-tower-fallback-20261103.json)為準；必須在受影響的 Owner 工作階段確認，不以 guest／READY／fixture 代替。

### Buddy 歷史回報精確隔離 — 2026-11-03

Joey 已明確授權本次修正與 MC 正式發布。Buddy 一筆舊回報格式不合法，導致 `PARTIAL`；日常卡片 summary 因此丟棄所有合法回報並退回 10/03 snapshot，接手複製也停止。新增 server-only 精確 blob 維護例外，同時要求同次完整讀取內有未改動、通過驗證的歷史補登；原始舊檔與全部歷史保留，不作可信 predecessor。其他 `PARTIAL`、來源／完整性／Owner 拒絕仍停止接手。詳見[修正及驗證邊界](docs/MC_BUDDY_REPORT_MAINTENANCE_20261103.md)。

Buddy 最新實際來源仍為 2026-10-28 `d70a7963febb669fd6205d10e2f7e0c3bf16c03a`，原開發 Claude Code；11/03 Codex 是歷史核對補登，不是產品修改日期。保留 Joey 暫停、未知版本及未驗收狀態。正式發布 exact SHA、驗證與部署結果以[官方 MC run](https://github.com/JoeyAJ/joey-mission-control/blob/mc/progress/.mission-control/runs/mc-buddy-report-maintenance-20261103.json)為準；READY／本地畫面不能取代正式 Owner 驗收。

### Current catalog commit preconditions

Catalog reads retain the fixed repository identity and Owner checks. Registry commits require a separate private-host identity check (`private=true`, `visibility=private`, correct repository ID/name, not archived/disabled), including a fresh check after the authorization callback. A public host can be read but cannot receive private registration commits. Current public MC host therefore supports the read path while private registration writes remain unavailable there. No repository visibility, credential or external permission setting was changed.

Verification: full guarded suite 1200/1200, focused transport/application checks 17/17, Handoff/identity checks 24/24, and 15 Chromium UI/privacy cases PASS; build/check/portable validate PASS. Mutation checks use isolated fixtures only, never production registry writes. Actual Engine visibility in Joey's verified Owner session remains pending. Exact release is recorded by the official run receipt.

### 最新根因與修正 — 2026-11-02 11:01 UTC Owner 診斷

Joey 實際 Owner 截圖回傳 `REGISTRATION_PRIVATE_IDENTITY_MISMATCH · HTTP 409`。在 GET catalog 路徑，唯一對應 throw 位於 `createRegistrationGitPort` 的 MC **catalog host** identity check；它在 Owner 前置驗證及 GitHub repo metadata HTTP 200 之後、讀 registry 之前。這不是 Google 帳號或 Engine 專案 ID 的比對。

新讀取的 GitHub metadata：`JoeyAJ/joey-mission-control`，ID `1404959099`，visibility **public**，archived=false。舊程式對同一個固定 MC host 強制 private=true／visibility=private，與實際 host 不符，足以產生截圖的 409。之前的 fixture 把 MC host 模擬成 private，因此未涵蓋正式情況。

修正：固定 catalog HOST 使用獨立 `registrationCatalogHostIdentity`（public／private=false／未封存／未停用），並繼續嚴格核對同一 repo numeric ID、full name 與全部 flags；缺欄位、不同 ID／名稱／visibility、archived／disabled 都拒絕。待匯入專案的 private=true／visibility=private 契約保持原樣，Owner/AAL2、token、scope、registry、來源 hash 與外部 credentials/permissions 設定未變；沒有更改任何 repository visibility 或把 Engine 公開。

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
