# SLIP_CN_UG — CURRENT_STATE

Project: SLIP_CN_UG
Status: Pending Development

```yaml
version: SLIP 學校版 v1.3（PR #6 淺色液態玻璃、hover 光暈、頁面縮放，已併入 JoeyAJ/SLIP main）
current_agent: Claude Code
agent_model: claude-opus-5-5
as_of: 2026-11-27
public_url: https://wsu-slip.vercel.app
```

## Current Stage

SLIP 學校版已併入私有庫 JoeyAJ/SLIP 的 main，正式網址 https://wsu-slip.vercel.app（Vercel 專案由 woosong-letter 改名）。定位是交付又松大學招生部使用的學生全周期平台：又松大學校徽配色、韓文為主中文切換、全站登入與角色權限（招生部只用 admin／manager 帳號 joey、ipak-admin、ipak），帳號在 SLIP_USERS，首次登入強制改密碼，新密碼雜湊存 Airtable「SLIP账号」表，系統管理頁可重置。上方模組列 申請→入學→簽證→在校管理→畢業→校友，模組定義集中在 brand/app.js MODULES；目前只有申請模組上線，其餘為佔位頁（列計劃功能與通知管道，未接），接下來依各部門談定的內容逐一 build。中文／英文／韓文三組資料互不可見：中文組用原 base appOjpvsgbLz3cg3Y，英文組 base appVFO2KxK1w4SWx3，韓文組 base appRCfzQNel7J0I3l；英／韓兩組目前沒有任何 Airtable 自動化或寄信。負責老師轉換率已移除。自動收件（PR #3）：每天 10:00（韓國時間）掃 Google Drive 學期資料夾（中文組 2027-1），新學生資料進「申请收件箱」待審核頁，人工確認後才登記入主表；ANTHROPIC_API_KEY 刻意留空，待學校交付時提供，在那之前收件記為「待提取」需人工填。交付文件在 docs/handover：交付提案、驗收清單、管理員手冊。JOEY 品牌版為 /showcase.html 展示頁。PR #4（3b23263）加入英文介面、英文全稱 Student Lifecycle Intelligence Platform、深色模式與液態玻璃外觀，頁腳改為官網品牌標記（PR #5，96ed23c：Infinity Eye ＋ Joey ／ Personal AI Lab，所有語言套用）；PR #6（996ddba）加強淺色版液態玻璃、加入滑鼠跟隨光暈 hover 效果與 A−／A／A+ 頁面縮放（90–140%，記住設定）；官網專案頁的 SLIP 介紹與截圖也同步換成學校版。另一條線 admissions-pdf-system 的 S2-c 面試時間排程仍是草稿 PR #31，未合併。

## Work log

- 2026-11-27T23:38:00+09:00 | Claude Code | completed | SLIP#6 併入 main(996ddba)並部署 production:淺色版液態玻璃加強、滑鼠跟隨光暈 hover、A−/A/A+ 頁面縮放(90–140%,記住設定)。
- 2026-11-27T23:35:00+09:00 | Claude Code | completed | SLIP#5 併入 main(96ed23c)並部署 production:頁腳改用官網品牌標記 Infinity Eye ＋ Joey ／ Personal AI Lab,所有語言套用。
- 2026-11-27T23:10:00+09:00 | Claude Code | completed | SLIP#4 併入 main(3b23263)並上線 wsu-slip.vercel.app:英文介面、全稱 Student Lifecycle Intelligence Platform、深色模式、液態玻璃、頁腳 Joey · Personal AI Lab。
- 2026-11-27T22:45:00+09:00 | Claude Code | completed | MC 同步:SLIP 學校版 PR #2 與自動收件 PR #3 已併入 main,正式網址 wsu-slip.vercel.app;登入頁與帳號設定已確認正常;待辦見下一步。
- 2026-11-27T22:00:00+09:00 | Claude Code | completed | SLIP#3 自動收件併入 main:每天 10 點掃 Drive 2027-1 資料夾→待審核頁→人工確認登記;ANTHROPIC_API_KEY 留空待學校提供。
- 2026-11-27T21:50:00+09:00 | Claude Code | completed | SLIP#2 模組框架:申請→入學→簽證→在校管理→畢業→校友,首頁為模組總覽,未上線模組為佔位頁;學校版 PR #2 併入 main。
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
