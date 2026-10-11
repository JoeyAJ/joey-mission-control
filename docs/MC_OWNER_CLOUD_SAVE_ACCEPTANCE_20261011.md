# Owner 最小雲端保存驗收

在既有 [固定 Preview](https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/) 使用既有 Owner 登入；選 Mission Control，等來源顯示已確認。

1. 按 **新增開發任務**，在開發需求填 `Owner 保存驗收 20261011（只保存，不執行）`，按 **保留本次任務**。
2. 按 **保存雲端任務**。應顯示 **雲端任務已確認保存。複製交接後仍要等實際 Agent 開工回報。**，且任務需求標示 **雲端版本已確認**。
3. 重整同一 Preview、選同一專案，開 **新增開發任務** 並選剛保存的任務；確認文字與 **雲端版本已確認** 恢復。

只需回覆 `保存後重整：有／沒有恢復`；若失敗，可補畫面上的錯誤類別或該請求 HTTP status。不要分享 Authorization、JWT、HAR、完整請求／回覆或私密來源內容。若既有 12 筆容量已滿，改選既有無害驗收任務，不刪除任務或擴增容量。

這次只驗證已授權的雲端保存與重整讀回，不啟動 Agent。MC 舊報告沒有符合新雲端任務 taskId 的 completed run，因此這次不點停用的 PR／CI 按鈕，也不重寫舊報告來啟用它。實際 runtime GitHub 四個 channel 的讀取資格仍待真實相符任務回報；保存成功不等於 PR／CI 或 Joey 外觀驗收完成。

實際 Owner 保存／重整已於2026-10-11 10:52 UTC 由 Joey 回報通過，測試任務為先前要求的「保存測試，只保存不執行」；見[獨立驗收紀錄](MC_OWNER_CLOUD_SAVE_ACCEPTANCE_RECEIPT_20261011.md)。不需要再為本階段建立或執行重複測試任務。此結果不包含 PR／CI 或外觀驗收。
