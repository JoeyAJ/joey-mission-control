# SLIP_CN_UG — PROJECT_MEMORY

Project: SLIP_CN_UG
Status: Pending Development

SLIP 定位更新(2026-11-26,owner 決定):學生從申請入學到畢業的全程預警平台。學生出現異常時,自動提醒該階段的負責人。SLIP 框架與模組的程式庫為新建私有庫 JoeyAJ/SLIP(2026-11-26 owner 決定,已含模組規格、招生模組說明與 Airtable 讀取入口);JoeyAJ/admissions-pdf-system(numeric ID 1243627223)為 MC 登記時的原始庫,保留為 PDF 識別輸入側元件;舊過渡庫 slip-cn-ug-admissions 與舊 Airtable base SLIP-CN-UG-Product、SLIP-CN本科-催補任務板-試跑已淘汰並刪除。專案代號 SLIP_CN_UG 沿用。

核心功能(要做的框架):
1. 學生主檔:一位學生一個編號,貫穿全程(沿用招生編號 No.)。
2. 階段:申請 → 入學 → 在學 → 畢業,各有資料來源與負責人。
3. 規則:條件 + 通知對象 + 升級方式,一條規則屬於一個階段、一個負責角色。
4. 事件紀錄:誰在何時收到什麼提醒、是否處理。

最終要達成:入學出問題通知入學承辦;入學後經常缺課警報給學生管理負責人;畢業條件不足分階段提醒直到畢業。

各階段現況:入學階段已有且驗證通過的 Airtable base「测试自动化流程v1.0.0」(申請追蹤、缺件提醒、四類 Email 通知、每週一待辦提醒、錄取通知書 PDF、即時看板、每週快照),SLIP 入學模組以它為準。在學、畢業階段的資料來源與自動化設計,必須先與各階段負責人溝通確認,才併入 SLIP。

另有進行中的 PDF 識別 → 私人 Google Sheet 試驗(合成資料),屬入學階段的輸入側;它與 Airtable 的關係待 owner 決定。

Production URL: https://admissions-pdf-system.vercel.app

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
