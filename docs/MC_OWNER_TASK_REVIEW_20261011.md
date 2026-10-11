# 已批准的私人 Owner 任務驗收紀錄

基準 `86806a73eafcd95993a8734e094115ed6af84564`，實際開發者 Codex／模型 UNKNOWN。Joey 於2026-10-11T12:43:39Z明確允許先前四物件提案及原有容量／讀寫 ACL；不要求重複批准。這項後續授權只涵蓋既有 Supabase 私人驗收紀錄，不授權 Agent 執行、merge/deploy、新 keys、Auth/membership 修改或其他 repo。

`src/tasks/task-review-{contract,client,server,controller,view,config}.mjs` 與既有 Owner task 介面接上 default-collapsed「Joey 驗收紀錄」。GET 只讀 capability；list/append 都用同源 POST body，私人 taskId/source tuple/comment 不進 URL/storage。Owner SDK/AAL2/live session/NEXAEON membership 沿用。字串以 textContent 顯示；回覆 exact keys/digest/time/size 全部驗證，舊 packet／歷史决定不沿用。

APPROVE／REQUEST_CHANGES 只記錄指定 tuple 的 Owner 決定，資格 OWNER_TASK_REVIEW_RECORDED、executionAuthorized:false。綁定已保存 cloud task revision＋完整需求 SHA256、project/track/repo/canonical ref/HEAD、mc/progress HEAD/path/blob/sequence、completed runId/workRef/code SHA。前端先用既有 fresh PR/CI flow；server 前後重讀 cloud task、完整兩頁回報及 Git metadata，Owner 在各 await 後核對。EXACT_TASK_REQUIREMENTS_MATCH 與 EXACT_REPORTED_COMMIT 必須成立；Agent tests、各 observed CI qualification 與 Owner acceptance 分別顯示，沒有自行把 failed/unknown CI 改為 PASS。若 provider write 已嘗試而後續來源改變，標 write unconfirmed，不能聲稱 rollback；重讀只顯示 dated record。

丟失 acknowledgement 重試只在 RAM 保留原 operation／exact opinion／binding；原 operation 不重複 append。修改意見／需求、選案、來源與回報 generation 變化、expiry、權限撤銷或登出清除 current ack、private history/comment。讀取歷史後也須對 fresh tuple 核對，否則明示歷史。REQUEST_CHANGES 不自動改需求；Owner 明確保留／雲端保存下一版，再另行交接；新版必須另有匹配 report。University 候選原資格不升級為 accepted。

## 四物件 migration 與證據

既有 `scmvedfqwlhkyvljymjj` 成功安裝 exact `docs/contracts/sql/task-review-decisions.pending.sql`，SHA256 `b2b675098ffc76f6adf1215c90e2947c11d557d09e75f836a2c4b2ebae0c0249`。pending 檔名保留供 exact bytes/hash 審查，已套用狀態在此紀錄。新物件只包含 private table、private validator、public list/append RPC；120/Owner、20/task、50/page、16KiB review、2000 UTF16 units及8KiB comment。append-only／CAS／原 operation exact retry；達限精確 blocker，不刪除／輪替歷史。Owner shared advisory lock 防跨任務超限；等待鎖後及寫入後重核身份，existing task row FOR UPDATE／canonical_json＋builtin SHA256 核對需求指紋。

Native isolated PostgreSQL17.11 的15組 check PASS：transaction rollback 零新物件、原 ACL/helper/membership 不變、forced RLS／無 UPDATE/DELETE、JS/SQL digest parity、原時間 exact retry（含需求已更新）、錯誤 operation/CAS/digest、anon/service/AAL1/no-session/revoked/expired/nonmember/foreign Owner denial、shape/credentials/UTF16/path/track、20/task及50/page、兩 native connection CAS、等待鎖期間 Owner 撤銷、120/Owner及不同 task 爭最後一格、decision rollback 零資料。Docker network none／無 host mount／無 actual Supabase/Auth，所有測試容器已移除。[Native](qa/mc-owner-task-review-20261011/native.json)。

