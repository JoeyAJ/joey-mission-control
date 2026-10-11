# 任務需求版本與 Agent 回報綁定

資格：LOCAL_VERIFIED_PENDING_PUBLICATION。實際開發者 Codex；實際模型 UNKNOWN。基準 `e35e7aec258286ebb7abacbcef31a4e2e5018567`。接續任務回報檢視，重用既有 task storage、private source-bound handoff 和 repository report contract，無新資料表或存取權限。

交接包含固定 taskId、完整私人 developmentTask 和 `mc.task-requirements.v1` revision／requestDigest。指紋為 schemaVersion、projectId、track、taskId、revision、request（feature／acceptance／constraints）的 canonical JSON UTF8 SHA-256；timestamps 不影響需求身分。相同需求重複交接保持 ID／revision／digest。完整 request 僅在 private packet；report header 只有 schemaVersion／revision／digest，URL／localStorage／sessionStorage 不存私人需求、source 或憑證。

既有 report v1／v2／v3 可選 immutable taskRequirements，保留 legacy bytes／version／quota。portable helper 比對完整 task scope／revision／digest／registration；拒絕 packet 篡改、降級或同 run 增改 binding。舊 report 不改寫；改需求須新 run，保留 predecessor／唯一 writer 規則。

只有精確 MATCH 參與當前 Agent／tests／deployment evidence。不同 revision／digest 為 HISTORICAL_TASK_REQUIREMENTS_MISMATCH；未綁定舊 run 為 LEGACY_TASK_REQUIREMENTS_UNBOUND，保留歷史可讀。taskId 相同或 Agent PASS 不會升成新版需求完成。MATCH 只是 Agent 聲明與需求指紋一致，沒有 Owner 核准或執行權。University 候選維持 JoeyAcceptancePending。

PR／CI read-only request 可帶當前 binding，server 回報原 report binding 與獨立資格，client 再推導資格，拒絕偽造 MATCH。舊六欄 request 保留原 enum 與未核需求資格。CI 前後重讀既有雲端 task，跨裝置新 revision 使舊 pending CI／task evidence 清除；使用者輸入保留，須明確 cloud reload。原 source generation／scope／HEAD／Owner／report head／blob／sequence／expiry post-await guards 全保留。切案／來源失效／outage／revocation／登出清除舊內容，無 lastConfirmed fallback。

focused61、portable856／build／validate／check PASS，forbiddenAttempts0。42 synthetic actual-app browser cases PASS：需求綁定4（375／390／430／1440，各含 Buddy＋University 候選）、PR／CI8、task inspection4、existing task4、cloud task4、真 Continue12、palette／disclosure6。涵蓋完整需求、重複交接、改需求时舊 pending report、legacy 升級拒絕、新 matching run、CI pending 時跨裝置修改、cloud reload、Agent PASS 與獨立 FAIL 分離、outage／切案／登出、無 URL／storage 私人資料及 no execution。40 次預期 synthetic task API writes，另8次 other-device mock state saves（非 network write）；external／unexpected writes0。不是實際 Owner／provider HTTP 驗收。

scope proof：task validator／批准 SQL、共用 API-key privacy guard、fresh Continue transport、palette、Owner save acceptance receipt、source/task storage permissions 均與基準逐 byte 相同；10個 ordered source race cases 保留。root safe-intake10 PASS；root65319 bytes，prior prefix 逐 byte 保存、dated history不變。正式 build 同步生成 owner client／portable reporter。[QA receipt](qa/mc-task-requirements-binding-20261011/receipt.json)、[完整 browser cases](qa/mc-task-requirements-binding-20261011/browser.json)。

Owner 雲端保存／刷新10:52 UTC 已驗收，[原 receipt](MC_OWNER_CLOUD_SAVE_ACCEPTANCE_RECEIPT_20261011.md) 不變；不重測或執行「保存測試，只保存不執行」。真實 reports 仍無 cloud task-compatible ID／binding。需要授權外部 Agent 收到真正開發任務及新 packet 後發表新 run，不能冒用保存測試或重寫歷史。runtime GitHub permissions UNKNOWN，新需求綁定 UI 實機驗收 pending。

唯一實際開發 run `codex-mc-task-requirements-20261011` 的 taskId `mc-task-requirements-20261011` 是本開發工作識別，非 Owner cloud task ID，不捏造 binding。predecessor 為已 terminal task-report-inspection run。started／progress 已發表；exact runtime READY 後 append terminal3，其他25個 report blobs 不變。

[Owner 決策持久化提案](MC_OWNER_TASK_DECISION_PERSISTENCE_PROPOSAL_20261011.md) 明列4物件、完整 binding、僅2個 authenticated RPC EXECUTE、forced RLS、容量、CAS／retry／session gates 和 activation OFF；PROPOSAL_ONLY_NOT_IMPLEMENTED_NOT_APPLIED，無 SQL／ACL 執行。APPROVE／REQUEST_CHANGES 記錄不啟動 task、dispatch、merge 或 deploy，executionAuthorized=false。本次需求綁定不依賴此提案。

發布後補 fixed Preview runtime SHA／READY、獨立 ID、remote exact、Production 不變及 terminal schema／immutable-prefix／old25 proof。普通 cloud HTTPS CONNECT403 不繞過，servedCheckedSha=null；metadata 不充當 served-bytes／實機驗收。無 SQL/Auth/grants/secrets/其他 repo/Production/AWS/model/dispatch 變更，未重製被拒 VM artifacts。

## Preserved prior current checkpoint

前次 current prefix 自 e35e7aec 基準逐 byte 保存；SHA256 3e1770c3d9430deecad14e1154448d068a2fa89561510b16c6ef869f463ae3c0。原 dated history（含 marker63838 bytes）完全不變；不含 marker SHA256 68de1c1e6a0ad588431996926396a6e19777a26ecc6ad7770afd13a3a23a0ea9。

# Current saved-task Agent report inspection — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T11:40:04.487782Z
Task: Inspect exact saved-task Agent progress, tests and final handoff
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 957ac164b57d64ccb0f55b148d24aab6649b2cc6

Existing full task handoff reused. New collapsed task panel uses verified projection/report viewer: full scan then exact taskId/project/track/repo; failure clears,20/page,dated Agent tests and pinned handoff. Request revision remains unrecorded and explicit; completion still needs Joey review. Long task buttons wrap; palette and prior privacy/current-source guards preserved.

Portable848/build/validate/check,focused34 and38 synthetic browser cases PASS. Evidence: docs/MC_TASK_REPORT_INSPECTION_20261011.md. Prior root prefix preserved there byte-for-byte; dated history unchanged. Owner cloud save/reload accepted10:52 UTC; no repeat or harmless-task execution.

Next Action: fixed Preview341c70e exact READY; own run terminal3, old24 blobs unchanged. Genuine cloud task report absent; authorized external Agent must use exact real taskId, never rewrite legacy. Runtime GitHub permissions UNKNOWN; request-version binding and durable Owner decisions remain later bounded work. No new SQL/Auth/grants/secrets/other repo/Production/AWS/model/dispatch. CONNECT403 not bypassed; servedCheckedSha null. Do not recreate rejected VM artifacts.

End of the preserved prior checkpoint.

