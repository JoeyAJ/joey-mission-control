# NexAeon Research-to-Impact bounded export

2026-11-06，Codex；實際模型 ID 未由環境提供。

`GET /api/private/impact-export?project=...` 只接受專用 `NEXAEON_IMPACT_SYNC_SECRET` Bearer，沒有 Owner session 或公開 guest 能藉此取得新權限。四個固定 BASELINE 為 NEXAEON、MISSION_CONTROL、WOOSONG_BUDDY、JOEY_ASSET_SYSTEM；不讀 registry-only 專案、不改既有 source profiles／report refs／scope grants／Owner 驗證。

沿用現有完整報告讀取與來源驗證後，選最新完成報告，要求回報測試全部 PASS，再向 GitHub 讀取同一 code SHA 的 checks。GitHub Actions checks 必須非空、完整、全部 completed/success；來源不完整、私有來源無權限、無 CI、分頁超限、待執行或失敗皆停止匯出。

輸出只有固定專案名稱、固定網址、slug、code SHA、CI check 數量與查核時間。Agent 自報完成不等於產品驗收；`productAccepted=false`、`academicClaims=false` 固定，不輸出私人活動／原文／feature／檔案路徑／repo 名稱／測試名稱。

NexAeon 定期拉取這份結構化成果，在私人 Research Workspace 建立待審核草稿。首次公開由 Joey 決定，核准後可下載 SHOWCASE.md；只有明示允許的同一來源版本與 CI 資訊能自動更新。MC 原本的管理、交接、公開案例與 Owner 資料流保持不變。

新增 GitHub CI 跑完整 portable verification（測試、build、validate、check），供新的精確提交產生可查核證據。沒有成功 CI 的歷史提交不會被追認；不為其他私人 repo 增加 workflow 或授權。

回滾：停用 NexAeon 的同步開關，或回復 MC 上一個已驗證部署。此功能不寫 MC 資料庫／registry／report branch，沒有 MC 資料遷移。