正式 migration 前後十張既有 MC 表的所有 row digests、既有函式定義/ACL/owner/config、schema ACL、兩筆 postgres→executor membership 及 table policies 完全相同。新物件屬受限 NOLOGIN/NOINHERIT/NOBYPASSRLS executor，empty search_path；forced RLS exact actor，authenticated 只有兩 RPC EXECUTE，無 direct table/private helper access。暫時 CREATE/SET 在 COMMIT 前恢復；沒有 new extension/key/role/helper grant。正式 native10個 no-session/anon/service/direct/helper denial checks PASS：既有 session gate 的 SQLSTATE28000 OWNER_SESSION_DENIED 也必須拒絕。沒有偽造 Owner JWT/session claims，沒有修改 Auth helper/membership，沒有寫入 harmless save-test 或決策；新表仍0 rows。PostgREST schema reload 已通知。[Live denials](qa/mc-owner-task-review-20261011/live-denials.json)。

Server activation 僅在 exact migration/native/live ACL/data gates PASS 後開啟，固定 hash／project／verified qualification；request/import/env 無法啟用。DB 記錄 Owner attestation，不宣稱 DB 自行驗證 GitHub。實際 Owner JWT HTTP／新 UI 裝置驗收與 genuine bound cloud-task Agent run 仍待完成；GitHub channel permissions UNKNOWN。先前 Owner task 保存/reload10:52 UTC 已驗收，不重做且不執行「保存測試，只保存不執行」。Currentness 修復已先獨立发布，無等待本功能；整體需求綁定獨立驗收仍待。

## 測試與固定 Preview 收尾

Portable872/build/validate/check、Owner focused13、root intake20 PASS；forbiddenAttempts0。最終 actual-app/normal deployment factory/official SDK browser8 widths cases PASS（Owner4及cloud-currentness4，每width含Buddy＋University候選），32 intended synthetic task writes＋24 intended synthetic review writes，external/unexpected0。[Receipt](qa/mc-owner-task-review-20261011/receipt.json)／[Browser](qa/mc-owner-task-review-20261011/browser.json)。精確 publication receipt 在下方收尾追加；普通 cloud HTTPS 的 CONNECT403 不繞過，servedCheckedSha保持null。Production固定部署及SHA保持不變。無新dispatch/model selector/AWS/write execution、其他 repo write、憑證／Source private資料外洩。拒絕的兩個 VM operational artifacts 未重製或上傳。

## 前一 root prefix（exact bytes）

```text
# Current task cloud currentness repair — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T12:53:00Z
Task: Retain per-task conflicts and require fresh cloud-backed CI/handoff
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 62615bf0054049f093bf70bc4796e8c5dc3ad90b

Independent review reproduced overwritten selected-task conflict and200 NOT_CONNECTED downgrade. Conflicts now persist per task; explicit reload resolves only that task. CI captures cloud-backed state and requires exact selected remote task on both reads. Handoff rereads before private copy. Deactivation/outage/missing task clear current evidence and packet, retaining local text. Binding acceptance remains pending independent review.

Portable859/build/validate/check,focused64 and20 synthetic browser cases PASS. Evidence: docs/MC_TASK_CLOUD_CURRENTNESS_20261011.md. Prior prefix preserved there byte-for-byte; dated history unchanged. Owner save/reload acceptance10:52 UTC retained; harmless task never executed.

Next Action: runtime9fb3e7b same Preview exact READY; terminal3/old26 unchanged. Continue approved four-object Owner decision storage, native ACL/data/CAS/capacity/rollback checks before activation. Approval12:43:39 UTC; no decision SQL/grants applied yet. Genuine bound task Agent run/UI device acceptance pending; GitHub permissions UNKNOWN. No Production/other repo/secrets/AWS/model/dispatch. CONNECT403 not bypassed; servedCheckedSha null. Do not recreate rejected VM artifacts.

```
