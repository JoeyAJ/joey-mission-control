# New-project creation preflight — 2026-10-11

目前階段是 `PREFLIGHT_ONLY_NOT_PROVISIONED`。依 parent明確授權，在既有 onboarding／Owner private cloud draft及六份 canonical 文件包上補缺少的建立計畫；真實任務 packet與Owner驗收延後，不以該人工作業阻擋獨立MC實作。沒有建立新repo、SQL/grants、credentials、deployment project、外部Agent派發或live provisioning；保存測試任務未執行或修改。

## 缺口與 resulting behavior

原本草稿只列一般 pending readiness與六份文件。現在「準備並複製建立計畫」一次輸出明確repo／初始分支提案、private要求、六份原始文件、部署intent、source／report接入範圍和每項下一步。沒有新增需要Joey複製的欄位。Compact disclosure標明「建立計畫已準備／資料待補／目標衝突」及缺項，原readiness與文件包保留。

未填repo時，從fresh Owner capabilities的唯一既有namespace＋projectId穩定產生repo提案；不把姓名或revision變動當新identity。混合namespace／expired capabilities無法推定缺失namespace。明填repo僅canonicalized intent；未知target existence保持UNCONFIRMED且不讀未知repo。GitHub repo大小寫不敏感；既有projectId／repo或另一草稿target重疊標CONFLICT；沿用既有delivery policy檢查typed URL origin，不能把既有Preview／Production／University候選固定網址當新專案目標，不覆寫或另登記。

初始文件重用完整PRD.md、README.md、docs/PRODUCT_CHARTER.md、docs/PHASE_PLAN.md、HANDOFF.md、.mission-control/bootstrap.json。未填repo時原manifest仍pending；計畫明列取得exact授權後先綁定pending repositoryId再初始化。沒有變更既有mc.project-bootstrap.v1契約／validator／materializer或六份文件內容，也沒有增加一套provisioning架構。

Source接入清單是exact project/repo/ref/HANDOFF及四份context文件，source-profile path明列。Report接入清單是mc/progress、兩個固定report目錄與禁止該分支部署；需named scope及真實Agent start。網站若需要，提供Vercel/projectId slug/preview提案，account/team與固定URL仍缺設定／授權；型別URL不是部署證據。不需要網站／backend時依原草稿記NOT_REQUIRED；需要backend則保留缺設定。planReady只表示雲端草稿、驗收及提案target已整理，永遠provisioned/developmentReady/executionAuthorized=false。

## Fresh preflight 與 private boundaries

一鍵準備使用既有Owner before/after、fresh capabilities、cloud draft前後唯讀list及原scoped source reader。只查已知repo/ref的既有入口，保留dated source proof但衝突不升ready。Cloud version在source await改變就拒絕packet；deletedcloud draft不能標saved/ready。Outage、cap expiry、active plan lease expiry、logout/revocation、draftedit清除舊計畫與manual instruction；無stale fallback。Private plan／PRD／repo只留既有private response、登入session記憶及explicit clipboard/download；不放URL/storage/public snapshot。Source APIs、database/schema/ACL/activation、existing URLs、Owner review click fix及report helper不變；僅同步build Owner client生成物。

## 驗證與限制

Focused50 PASS（新增11組plan/controller＋既有39組onboarding/cloud drafts）：deterministic target、invalid/incomplete identity、case/project/other-draft conflicts、expired/ambiguous namespace、unchanged六文件、unknownrepo zero reads/writes、supported readconflict、outage/no fallback、other-device/deleted row、pendinglogout/Ownerloss、activeexpiry、read期間revision漂移。

Actual-app／official SDK／synthetic upstream browser8 widths cases PASS：375/390/430/1440的onboarding4與cloud draft4。Freshsaved/reload的一键plan／copy帶exacttarget、原PRD／六文件、missingauthorization/config資格；unknowntarget不增GitHubreads／writes，expandedplan手機無overflow。原download/import/manual fallback/multi-draft/conflict/reload/lostACK/expiry/revocation/pendinglogout/private storage guards保留。16 intended synthetic cloud draftwrites；actualOwnerwrites0、taskwrites0、external/unexpected0。不是實際Owner/providerHTTP或新專案驗收。Portable888/build/validate/check與root安全intake20 PASS；forbiddenAttempts0。

已檢視 synthetic [390px 展開計畫](qa/mc-project-creation-preflight-20261011/390-creation-plan.png) 與 [1440px](qa/mc-project-creation-preflight-20261011/1440-creation-plan.png)；預設 disclosure收合，沒有欄位溢出。

新run是實際MCpreflight開發，不偽裝任何cloud saved task的Agentrun，不回寫舊terminal。固定Preview metadata READY與ordinaryserved check分開；CONNECT403不繞過，checkedSha保持null。Production及被拒VM artifacts不動。完整新專案仍缺exact repo creation/private/existence authority、source/reportregistration、部署target configuration/authority與真正工作環境／Agent／Owner驗收。

## 前一 root prefix（exact bytes）

```text
# Current Owner review intent fix — 2026-10-11

Project: MISSION_CONTROL
Timestamp: 2026-10-11T14:07:40.528Z
Task: Bind Owner decision to the displayed exact tuple
Status: LOCAL_VERIFIED_PARENT_READ_PREVIEW_PUBLISHED
Last Developer: Codex
Executed by: Codex
Actual Model: UNKNOWN
Baseline: 9b87948fc058e3a691f3ac87ac978417dd29ce6f

Independent probe reproduced approval auto-reconcile replacing report/source tuples. Review now requires a separately displayed PR/CI observation; click synchronously captures tuple and generations. Drift rejects before append; unchanged tuple can record. Server fresh validation unchanged, executionAuthorized false, University remains pending.

Evidence: docs/MC_OWNER_REVIEW_INTENT_FIX_20261011.md. Portable877/build/validate/check, focused18/root20/browser8 PASS; forbiddenAttempts0. No SQL/grants/keys or actual Owner decisions; existing ledger unchanged. Prior prefix preserved there byte-for-byte; dated history unchanged. Harmless saved test never executed.

Next Action: runtime40fa1e7 exact Preview READY; terminal3/old28 unchanged. Independent review and Owner device acceptance pending. Genuine non-test saved task absent; real bound Agent run/Owner UI acceptance pending, GitHub permissions UNKNOWN. CONNECT403 not bypassed; servedCheckedSha null. No Production/other repo/AWS/model/dispatch. Do not recreate refused VM artifacts.

```
