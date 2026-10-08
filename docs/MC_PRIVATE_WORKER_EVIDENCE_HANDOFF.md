# 私人 worker 執行證據檢視：工程交接

Parent 在 [範圍與驗收](MC_PRIVATE_WORKER_EVIDENCE_NEXT_SLICE.md) 呈報後明確指示實作、驗證並發布既有 fixed private preview。基線是 `68f599ce55f3b7499a48bc97a6fff1493df2bc1c`；原配對功能來源 `7c0053d24fa0df10b510c20175122aa82ef7cd23` 的操作步驟保持不變。實作者是目前 sole writer delegated Codex agent；可驗證 model identity 未提供，保留未知。

本機驗證已完成。功能 exact commit、provider READY/alias 收據及 served-asset hashes 隨本階段 private checkpoint 保存；local tests 不代替實際 Owner Auth/AAL2 或 VM proof。Provider 發布只有既有 fixed private preview，沒有 production promotion。

## Joey 可直接看到的改善

在既有 NEXAEON Owner pilot 區的 job 紀錄下方，新增「執行證據（只讀）」。她可以用按鈕或方向鍵選取 job/event，查看領取、spawn intent、turn completion、process exit 及 server outcome，並分開看來源時間、成功收到讀回的時間與 lease/執行期限。

沒有事件的 unclaimed job 顯示「尚未領取 · 尚無執行證據」；spawn intent 只代表已記錄啟動意圖。租約、事件或讀回過期會撤下「worker 回報執行中」標示。取消、失敗、未知與證據衝突分開；server 的原 outcome 保留，COMPLETED 缺少 turn／有序 exit 0 或含取消、失敗、禁止工具證據時，不確認完成。讀回失敗保留上次紀錄、標明目前狀態未知。

`owner-worker-evidence.mjs` 是純資料 projection；`owner-worker-evidence-ui.mjs` 是只讀 renderer。來源只有現有已合格的 Owner view，最多16jobs／128events；safe payload 嚴格 allowlist。沒有原始 message/reasoning/command/output/file/log；沒有新 RPC、polling、storage、dispatch 或 jobs。唯一新增 timer 只在本機使顯示的 freshness 到期，不做 network 或任何 Owner action。

新 inspector 不接觸 pairingCode。原 controller、prefilled command、Owner browser entry、Auth SDK port/config、bootstrap/worker、SQL/Edge、package pins 保持原 bytes。UI adapter 只增加 evidence 區、未確認提示與 cleanup，並修正舊 job 摘要把 spawn intent 稱為「執行中」的推論。

## 完成的驗證

- `npm run verify:portable`：550/550 PASS（含12項新 projection cases）、build/schema/static safety PASS，forbiddenAttempts=0。
- 新 viewer Chromium：1440/390/320 全 PASS；empty/waiting/claimed/spawn/cancelled/failed/inconsistent/completed，local expiry、鍵盤 job/event 選取、focus、失敗保留／恢復、invalid payload withholding、touch≥44px、無溢出、無 storage、無新增 Owner mutation。
- 原 guided-pairing Chromium：3種寬度全 PASS；相同命令／worker binding、terminal before approval、copy-before-hide、碼遮罩／hash-only RPC、hide與project clearing，無重複批准。
- Owner SDK lifecycle：9 cases PASS，synthetic only，network requests=0。
- 四段配對 fields/controls/render/clear-on-hide source 與11份受保護的 controller/command/Auth/config/SQL/Edge/bootstrap/release files，對基線 byte-compare PASS。
- [證據 manifest](contracts/vm-link/receipts/worker-evidence-view-20261008/manifest.json) 與各份 JSON/report/portable log 保存在 private Git，沒有加入 public assets。Tests 使用 synthetic view/session/RPC；沒有真人憑證或 live worker。

## 真實狀態與人手操作

2026-10-08 **09:45:40.096673 UTC**，只讀 Supabase metadata 仍確認：broker enabled；fence1 CANCELLED；fence2配對與claim window皆過期、`terminal=false/outcome=null`；兩筆都未 claimed、未 spawn、events=0。目前 worker unpaired、disabled、keyRegistered=false、unrevoked。這些 job 不能當成 active work。

Joey 通勤期間，agent 沒有呼叫 Owner mutation、重新批准、撤銷、取消、執行 VM 命令、取得 key/token 或觸發實際 worker。新 viewer 不改任何真人操作順序。她回來後仍依 [guided pairing handoff](MC_VM_LINK_GUIDED_PAIRING_HANDOFF.md) 親自撤銷 expired worker，再準備 terminal 等碼、確認並批准、立即複製碼並貼入等待中的 TTY、讀回實際結果，最後 pause/revoke。原歷史紀錄保留。

尚待的是那次 actual VM readback 與 Joey 使用體驗；通用 Agent/tool feed、canonical writer/cutover、Owner final-decision acceptance 和 production promotion 都維持原獨立 gates。本階段只改善已有證據的閱讀，不宣稱 Development OS 已完成。

## Exact fixed-preview release receipt

功能 commit `1a3487d98c2b706e470b6930532c58c9d7bb3962`，tree `b6fae8ea22ed96f9379b9839aa09e7ea9212ed4b`。Deployment `dpl_Di9dpuDtLs3pySZ7nP2FP8KsgHCM` READY/target=null，固定 alias 指向此 deployment。HTTP200 的 JS/CSS/config 與本機已驗證 bytes 一致；exact hashes 與 provider/readback 在 [preview receipt](contracts/vm-link/receipts/worker-evidence-view-20261008/preview-receipt.json) 及 [served assets](contracts/vm-link/receipts/worker-evidence-view-20261008/served-assets.json)。

09:57:07.912207 UTC 的 post-release metadata 再次確認原兩筆 job 未 claimed/spawn、events=0，worker receipts=0；目前 worker expired/unpaired/unrevoked。fence2 仍 terminal=false/outcome=null，保留真人 revoke recovery。Production 仍 8b4945b16a0b23f2e72033aa976fa34f94eabec0。後續 receipt-only commit 不變更這個功能或 public bytes。
