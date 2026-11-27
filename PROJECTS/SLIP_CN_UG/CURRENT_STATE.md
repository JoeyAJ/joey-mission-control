# SLIP_CN_UG — CURRENT_STATE

Project: SLIP_CN_UG
Status: Pending Development

```yaml
version: 招生模組 v1（錄取通知書生成器＋看板已併入 JoeyAJ/SLIP）
current_agent: Claude Code
agent_model: claude-opus-5
as_of: 2026-11-27
public_url: https://woosong-letter.vercel.app
```

## Current Stage

SLIP 平台骨架在私有庫 JoeyAJ/SLIP。Vercel 專案 woosong-letter 已改由該庫 main 自動建置，公開站 https://woosong-letter.vercel.app 的首頁即模組清單加招生各階段人數。招生模組（平台的第一個模組）可用：原本獨立的錄取通知書生成器與即時看板整套併入 modules/admission/letter/，對外路徑一字未改，Airtable 的公式欄與四類 Email 自動化照舊運作。本科／研究生／SolBridge 三類別的階段人數由同一份 Airtable 欄位 ID 定義計算，首頁與完整看板不會出現兩套數字；看板讀取用唯讀令牌，寫回 PDF 與每週快照才用寫入令牌，密鑰只放 Vercel 環境變數。接下來要 build 的是在學（缺課預警）與畢業（學分不足分階段提醒）兩個階段模組，兩者的資料來源與通知對象須先與各階段負責人談定才動工；平台層的學生主檔、階段、規則與事件紀錄同一輪一起 build。錄取通知書的端對端產出已由 owner 於 2026-11-26 核對無誤(PDF 內容與寫回 Airtable 附件欄);每週快照 cron 的首次自動執行在 2026-12-01。另一條線(admissions-pdf-system 的 Google Sheet 名冊試點):S2-c 面試時間排程(AF 欄,可改期、寫成日期值、二次確認後只寫一格)已以草稿 PR #31 提出,合併目標為試點分支;學校版(交付招生部)已以草稿 PR JoeyAJ/SLIP#2 提出:又松大學校徽配色、韓文為主中文切換、全站登入與角色權限(admin／manager／staff,可限定類別與負責老師),舊訪問碼仍可登入;另附系統管理頁、韓中使用說明頁,以及 docs/handover 的管理員手冊、驗收清單與交付提案;JOEY 品牌版改為 /showcase.html 示範頁。合併入 main 與建立正式帳號(SLIP_USERS)待 owner 決定。

## Work log

- 2026-11-27T21:30:00+09:00 | Claude Code | in_progress | SLIP#2:英文組表 EN Team Applications、韓文組表 한국어팀 지원자(各自語言欄位),SLIP 彙整三組並可按組篩選;拿掉負責老師轉換率。英/韓兩表目前沒有任何 Airtable 自動化或寄信。待辦:Joey 和英文/韓文組負責人談流程與申請資料後,再調整兩表欄位、決定是否加寄信自動化(在那之前不要做)。
- 2026-11-27T20:55:00+09:00 | Claude Code | in_progress | SLIP#2 加「修改密碼」:SLIP_USERS 為初始密碼、首次登入強制改;新密碼雜湊存 Airtable「SLIP账号」tblATb2UWbPHk3YLw;系統管理頁可「초기화」重置。預覽已部署 0a8b57b,待 Joey 首次登入改密碼驗證寫入。
- 2026-11-27T18:10:00+09:00 | Claude Code | in_progress | SLIP 學校版草稿 PR JoeyAJ/SLIP#2:校徽品牌、韓中雙語、全站登入與角色權限、系統管理與使用說明頁、交付文件三份;JOEY 展示頁 /showcase.html。尚未合併 main。

- 2026-11-27T17:55:00+09:00 | Claude Code | in_progress | S2-c 面試時間排程草稿 PR #31(admissions-pdf-system,目標試點分支):可改期、寫成日期值、讀回核對;順修 S2-b 寫入後名冊未重新載入。38 項新測試通過。

- 2026-11-26T17:40:00+09:00 | Claude Code | completed | owner 核對通過:首頁看板各階段人數、錄取通知書 PDF 產出與寫回 Airtable 皆正常;招生模組驗證到此結束,僅餘 12/01 首次每週快照待自動執行。

- 2026-11-26T17:05:00+09:00 | Claude Code | completed | woosong-letter 整套併入 JoeyAJ/SLIP 招生模組；Vercel 改接 SLIP main，公開站改為 woosong-letter.vercel.app；看板無聲卡住與 cron 明碼金鑰已修。

- 2026-11-26T15:35:00+09:00 | Claude Code | completed | 新建私有庫 JoeyAJ/SLIP:模組規格、招生模組說明、Airtable 唯讀入口與首頁骨架已推送;MC 記錄同步,登記收據仍綁 admissions-pdf-system。

- 2026-11-26T12:00:00+09:00 | Claude Code | completed | 定位更新為學生全程預警平台;舊 Airtable SLIP 與舊庫淘汰;文件改寫 PR #30 待合併;MC 記錄的核心功能與下一步已同步。

