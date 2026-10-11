# Owner 核准／要求修改的最小持久化提案

資格：PROPOSAL_ONLY_NOT_IMPLEMENTED_NOT_APPLIED。本次需求綁定不需要此提案，不執行任何 SQL、權限、Auth、credential 或 Owner decision write。目標若另行批准，僅為既有 Supabase `scmvedfqwlhkyvljymjj`；不建立新 project／key／service／executor。

現有 `mc_private.development_tasks` 僅保存嚴格 v1 task specification，JS／SQL exact keys 不允許 decision 欄位；本次保持原樣。既有 coordinator decision 綁的是 epoch／context／proposalOperation／resultHash，不能把它當成 repository taskId／runId／需求指紋／code SHA 的審查紀錄。Agent report 是 Agent 署名，也不能代寫 Owner 決定。目前沒有適用的 durable task-review ledger。

## 擬議四個新物件

| 物件 | 有界用途 |
|---|---|
| `mc_private.task_review_decisions` | append-only Owner decision；`owner_subject uuid`、`task_id text`、`decision_sequence bigint`、`operation_id uuid`、`decision_digest text`（64 hex）、`committed_at timestamptz`（DB 時間）、`review jsonb`（最多16KiB） |
| `mc_private.validate_task_review(jsonb)` | exact envelope、scope／revision／digest／enum／長度及當前已保存 task 驗證；私有 helper |
| `public.mc_owner_task_review_list(task_id text, after_sequence bigint, page_limit integer)` | 同一 Owner／task 有序讀取，最多50／頁，不返回他案或私人 request 原文 |
| `public.mc_owner_task_review_append(review jsonb, operation_id uuid, expected_sequence bigint)` | CAS、同 operation exact retry、前後 Owner/session 檢查、append 與最小 acknowledgement |

Table primary key `(owner_subject,task_id,decision_sequence)`；unique `(owner_subject,operation_id)`；FK `(owner_subject,task_id)` 指向既有 task。提案上限120 rows／Owner、20 rows／task；達限回精確 capacity blocker，不刪除／輪替歷史。不同 task writer 也須在同一 Owner lock 下檢查全域容量。拒绝 update/delete、改 task/project/track、重用 operation_id 改內容，以及任何 lost-response 重複 append。

`review` 的完整 binding 需含 schemaVersion、projectId、track、taskId、`taskRequirements{schemaVersion,revision,requestDigest}`、repositoryId、canonicalRef／canonicalHeadSha、reportRef（固定 mc/progress）、reportPath（既有兩個安全目錄）、reportHeadSha、reportBlobId、reportSequence、runId、workRef、codeSha、decision（APPROVE／REQUEST_CHANGES）、comment（最多2000字及8KiB UTF8，不放憑證）。不複製整份需求、provider logs、任意 URL、access token 或 Agent prompt。

Append RPC 必須鎖定既有已保存 task row，要求相同 Owner/project/track/current revision；從該 row 的 schemaVersion/projectId/track/taskId/revision/request 用既有 `mc_private.canonical_json` 的 UTF8 SHA-256 重算 requestDigest，與新 Agent header 的 digest 演算法做 JS／SQL parity。需先確認現有 SHA-256 digest helper 及受限 executor 的權限；本提案不批准新增 extension 或額外 grant。若該前置能力不存在，需另列 exact helper／ACL proposal，不能信任 client 傳來的 digest 代替驗證。

記錄資格只能表示 Owner 對指定 tuple 的決定（`OWNER_TASK_REVIEW_RECORDED`，`executionAuthorized:false`），不能表示 RPC 自行驗證 GitHub，或允許 merge/deploy。未來 private API 在 append 前須用現有 server policy fresh-read task/source/full report，確認 MATCH／completed exact commit，再讀取適用 PR/CI channels；await 後再次比對 source generation／HEAD、task revision/digest、report HEAD/blob/sequence、Owner/session。前端不能把未完成 acknowledgement 當已核准。

讀取決策後也須對最新資料重新核對；需求修改、report／PR head／source tuple 改變或權限失效，原決定保留為 dated historical decision，不能自動沿用。REQUEST_CHANGES 只保存 comment 與 binding，沒有自動改 task 或 dispatch；下一個需求 revision 須由 Owner 明確保留／雲端保存，再另行交接。APPROVE 不啟動 merge/deploy；其 authority 與 pipeline 仍需另外明確批准。

## 擬議 ACL 與啟用門檻

沿用現有 exact Owner／AAL2／live Auth session metadata／NEXAEON active membership 的 `project_draft_actor()`，不新增角色或 membership。新 table 與 private helper 屬既有受限 `mc_continuity_executor`，forced RLS、exact Owner policy；PUBLIC／anon／authenticated／service_role 無 table direct access 或 private-helper EXECUTE。只有兩個新 public RPC 可給 authenticated EXECUTE，內部仍前後檢查 exact Owner；需要存取私有 table 的 definer wrapper 以既有受限角色執行、空 search_path，不能用 postgres/bypassrls。不調整任何既有 helper／task table／RPC／credential 權限。

未來 API 使用新 `/api/private/task-review-decisions` 的 GET／POST，與現有 read-only PR/CI endpoint 分開；same-origin、no-store、既有 Owner SDK/session，private binding 放 body，不入 URL/storage。暫時 migration CREATE／role SET 如有必要，必須在另行批准的 exact migration 中列出並恢復；預設 server activation OFF，只有 exact migration hash、native ACL/forced-RLS/denial/capacity/CAS/parity/rollback-only fixture/readback PASS 後再提啟用。需證明既有 task data、函式定義／ACL、role membership 及設定未變，最後另做真實 Owner UI acceptance。

這是可審查的範圍提案，尚不是已驗證 migration。沒有呼叫 Supabase 查詢、advisor、migration 或 grants；沒有假稱現有 digest helper／DB 版本已查實。參考官方 [Database functions](https://supabase.com/docs/guides/database/functions) 與 [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) 的 function permission／角色與 ownership 邊界。已讀 [changelog](https://supabase.com/changelog) 與 [Postgres minor breaking changes](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)；本提案不操作 ltree、btree_gist、PGP 加密或 custom operators，也不從文件推定目前 project 的升級狀態。
