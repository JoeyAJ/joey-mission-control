# 既有專案任務的 Agent 回報檢視

實際開發者 Codex；實際模型 UNKNOWN。基準 `957ac164b57d64ccb0f55b148d24aab6649b2cc6`。本次接續 Joey 已驗收的雲端保存／刷新，沒有重跑或執行「保存測試，只保存不執行」。[Owner 驗收](MC_OWNER_CLOUD_SAVE_ACCEPTANCE_RECEIPT_20261011.md) 的原始證詞、時間和資格保留原樣。

檢查既有實作與八步差距後，專案／版本、完整任務需求與固定 taskId 的外部 Agent 交接已存在；completed run 的 exact-commit PR／CI 獨立讀取也已存在。實際缺口是：已保存任務只能看到「此任務已有 Agent 回報」，無法直接查看這個 taskId 的進度、測試與最後交接。本次只補這個可用切片，重用 `workbenchProjection`、`renderRepositoryRunView` 和 `createDisclosureState`，沒有另一套報告模組或新資料表。

在已選任務下新增預設收合的「本任務 Agent 回報／測試／交接」。來源必須 connected／FOUND、專案／track／repository 一致，且完整 report scan 先驗證，再篩同一 taskId；任一外案 row、PARTIAL、來源失效／拒絕／讀取中都清除內容，不保留 lastConfirmed 私人卡片。面板呈現實際署名、原始時間、progress、Agent 回報的 PASS／FAIL、nextSteps 和固定 code commit 的交接文件；沿用20筆／頁以及完整檔案核對總數。相同任務刷新保留收合及鍵盤焦點；切任務／revision／案／track／登出清除。未保存修改暫停顯示。

現行 report schema 沒有 request revision/digest，畫面明示「未記錄需求版本，請核對本次需求」，不把同 taskId 的舊結果宣稱為新版需求完成。候選仍是 University／JoeyAcceptancePending；Agent completed、Agent tests、獨立 PR／CI、部署與 Joey 決定維持不同資格。修正交接文字對已存在 PR／CI 的過時「尚未接入」說法。手機長任務名稱換行只有 `.development-task .new-project-drafts button` 這一條布局規則；既有配色規則與所有來源／憑證防護保留。

| 既有工作流程 | 目前可用結果 | 尚未完成的真實條件 |
|---|---|---|
| 保存需求、固定 taskId、重整續編 | 已實作，Owner 雲端保存／刷新已驗收 | 本次新增面板的實機驗收尚無證詞 |
| 專案／track 的外部 Agent 完整交接 | 既有 fresh copy 含原始需求、taskId、來源與 report 登記 | 需有授權外部 Agent 收到真正開發任務；MC 不啟動執行 |
| 同任務進度、tests、最後交接 | 本次新增檢視；完整掃描後以 exact taskId 篩選 | 真實 Agent 需發表 started/progress/completed；目前 MC 真實報告沒有 cloud task ID，不重寫 legacy |
| PR／CI 獨立核對 | 既有 exact completed run/code SHA 的私人讀取 | Runtime GitHub 各 channel 權限 UNKNOWN；相符真實 completed task run 仍未出現 |
| Joey 檢查、決定與後續交付 | 可閱讀上述證據及需求版本限制 | durable request-changes/acceptance 與 exact-head merge/deploy pipeline 仍是後續有界工作；本次不擴權或執行 |

本切片不需要新 SQL、schema 存取或權限批准；使用既有獲准 task storage 和 report branch。若下一步要讓回報證明特定需求版本或保存 Owner 決定，需另備明確 contract／持久化變更，不能從本次視覺檢查推定授權。沒有捏造外部 Agent 執行、PR、CI 或最終驗收，沒有合併任何 PR。

驗證：focused34、portable848／build／validate／check PASS，forbiddenAttempts0。38 synthetic actual-app browser 案例 PASS：新任務檢視4（每案同時 Buddy＋University 候選）、PR／CI8、既有任務4、雲端任務4、真 Continue12、配色／收合6。新案覆蓋固定 ID／原始需求交接、cloud reload、同任務進度與 FAIL 可見、需求修改、不顯示別任務、完整22檔案／21符合任務分頁、刷新焦點、outage、pending read 切案與登出。24 次預期 synthetic task writes，非真實 Owner 或 GitHub writes；external／unexpected writes0。新 theme 測試 selector 明確鎖定當前可見 selected-task-brief；原配色／對比／44px／focus／reduced-motion 斷言保留。獨立 scope parity 證明共用 API-key guard/server/contract、批准 task validator/SQL、既有 PR／CI post-await source/generation、fresh Continue 與 Owner receipt 不變。[Receipt](qa/mc-task-report-inspection-20261011/receipt.json)、[瀏覽器證據](qa/mc-task-report-inspection-20261011/browser.json)。

唯一實際開發 run `codex-mc-task-report-inspection-20261011` 的 taskId 是開發工作識別 `mc-task-report-inspection-20261011`，不是 Owner cloud task ID；不得改成 Owner 保存測試的 ID。基準 pinned957，前序為已 terminal 的 API-key 修復 run；只 append 本 run，其他24個報告及所有舊 terminal 保留。開始與進度均為真實 Codex 工作，沒有推定外部 Agent 開工。

同 branch／固定 Preview 的 exact SHA/READY、獨立 deployment ID、Production 不變、terminal immutable-history 與 served 限制在發布後補入。普通 cloud HTTPS CONNECT403 不繞過；servedCheckedSha 維持 null，READY metadata 不冒充 served-bytes 或實機驗收。沒有 SQL/Auth/grant/secrets/其他 repo/Production/AWS/model/dispatch 變更，也沒有重製被拒 VM artifacts。

## Preserved prior current checkpoint

以下前次 current prefix 從957基準逐 byte 保存；SHA256 3ad4786eb86c240dec4da9bff2391372bc2e6f81ebebc3f2ab8c17468c1c066c。root 中原 dated history 完全不變。

# Current PR/CI API-key label correction — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T10:47:23.074Z
Task: Shared provider-label privacy guard for API-key assignment variants
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 7a10322e1936f0ecbfe1c854f24bc8a00e895654

Shared PR-CI label/context-ID guard covers API-key assignment variants. Server redacts before response; client rejects unsafe replies; synthetic DOM regressions PASS. Task validator/SQL parity, current-source races, palette/disclosures, candidate qualification and fresh Continue unchanged.

Portable845/build/validate/check, focused31/root10 and18 synthetic browser cases PASS incl server-client-DOM8, cloud-task4 and palette/disclosure6. Evidence: docs/MC_PR_CI_API_KEY_LABEL_FIX_20261011.md. Prior current root prefix preserved there byte-for-byte; dated root history unchanged. New receiving-Agent BUGFIX run starts page2 after terminal palette run; no prior terminal append.

Next Action: fixed Preview635dcfe READY; independent docs/MC_OWNER_CLOUD_SAVE_ACCEPTANCE_20261011.md. Owner save/reload accepted10:52 UTC; receipt docs/MC_OWNER_CLOUD_SAVE_ACCEPTANCE_RECEIPT_20261011.md. Appearance pending; GitHub permission UNKNOWN. No compatible completed cloud-task report; do not click disabled PR/CI or rewrite old reports. SQL/Auth/secrets/grants/Production/other repo/AWS/model/dispatch unchanged; CONNECT403 not bypassed. Do not recreate rejected VM artifacts.

End of the preserved prior checkpoint.
