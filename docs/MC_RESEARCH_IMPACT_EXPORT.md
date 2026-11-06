# NexAeon Research-to-Impact bounded export

2026-11-06，Codex；實際模型 ID 未由環境提供。

`GET /api/private/impact-export?project=...` 只接受專用 `NEXAEON_IMPACT_SYNC_SECRET` Bearer，沒有 Owner session 或公開 guest 能藉此取得新權限。五個既有已授權 BASELINE 為 NEXAEON、MISSION_CONTROL、WOOSONG_BUDDY、JOEY_ASSET_SYSTEM、NAMYOUNG_WEB3D；不讀 registry-only 專案、不改既有 source profiles／report refs／scope grants／Owner 驗證。

沿用現有完整報告讀取與來源驗證後，選最新完成報告，要求回報測試全部 PASS，再向 GitHub 讀取同一 code SHA 的 checks。GitHub Actions checks 必須非空、完整、全部 completed/success；來源不完整、私有來源無權限、無 CI、分頁超限、待執行或失敗皆停止匯出。

輸出只有固定專案名稱、固定網址、slug、code SHA、CI check 數量與查核時間。Agent 自報完成不等於產品驗收；`productAccepted=false`、`academicClaims=false` 固定，不輸出私人活動／原文／feature／檔案路徑／repo 名稱／測試名稱。

NexAeon 定期拉取這份結構化成果，在私人 Research Workspace 建立待審核草稿。首次公開由 Joey 決定，核准後可下載 SHOWCASE.md；只有明示允許的同一來源版本與 CI 資訊能自動更新。MC 原本的管理、交接、公開案例與 Owner 資料流保持不變。

新增 GitHub CI 跑完整 portable verification（測試、build、validate、check），供新的精確提交產生可查核證據。沒有成功 CI 的歷史提交不會被追認；不為其他私人 repo 增加 workflow 或授權。

回滾：停用 NexAeon 的同步開關，或回復 MC 上一個已驗證部署。此功能不寫 MC 資料庫／registry／report branch，沒有 MC 資料遷移。

來源清單：相同受限端點不指定 project 時，只向已驗證服務回傳 mc.impact-catalog.v1 的 projectId／名稱／slug／網址。網站以此清單核對每筆成果的精確來源，不再維護另一份專案 allowlist。清單不包含 repo、原始報告或額外私人範圍；未知來源仍拒絕。

## GitHub App CI 讀取 — 2026-11-06

Joey 已在 GitHub 建立並安裝專用 App，於 MC Production 設定 `MC_GITHUB_APP_ID`、`MC_GITHUB_APP_INSTALLATION_ID`、`MC_GITHUB_APP_PRIVATE_KEY`。私鑰僅由伺服器讀取，不拉回工作區、不輸出於診斷或回應。

原 `MC_GITHUB_READ_TOKEN` 繼續讀取既有受限報告；App 只處理 CI。每次憑證交換明示限定單一既有 repo 與 Checks read，不繼承整個安裝範圍或 Contents 權限。RS256 App JWT 有限時效；installation token 僅存在記憶體，距到期兩分鐘內更新，同一 repo 的並發請求共用交換。上游 401 只允許重新取得一次；403 不重試、不回退成個人 Token 或匿名讀取。未設定 App 時保留原有連接模式，以便回滾；部分設定、無效私鑰或交換失敗均停止，不靜默降級。

GitHub 官方文件目前列明 fine-grained 個人 Token 不支援 Checks API；此前將四個 403 一概解釋為「再補 Checks 唯讀權限」並不完整。App 支援該 API，但仍須實際安裝範圍、Checks read 及精確提交的成功 CI。App 連接成功不會追認失敗／空白／未完成的歷史 CI，也不會自動公開草稿。

回滾可切回先前部署；也可移除全部三項 App 設定並部署，恢復原有模式。原報告 Token 與來源授權不改；四個私人來源在原模式下可能再次如實回報 CI 讀取受阻。只移除部分 App 設定會停止 CI 匯出，不能當作回滾。

參考：[GitHub App installation tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)、[Checks API](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference)。
