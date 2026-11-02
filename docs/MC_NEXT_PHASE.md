# MC 下一階段開發事項

記錄日期：2026-11-02。這是 Joey 希望在既有 MC 上升級的待辦，這次僅整理，沒有啟動 runner 或自動化升級。已開發部分見 [功能盤點](MC_FEATURE_INVENTORY.md)。

目標流程：需求 → 真正啟動 Agent → 規劃 → 獨立分支實作 → 測試 → 獨立 reviewer → 有界修正 → PR／預覽／證據回填 → Joey 驗收。

MC 持續負責控制、專案記憶、授權及證據；Agent 應可替換。現有報告、task fingerprint、精確 SHA、Owner review 可重用，但不代表執行器已接通。自動合併與部署另需明確授權，不能由「任務完成」或「測試通過」推導。

| 順序 | 待開發事項 | 可驗收的完成條件 |
| --- | --- | --- |
| 1 | 選一個低風險小任務，人工確認現有 Agent 可用登入／API 與授權，再跑通一次 | 真實 receiving Agent 啟動；綁 task ID／revision／requirements hash；隔離分支、測試與 reviewer 證據；PR、預覽、exact SHA 可回讀；Joey 自行驗收。 |
| 2 | 薄型 runner adapter，沿用 MC 任務與回報 contract | 明確 provider capability／認證前提、啟動與執行結果；未接通顯示原因，不能把複製 prompt 當啟動；替換 Agent 不遺失記憶。 |
| 3 | 認領、去重、單 writer 與並發保護 | 原子 lease／claim、冪等 run／operation ID；同 task 不會重複改碼；競爭、租約到期及失聯可恢復。 |
| 4 | checkpoint、取消／恢復／重試 | 任務階段可追溯；先查不確定結果再重試；取消後無新寫入；部分失敗保留證據和人工接手出口。 |
| 5 | 獨立 reviewer 與有界修正 loop | reviewer 與實作者隔離，檢查同一 exact SHA；有最大回合／時間／費用；超限轉 Joey；不自評 APPROVE。 |
| 6 | 費用與操作限制 | 每任務預算／超時／可用工具及檔案範圍；敏感操作逐項授權；支出可追溯並可中止。 |
| 7 | 事件觸發、多任務協調（小任務成功後再評估） | 明確事件來源、去重及風暴限制；多任務互斥／隔離；不擴大 repo、部署或私人資料範圍。 |
| 8 | 生產 merge／deploy adapter（獨立階段） | 接好 action-time grant、provider capability、durable checkpoint、exact deployed SHA／URL／實際行為回讀及 rollback；仍保留 Joey 驗收。 |

## 現有訂閱與待確認前提

依本次交接的 Joey 資訊：OpenAI USD 100、Claude USD 22、Grok Bot USD 22，其餘免費。這些是使用者提供的訂閱背景，未核對帳單；訂閱不等於已具備 API 額度、可用 API 認證或可自動呼叫權限。先確認現有可用方式，這次不加購、不建立 credentials、不啟用付費模型或新服務。

## 影片與 pstack 參考界線

Joey 的影片參考：Gary Chen，[pstack 深度拆解！怎麼讓 AI 全自動完成你的工作？](https://www.youtube.com/watch?v=l_xDqUm0MDQ)，2026-10-31，26:39。前序調查只核對介紹與章節，播放器／字幕不可用；本次重讀網頁也沒有取得可用逐字稿。沒有看完整片的證據，不使用虛構的「三道關卡」或「六步清單」。

另行參考官方 [cursor/plugins pstack](https://github.com/cursor/plugins/tree/main/pstack)。前序調查辨識的 Skills／playbooks、獨立驗證、loop 與協調方向可作設計參考；本次 web 讀取受限，未把其現版細節當作已驗證實作要求。不能把外部 playbook 貼進 MC 就宣稱自動執行已成立。

待驗證：可用 Agent／模型執行介面、訂閱與 API 的關係、認證與費用、隔離環境及 reviewer 獨立性、可取消操作、輸出 evidence schema、事件來源及部署授權。以上先產出可審查的 adapter 設計和一個小任務驗收，再決定下一輪工程。
