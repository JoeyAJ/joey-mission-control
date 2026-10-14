// Demo flight board for layout review only (#joey?demo=1). Never mixed with real data.
const ago=(now,min)=>new Date(now-min*60000).toISOString();
const run=(now,{agent,feature,state,min,summary,result=null})=>({runId:'demo-'+agent+'-'+min,agentName:agent,featureTitle:feature,currentState:state,reportedState:state==='unconfirmed'?'running':state,eventAt:ago(now,min),summary,result});
const summary=tasks=>({tasks,active:tasks.filter(t=>['running','blocked'].includes(t.currentState)),blockers:tasks.filter(t=>t.currentState==='blocked')});
export function demoTower(now=Date.now()){
 const projects=[
  {id:'DEMO_A',name:'NexAeon 官網',status:'Active',version:'0.6',siteUrl:'https://example.com/'},
  {id:'DEMO_B',name:'Woosong Buddy',status:'Active',version:'1.2'},
  {id:'DEMO_C',name:'Namyoung Web3D',status:'Paused',version:'0.4'},
  {id:'DEMO_D',name:'AI 招生助理',status:'Idea'},
  {id:'DEMO_E',name:'Joey Asset System',status:'Active',version:'0.15'},
  {id:'DEMO_F',name:'Mission Control',status:'Active',version:'0.3'},
  {id:'DEMO_G',name:'韓語學習卡',status:'Active',version:'0.2'},
  {id:'DEMO_H',name:'招生數據週報',status:'Active',version:'1.1',siteUrl:'https://example.com/'}
 ];
 const runsByProject={
  DEMO_A:summary([run(now,{agent:'Codex',feature:'多語知識入口 v0.6',state:'running',min:2,summary:'正在重做首頁的三語切換與導覽列'}),run(now,{agent:'Claude Code',feature:'AI 助手接入',state:'completed',min:60*30})]),
  DEMO_B:summary([run(now,{agent:'Claude Code',feature:'PWA 圖示與語系檢查',state:'running',min:1,summary:'補齊韓文與英文翻譯，執行測試中'}),run(now,{agent:'Codex',feature:'裝備借用流程',state:'completed',min:60*50})]),
  DEMO_C:summary([run(now,{agent:'Hermes',feature:'產品資產 schema v0.4',state:'completed',min:60*24*6,summary:'完成 schema 與範例資料，等待下一階段安排'})]),
  DEMO_E:summary([run(now,{agent:'Codex',feature:'Phase 2 資產分類',state:'blocked',min:25,summary:'需要你提供 Supabase 專案的讀取權限才能繼續'})]),
  DEMO_F:summary([run(now,{agent:'Claude Code',feature:'塔台主畫面',state:'unconfirmed',min:180,summary:'完成卡片版面，正在調整光流效果'})]),
  DEMO_H:summary([run(now,{agent:'Hermes',feature:'v1.1 · 週報自動寄送',state:'completed',min:40,summary:'每週一早上自動整理動態表並寄出週報',result:{tests:[{name:'週報數字核對',outcome:'PASS'},{name:'寄信測試',outcome:'PASS'},{name:'韓文版排版',outcome:'NOT_RUN'}],nextSteps:'請 Joey 確認收件人名單後再正式開啟每週寄送。'}})]),
  DEMO_G:summary([run(now,{agent:'Codex',feature:'卡片翻面動畫',state:'completed',min:60*5})])
 };
 return {projects,runsByProject};
}
// Pending handoff for the demo "awaiting" card; stored the same way a real copy would be.
export const demoHandoffs=now=>({DEMO_G:{agent:'hermes',goal:'加入 Apple Watch 版面',at:new Date(now-12*60000).toISOString()}});
