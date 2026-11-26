# SLIP_CN_UG — ARCHITECTURE

Project: SLIP_CN_UG
Status: Pending Development

框架與模組放在新庫 JoeyAJ/SLIP(Vercel 靜態首頁+Serverless 讀取 Airtable,金鑰只放環境變數,API 只回傳人數);admissions-pdf-system 為既有 Next.js / TypeScript / Tailwind CSS 應用,保留 PDF 識別輸入側。目標架構分層:
- 框架層(L0,待建):學生主檔、階段、規則(含負責人路由)、事件紀錄。
- 階段模組:入學(L1)= 已驗證 Airtable「测试自动化流程v1.0.0」(含 Vercel 錄取通知書產生器與看板);在學(L2)、畢業(L3)待與負責人溝通後設計。
- 目前程式庫內:公開合成資料 /demo;PDF 識別 → 私人 Google Sheet 的受保護預覽(S2-a 名冊、S2-b 本人確認寫入,尚待真實寫入複驗)。PR #18(S1 五步驟工作臺)未合併,處置由 owner 決定。
- 舊 Airtable SoR(SLIP-CN-UG-Product)已刪除,不再是資料來源。
邊界:不寫入學校正式 SIS;在學/畢業階段涉及教務個資,資料來源須取得學校單位同意;憑證不進 git。

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
