# SLIP_CN_UG — NEXT_ACTIONS

Project: SLIP_CN_UG
Status: Pending Development

## Recommended Next Step

三件事並行。一、owner 在 Airtable 本科表點一筆假資料的「生成录取通知书」連結,核對 PDF 內容與寫回「录取通知PDF」欄——這是招生模組唯一還沒端對端核對的環節。二、把入學階段已驗證的自動化整理成 SLIP 的第一組「規則」,並定下學生主檔欄位與階段清單(平台層 L0):每條規則寫明階段、觸發條件、通知對象角色、通知方式。三、備好給在學、畢業階段負責人的一頁問題清單(資料來源、能否匯出、通知對象、個資規定),約時間談。另:MC 登記收據仍綁 admissions-pdf-system,要改綁 JoeyAJ/SLIP 須走 MC 登記流程,前置是在 SLIP 的 main 補上 HANDOFF.md、PRD.md、docs/PRODUCT_CHARTER.md、docs/PHASE_PLAN.md、.mission-control/bootstrap.json,由 owner 決定是否進行。

## Blockers

在學、畢業階段需先與各負責人溝通才能設計。真實學生資料的存放與存取須符合學校規定。研究生的 4 條 Airtable 自動化由 owner 自行啟用。PDF 識別 → Google Sheet 試驗(在 admissions-pdf-system)與 Airtable 入學模組的關係待 owner 決定。

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
