# SLIP_CN_UG — ARCHITECTURE

Project: SLIP_CN_UG
Status: Pending Development

框架與模組放在私有庫 JoeyAJ/SLIP:Vercel 靜態首頁 + Serverless 函式讀 Airtable,金鑰只放環境變數,對外 API 只回傳人數,不輸出學生個資。Vercel 專案 woosong-letter 從 SLIP 的 main 自動建置,公開站 https://woosong-letter.vercel.app。

分層:
- 框架層(L0,待建):學生主檔、階段、規則(含負責人路由)、事件紀錄。
- 入學/招生模組(L1,已上線):資料層為 Airtable「测试自动化流程v1.0.0」。
  `index.html` 首頁看板(各階段人數,無需訪問碼)、`api/admission/summary.js`(人數 API)、
  `api/dash.js`(完整看板,訪問碼由 LETTER_SECRET 推導)、`api/letter.js` + `api/pdf.js`(錄取通知書 PDF)、
  `api/snapshot.js`(每週一快照 cron,驗證 Authorization: Bearer CRON_SECRET)、
  `modules/admission/letter/`(gen.js 畫 PDF、lib.js 欄位對照與讀寫、assets 韓文字型與校徽校印)。
  階段人數的判斷只有一份:lib.js 的 `CATS`,以 Airtable 欄位 ID 判斷,欄位改名不會壞。
- 在學(L2)、畢業(L3):待與負責人溝通後設計。

令牌分權:讀取(看板、人數 API、快照讀取)用 AIRTABLE_READ_TOKEN;寫入(PDF 寫回 Airtable、寫快照)用 AIRTABLE_TOKEN;/api/letter 的 ?k= 與 /api/dash 訪問碼由 LETTER_SECRET 推導;每週快照 cron 用 CRON_SECRET。LETTER_SECRET 不可輪替——Airtable 公式欄把它明碼寫在連結裡,換了整欄連結會失效。

admissions-pdf-system 為既有 Next.js / TypeScript / Tailwind 應用,保留為 PDF 識別輸入側元件(公開合成資料 /demo、PDF 識別 → 私人 Google Sheet 的受保護預覽);其併入或封存由 owner 另行決定。舊 Airtable SoR(SLIP-CN-UG-Product)與舊庫 slip-cn-ug-admissions 已淘汰刪除。

邊界:不寫入學校正式 SIS;在學/畢業階段涉及教務個資,資料來源須取得學校單位同意;憑證不進 git。

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
