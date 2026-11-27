# SLIP_CN_UG — NEXT_ACTIONS

Project: SLIP_CN_UG
Status: Pending Development

## Recommended Next Step

一、週一(2026-11-30)請 tanchao 老師把 Drive「2027-1学期学生材料」資料夾共用給服務帳號 slip-drive@slip-516013.iam.gserviceaccount.com,之後在系統管理頁先試跑(dry-run)自動收件,再看正式每日 10 點執行。二、在 Vercel 確認 wsu-slip 的 Production 環境變數(SLIP_USERS、SLIP_SESSION_SECRET、AIRTABLE_TOKEN／AIRTABLE_READ_TOKEN 需含英/韓兩個 base、GOOGLE_SERVICE_ACCOUNT_JSON、SLIP_DRIVE_CN、CRON_SECRET;寄信用 SMTP_* 與 SLIP_NOTIFY_CN 尚未設)。三、交付招生部前把 joey、ipak-admin、ipak 改成強密碼,照 docs/handover/acceptance-checklist.md 驗收;ANTHROPIC_API_KEY 由學校提供後填入。四、Joey 與英文組、韓文組負責人談流程與申請資料,之後才調整兩組欄位、建 Intake／접수함 收件表與決定是否加寄信自動化(在那之前不要做)。五、admissions-pdf-system 的 S2-c 面試時間草稿 PR #31 待 owner 在受保護預覽實測後合併入試點分支。2026-12-01 第一次每週快照 cron 自動執行後,確認「每周快照」表新增 4 筆。MC 登記收據仍綁 admissions-pdf-system,改綁 JoeyAJ/SLIP 須走 MC 登記流程,由 owner 決定。

## Blockers

入學、簽證、在校管理、畢業、校友模組需先與各部門負責人談定資料來源與通知管道(Email／KakaoTalk)才能接上。英/韓組流程待談。真實學生資料的存放與存取須符合學校規定。研究生的 4 條 Airtable 自動化由 owner 自行啟用。PDF 識別 → Google Sheet 試驗(在 admissions-pdf-system)與 Airtable 入學模組的關係待 owner 決定。

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
