# Mission Control 功能盤點

盤點日期：2026-11-02。程式基準：[`030a83f2cc721f1bd149e5e47efece0cfb7afead`](https://github.com/JoeyAJ/joey-mission-control/commit/030a83f2cc721f1bd149e5e47efece0cfb7afead)。本次增量與測試證據見 [HANDOFF](../HANDOFF.md) 及 [驗證紀錄](MC_SELF_PROJECT_VERIFICATION_20261102.md)。

「已實作」是程式存在；「已測試」需有對應檢查；「已部署」需對應部署 SHA；歷史交接記載的上線／Owner 使用與本次實測分開。Agent 自報、GitHub 獨立觀察、Joey 驗收是三種證據，不能互相代替。

| 功能 | 已實作與測試依據 | 部署／實際使用證據及限制 |
| --- | --- | --- |
| 日常 Control Tower 清單、看板、詳情、狀態分組 | `public/control-tower.js`, `tower-model.js`; `tests/tower-{model,board}.test.mjs` | main 已含；歷史 HANDOFF 記載上線。狀態依報告／Joey 選擇，不推算完工百分比。 |
| 三語 zh-TW／ko／en、手機單欄、桌面看板、減少動畫 | `public/control-tower.css`, `i18n.js`; `tests/tower-board.test.mjs` | 歷史有 375/1440 QA；本次瀏覽器結果另列。真實 iPhone 驗收不由 fixture 代替。 |
| 公開訪客唯讀、Owner 私人操作分界 | `api/index.mjs`, `src/reporting/public-tower-runs.mjs`; `tests/{guest-readonly,public-tower-runs}.test.mjs` | 訪客可讀已清理回報／狀態，無私人來源／交接／編輯／驗收；registry、ideas Owner-only。 |
| Owner 登入、AAL2／TOTP、密碼恢復、email login 邊界 | `src/continuity/owner-*.mjs`, `password-recovery*.mjs`; 對應 Owner/Auth tests | 生產 origin 已固定；歷史 OTP 準備不等於所有登入方式已啟用。此次不寄信、不改 Auth。 |
| 可替換 Agent 的可攜交接、最新來源解析、手動複製備援 | `public/joey-takeover.js`, `takeover-instruction.js`, `src/canonical/remote-handoff-adapter.mjs`; takeover/remote-handoff tests | 歷史 `MC_CURRENT_ACCEPTANCE.md` 記載 MC 及五個 scope Owner 讀取／接手驗證；跨裝置 clipboard 仍有待驗收範圍。複製不等於 Agent 已啟動。 |
| 專案記憶、Registry／Current State／Handoff、來源衝突與新鮮度 | `src/canonical/`, `src/projection/`, `src/continue/`; canonical/source/continue tests | 公開 snapshot 是歷史基準；私人 fresh-read 另行驗證。Git 作者不當作 Agent 身分。 |
| 既有 MISSION_CONTROL 日常卡片與 main 文件入口（本次） | `public/mission-control-project.js`, `app.js`, `control-tower.js`; `tests/mission-control-project.test.mjs` | 增量待本次發布證據；不另註冊、不更動既有 snapshot 或 registry。未有回報時版本／Agent 留空。 |
| 私人 registry 專案、記憶 hash 驗證、工作紀錄、拒絕／移除／恢復 | `src/onboarding/project-registration-*.mjs`; registration tests | Engine 的登記資料與 Owner 顯示獨立於四個固定 snapshot 卡片。全 catalog 驗證失敗會隱藏登記卡；不能繞過驗證。 |
| Idea 草稿、PRD、bootstrap bundle、建立前衝突檢查 | `src/onboarding/`; onboarding/draft/bootstrap/preflight tests | 私人 cloud draft 歷史已啟用；本機草稿仍可用。準備 bundle 不等於已建 repo、已部署或已授權新 scope。 |
| Owner 跨裝置狀態／交接意圖／驗收同步 | `public/tower-sync.js`; tower-sync tests；歷史 SQL migration 文件 | 歷史 HANDOFF 記載 RPC 已安裝；local-first／revision 防護。此次不重裝 SQL；實際裝置登入同步未重驗。 |
| 版本化開發任務、完整需求指紋、cloud save／reload、衝突與重試 | `src/tasks/development-task*.mjs`, `task-requirements.mjs`, `task-storage-*.mjs`; 對應 task tests | 歷史 cloud-save/reload Owner 驗證；Supabase Owner task RPC 不授權程式執行。真正綁定 cloud task 的外部 Agent 全鏈路仍須驗證。 |
| Git `mc/progress` 回報、started/progress/blocked/completed、心跳期限 | `src/reporting/repository-run-*.mjs`, `scripts/report-repository-run.mjs`; reporter/source/schema/isolation tests | 已有實際 Agent 報告與 Owner 回讀歷史；本次使用官方 reporter。報告為 AGENT_REPORTED，靜默過期不顯示持續執行。 |
| 多 track 隔離、容量分頁、rolling retention 與恢復 | `src/reporting/rolling-retention.mjs`; retention/capacity/maintenance tests | MC／Asset BASELINE 使用 rolling 11；其他 scope 保留既有容量。必須 atomic reporter，不單檔改報告或破壞索引。 |
| 回報工作台、run 選擇／時間線、檔案活動、交付證據、follow／pause | `src/reporting/workbench-*`, `file-activity*`, `delivery-evidence*`; workspace/report tests | v1/v2/v3 證據分級；檔案動作仍為 Agent 自報。沒有任意 live terminal／diff 串流的證明。 |
| Owner review、change request、rework、決策持久化 | `src/tasks/task-review-*.mjs`, `task-handoff-review.mjs`; review/rework tests | 歷史 SQL／ACL 安裝與拒絕測試 PASS；Tower review 與 task-bound review 是不同紀錄。實際 Joey 驗收不得由 Agent 代填。 |
| exact-SHA PR／checks／status／Actions 唯讀 reconciliation | `src/tasks/task-reconciliation-*.mjs`; PR-CI／intent tests | 已實作與 synthetic 驗證；實際 GitHub channel 權限／Owner HTTP 驗收依 scope 確認。CI 觀察不等於 Joey 同意 merge。 |
| VM link／worker evidence、摘要、連線與故障恢復介面 | `src/continuity/owner-vm-link*`, `owner-worker-*`, `docs/contracts/vm-link/`; 對應測試與歷史 receipts | 有歷史 bounded runtime repair 證據；不能因此宣稱 coding runner 已接通。此次未連線或發命令至 VM。 |
| finalization merge→preview、journal／cancel／resume core | `src/tasks/task-finalization-*.mjs`, `task-closure-*.mjs`; finalization tests | **fixture-only**；live factory 明確 `LIVE_EXECUTION_DISABLED`，缺 action grant、verified provider capability、private durable store。非生產自動合併／部署。 |
| 真正啟動 Agent、隔離分支開發、獨立 reviewer、有界修正、費用控制 | 尚無已接通端到端證據；見 [下一階段](MC_NEXT_PHASE.md) | **待開發／待驗證**。這次不啟用 runner、不新增付費模型／credentials／服務。 |

## 來源與驗收優先順序

先讀本次 HANDOFF，再讀本表及下一階段；舊 `MC_PHASE_PLAN.md` 段落和 `MC_CURRENT_ACCEPTANCE.md` 是帶日期的歷史證據。每一列 main 已含的程式可在以上精確基準 SHA 檢查；部署狀態只以相同 SHA 的實際發布結果為準。