- 2026-11-24T18:40:00+09:00 | Claude Code | in_progress | 受保護預覽併入全部更新（02fd463）：名冊首欄改顯示 Sheet 的 No.（PR #29），以及 S2-b 本人確認推進 R～U 寫入當日日期（PR #27）。152 項測試，回歸與基準完全相同。正式站維持 12a9707 未變；公開部署尚缺 Vercel Production 變數與 Google Console 重新導向／Picker 網域設定，待本人處理。真實寫入尚未執行，待本人在預覽實測。

- 2026-11-24T18:05:00+09:00 | Claude Code | in_progress | S2-a 名冊已在受保護預覽上線並由本人實測；回報的完成率與面試時間顯示錯誤（0.75／46351）已修正為依試算表顯示值（PR #28 已併，c2ba1b3，部署 READY）。S2-b 寫入 R～U 仍為草稿 PR #27，尚未合併；正式站維持 12a9707，未部署任何 pilot 功能。

- 2026-11-24T17:10:00+09:00 | Claude Code | in_progress | 草稿 PR #27：S2-b 本人確認推進工作流步驟，寫入當日日期（韓國時區）；沿用 PR #24 已驗證的列錨點機制並分開中繼資料命名空間，只允許當前待辦步驟、目標格須空白、非日期值拒絕。36 項新測試加真實 Chromium 驗證預覽零寫入、確認僅一次。AF 面試時間仍未實作。

- 2026-11-24T15:20:00+09:00 | Claude Code | in_progress | S2-a 名冊畫面完成（PR #26）：三語唯讀清單、待辦步驟篩選、順序異常標記；真實 Chromium 390／1440 驗證 13 筆、一次讀取、零寫入。R～U／AF 仍無自動寫入；需併入 Preview 分支才能實測，分支閘未放寬。

- 2026-11-24T12:40:00+09:00 | Claude Code | in_progress | 草稿 PR #26：S2-a 唯讀名冊與依表頭解析欄位（研究生院分頁欄序不同），修好微信漏抽（五案 0→3 完全正確、1 擷取、1 依信心門檻正確留空）；31 項新測試通過，回歸與基準完全相同。R～U／AF 仍無任何寫入，實際寫入待本人確認。

- 2026-11-24T10:05:00+09:00 | Claude Code | in_progress | 接手 SLIP：已讀 HANDOFF／PRD／charter／phase plan 與 PR #24，確認 O／Q 修正候選仍待本人實機確認，未動任何程式或試算表。

- 2026-11-23T14:35:15+09:00 | ChatGPT | in_progress | 受保護預覽已上線 O／Q 逐欄比較及本人確認；五份 OCR、75 項測試及匿名防護已核對，未執行任何實際試算表操作。

- 2026-11-23T13:28:07+09:00 | ChatGPT | in_progress | 受保護預覽 READY：掃描 F 的畢業學校、地址已在新版核對；新增只重新解析、不寫入，60 項通過。登入後複驗與寫入回讀／防重複仍待確認。

- 2026-11-23T12:41:56+09:00 | ChatGPT | in_progress | V2 隔離預覽 READY：五份佇列、獨立結果／重試、15 項欄位及 W–AE 收件標記已核對；交接已更新，實際寫入與防重複仍待驗證。

- 2026-11-23T11:44:30+09:00 | ChatGPT | in_progress | PR #25 正式站登入入口及交接文件已上線；隔離預覽已核對 Google 登入及測試表選取，五份原版型合成 PDF 已交付，實際寫入和防重複待驗證。

- 2026-11-23T10:45:44+09:00 | ChatGPT | blocked | PR #24 預覽入口 404 已修正；指定測試者已完成 Google 登入及同意，但回呼未通過，未進入上傳頁或寫入。合成掃描樣本 C 已通過本機核對。

- 2026-11-20T18:11:20+09:00 | ChatGPT | completed | 公開假資料示範 https://admissions-pdf-system.vercel.app/demo 更新 10 筆合成案件及補件佇列；桌機、手機三語驗證通過（PR #23），正式登入仍關閉。

- 2026-11-20T17:40:13+09:00 | ChatGPT | completed | 公開假資料示範 https://admissions-pdf-system.vercel.app/demo 已通過桌機與手機三語操作核對（PR #22）；正式登入維持關閉。

- 2026-11-05T18:45:00+09:00 | 이 박사 | completed | MC registration documentation and catalog prepared; S1 PR #18 remains unmerged.

## Registration source

Repository: JoeyAJ/admissions-pdf-system
Branch: main
Verified document baseline: aa6167fc62c4c75e0c0869f32e46d14241fe7507
Entry: HANDOFF.md
Entry SHA256: 4ae97883ef73f841aa315910bed18bdb806d54f61b3c1eb80e89ec7730aa965f
Approval: owner-chat-20261105

The baseline is a historical documentation receipt; registration does not authorize development or activate source-read/report-write scopes. S1 lives on open PR #18 and is not merged.
