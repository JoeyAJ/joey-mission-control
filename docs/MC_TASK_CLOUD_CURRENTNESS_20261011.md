# 雲端多任務衝突與停用 currentness 修復

基準 `62615bf0054049f093bf70bc4796e8c5dc3ad90b`；實際開發者 Codex，模型 UNKNOWN。資格 LOCAL_VERIFIED_PENDING_PUBLICATION。本次由獨立審查發現兩個真實缺陷；上一版需求綁定不能當成整體驗收通過。

1. selected A／remote 同時變更 A、B 時，單一 conflict 被 B 覆蓋；local A 保留舊 revision，舊 report／CI 被標 MATCH。已用實際 controller／cloud／digest 測試先重現 Missing expected rejection，再修復為每 task 的 conflict Map。快照只投影所選 task 的 conflict，重複讀取不抹除；explicit reload／成功 save 只清該 task，保留其他 conflict。遠端已保存 task 消失也標衝突，不推定 local 有最新資格。
2. pending CI 的後讀可能合法回200 NOT_CONNECTED／tasks:[]，原程式改 persistence 再把 local 當 session，使舊 CI observed。現在捕捉 operation 開始的 cloud-backed 要求，前後兩次讀取都要 OWNER_RPC_AVAILABLE、selectedConfirmed、完整 remote/local task 相同；sticky cloud-backed 身分直到切 scope／Owner 清除，不從 deactivation／outage 降級成 session MATCH。既有 currentRequirements／task evidence／packet 同步 fail closed，local 需求文字保留。

handoff 的 cloud-backed task 在 report／digest／Owner await 前後重讀；第二次核對在私人文字交給 source copy transport 前完成。任何 task 衝突／停用／outage／missing／generation 變更都拒絕 packet，不寫舊 clipboard；session-only 新任務保留原明示資格。原 fresh source gate、project／track／source／HEAD／Owner／report blob／sequence／expiry guards 與 private URL/storage 邊界保留。

focused64、portable859／build／validate／check PASS，forbiddenAttempts0。新3個測試 groups 涵蓋 CI pre/post×兩 response orders、deactivation／outage／missing 在兩次讀取、多任務 handoff pre/post×兩 orders，及 reload僅解決selected。20 current synthetic actual-app browser cases PASS：新增 cloud-currentness4（每width375/390/430/1440 含Buddy＋University候選）、requirements4、PR-CI8、cloud-task4。新4案使用normal API factory 的合法200 NOT_CONNECTED，真copybutton／promised clipboard、兩種 remote順序、pending CI／handoff、local text保留、URL/storage／mobile；合計48 intended synthetic task writes，external／unexpected writes0。不是實際 Owner/provider HTTP 驗收。[receipt](qa/mc-task-cloud-currentness-20261011/receipt.json)／[browser](qa/mc-task-cloud-currentness-20261011/browser.json)。

原 task storage server／config／contract／權限、approved SQL、task validator、report binding／digest/schema、API-key guard、fresh Continue transport、palette、Owner cloud-save receipt 不改。只有 controller/cloud merge 與測試及生成 client 變更。Owner 已完成10:52 UTC雲端保存刷新，原证詞保留，不重測或執行「保存測試，只保存不執行」。

目前 Owner 決策儲存尚未實施或套用。主對話授權證據：Assistant Sentinel_bcb88241570481919e6e8368cfdee9ce（2026-10-11 12:33:29 UTC）詢問在既有私人DB保存「批准／要求修改」及備註／需求版本／成果依據，僅Owner讀寫、20/task及120總筆數、不刪歷史、不新增key、不自動合併／部署／Agent；User Sentinel_242c756311cc8191bdacf2713698fd98（12:43:39 UTC）答「允許」，本writer由parent收到完整 transcript。授權限 [既有四物件提案](MC_OWNER_TASK_DECISION_PERSISTENCE_PROPOSAL_20261011.md)，native ACL／denial／capacity／CAS／idempotency／rollback／資料不變與零fixture殘留PASS後才啟用。APPROVE 必為 Owner acceptance record、executionAuthorized=false，無 dispatch／merge／deploy authority。新 SQL/grants 尚未執行；無其他 scope或容量擴大。

唯一真實開發 run `codex-mc-task-cloud-currentness-20261011`，taskId `mc-task-cloud-currentness-20261011` 非Owner cloud task；predecessor為已terminal需求綁定run，不捏造binding／Agent任務執行。開始已發表，修復發佈exact READY後appendterminal；其他26個report blobs保留。真實bound cloud-task run absent、新UI實機验收pending、runtime GitHub channels UNKNOWN；servedCheckedSha=null，普通CONNECT403不繞過。Production／其他repo／secrets／AWS／model／dispatch不變；不重製被拒VM artifacts。

## Preserved prior current checkpoint

前次prefix SHA256 7ad5ab77114525889d74d7362bd853957aa851d4e25635de073b1ff02e474459；逐byte保存如下。Dated history SHA256（不含marker）68de1c1e6a0ad588431996926396a6e19777a26ecc6ad7770afd13a3a23a0ea9完全不變。

# Current task requirements binding — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T12:29:53Z
Task: Bind Agent reports to handed-off task requirements and revision
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: e35e7aec258286ebb7abacbcef31a4e2e5018567

Private handoff and optional immutable report header bind exact taskId/project/track/revision and full-request SHA256. Only MATCH contributes current task evidence; changed or unbound runs stay historical. Portable helper verifies full packet; CI rereads existing cloud task around await and preserves source/Owner/report guards. No legacy upgrade or automatic acceptance.

Portable856/build/validate/check,focused61 and42 synthetic browser cases PASS; root safe-intake10 PASS. Evidence: docs/MC_TASK_REQUIREMENTS_BINDING_20261011.md. Prior prefix preserved there byte-for-byte; dated root history unchanged. Owner cloud save/reload accepted10:52 UTC; no repeat or harmless-task execution.

Next Action: runtime b3454c5 fixed Preview exact READY; terminal3 verified, old25 blobs unchanged. Genuine bound cloud-task Agent report and new UI device acceptance pending; runtime GitHub permissions UNKNOWN. Owner decision proposal docs/MC_OWNER_TASK_DECISION_PERSISTENCE_PROPOSAL_20261011.md remains unapplied. No SQL/Auth/grants/secrets/other repo/Production/AWS/model/dispatch. CONNECT403 not bypassed; servedCheckedSha null. Do not recreate rejected VM artifacts.

End of the preserved prior checkpoint.

