# SLIP_CN_UG — NEXT_ACTIONS

Project: SLIP_CN_UG
Status: Pending Development

## Recommended Next Step

兩件事並行。一、把入學階段已驗證的自動化整理成 SLIP 的第一組「規則」,並定下學生主檔欄位與階段清單(平台層 L0):每條規則寫明階段、觸發條件、通知對象角色、通知方式。二、備好給在學、畢業階段負責人的一頁問題清單(資料來源、能否匯出、通知對象、個資規定),約時間談。招生模組已由 owner 於 2026-11-26 核對:首頁看板數字、錄取通知書 PDF 產出與寫回 Airtable 皆正常;僅餘 2026-12-01 第一次每週快照 cron 待自動執行後確認「每周快照」表新增 4 筆。Google Sheet 名冊試點:S2-c 面試時間草稿 PR #31 待 owner 在受保護預覽實測後合併入試點分支;六項暫定設計(可改期、日期＋選填時間、寫成日期值、無前置條件、前後一年、只開本科分頁)待 owner 確認。另:MC 登記收據仍綁 admissions-pdf-system,要改綁 JoeyAJ/SLIP 須走 MC 登記流程,前置是在 SLIP 的 main 補上 HANDOFF.md、PRD.md、docs/PRODUCT_CHARTER.md、docs/PHASE_PLAN.md、.mission-control/bootstrap.json,由 owner 決定是否進行。

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
