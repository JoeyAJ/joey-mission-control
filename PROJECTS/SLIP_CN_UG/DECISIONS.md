# SLIP_CN_UG — DECISIONS

Project: SLIP_CN_UG
Status: Pending Development

- 2026-11-05 — Register SLIP_CN_UG under owner-chat-20261105 through a separate docs-only baseline and mc/registry catalog.
- Preserve PR #18 as open; registration is not feature delivery or owner acceptance.
- Use fake data and Airtable SoR; no real SIS or production Excel. Resource provisioning is not part of registration.

- 2026-11-26 — SLIP 重新定位為學生全程預警平台(申請→入學→在學→畢業);框架先行,各階段自動化需先與負責人溝通後再併入。
- 2026-11-26 — 入學階段模組以已驗證的 Airtable「测试自动化流程v1.0.0」為準;舊 Airtable SLIP base 與舊庫 slip-cn-ug-admissions 淘汰刪除;admissions-pdf-system 為唯一程式庫。舊「假資料、Airtable SLIP-CN-UG-Product 為 SoR」的決定作廢。
- 2026-11-26 — owner 決定新建私有庫 JoeyAJ/SLIP(Student Lifecycle Intelligence Platform)作為 SLIP 框架與模組的程式庫,招生模組以 Airtable「测试自动化流程v1.0.0」為資料層;取代同日稍早「admissions-pdf-system 為唯一程式庫」的決定。admissions-pdf-system 保留為 PDF 識別輸入側元件,其併入或封存由 owner 另行決定。MC 登記收據仍綁定 admissions-pdf-system,改綁新庫需走 MC 登記流程。
- 2026-11-26 — 文件改寫以 admissions-pdf-system PR #30 提出,待 owner 合併;PR #18 與既有分支不動。

- 2026-11-26 — woosong-letter 的錄取通知書生成器與即時看板整套併入 JoeyAJ/SLIP 的 modules/admission/letter/;對外路徑一字不改(Airtable 公式欄與自動化 ⑧ 直接寫著這些網址),Vercel 專案 woosong-letter 改由 JoeyAJ/SLIP@main 建置,公開站網址沿用 https://woosong-letter.vercel.app。SLIP 首頁同時成為招生各階段人數的看板。
- 2026-11-26 — 階段人數的計算只保留一份(modules/admission/letter/lib.js 的 CATS,以 Airtable 欄位 ID 判斷),首頁與完整看板共用,避免兩套數字。讀寫令牌分權:看板用 AIRTABLE_READ_TOKEN,寫入才用 AIRTABLE_TOKEN。
- 2026-11-26 — 每週快照 cron 的驗證改為 Authorization: Bearer CRON_SECRET,移除原本明碼寫在 vercel.json 的 ?k=。僅從檔案刪除不算撤銷(值仍在 git 歷史且端點仍接受),故整條 ?k= 路徑一併移除;代價是不能再用網址手動補跑快照。
- 2026-11-26 — MC 登記收據仍綁定 admissions-pdf-system;公開網址與目錄內容已更新為 SLIP 平台,但改綁 JoeyAJ/SLIP 須走 MC 登記流程(前置:SLIP 的 main 需有 HANDOFF.md、PRD.md、docs/PRODUCT_CHARTER.md、docs/PHASE_PLAN.md、.mission-control/bootstrap.json),由 owner 決定是否進行。

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
