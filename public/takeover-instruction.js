import {repositoryRunReporterSource,repositoryRunReporterSha256} from './repository-run-reporter-source.js';
export function repositoryRunSourcePacket(packet){const paths=packet.canonicalContextPaths||(packet.contextDocuments||[]).map(d=>d.path);if(!Array.isArray(paths)||!paths.length||paths.length>4||new Set(paths).size!==paths.length||paths.some(p=>typeof p!=='string'||!/^[-A-Za-z0-9_./]+$/.test(p)||p.includes('..')||p.startsWith('/')))throw Error('SOURCE_CONTEXT_SCOPE_INVALID');return{schemaVersion:1,projectId:packet.projectId,track:packet.track||'BASELINE',sourceStatus:'FOUND',executionAuthorized:false,canonicalContextPaths:[...paths],source:packet.source};}
export function formatTakeoverInstruction(packet){
 const reports=packet.repositoryReports;const s=packet.source,context=(packet.contextDocuments||[]).filter(d=>d.status==='FOUND').map(d=>d.path);
 return ['請接手專案 '+packet.projectId+'。先使用你自己的既有授權存取核對 branch 最新 HEAD，再閱讀目前階段文件與已確認背景文件，依既有授權續開發、測試並更新交接。',
  'Repository: '+s.repositoryId,'Branch: '+s.requestedRef,'本次已核對版本: '+s.resolvedCommitSha,'本次來源指紋: '+s.contentSha256,'本次讀取時間: '+s.readAt,'文件更新時間: '+(s.documentTimestamp||'未記錄'),'專案入口: '+s.path,
  '入口文件: https://github.com/'+s.repositoryId+'/blob/'+s.resolvedCommitSha+'/'+s.path,
  '已核對背景文件: '+(context.join(', ')||'未記錄'),
  packet.track==='UNIVERSITY_CANDIDATE'?'版本資格: 獨立 University 候選，JoeyAcceptancePending；不得當成 main 或已驗收成果。':packet.projectId==='MISSION_CONTROL'?'版本資格: MC 開發分支；讀取成功不代表產品驗收。':'版本資格: main 基準來源；讀取成功不代表產品驗收。',
  '目前工作: '+(packet.progress?.task||'未記錄'),'下一步: '+(packet.progress?.nextAction||'未記錄'),'最近開發者: '+(packet.progress?.lastAgent||'未記錄'),
  ...(reports?['本次重新核對的 Agent run 接手紀錄（Agent 自行回報；repo bytes 已核對，不代表合併／部署／Joey accepted）: '+JSON.stringify(reports),'先閱讀 run 的 workRef、最新 checkpoint／blocker、完成 result 的確切 handoff commit/path 與 nextSteps。未合併功能不能只回 canonical baseline。使用自己既有存取核對該 workRef／交接 SHA，再決定接續；本紀錄不指令 checkout、不自動升 candidate 資格。','多個 run 或仍有 active/blocked run 時，明確選擇要接續的 runId/task；不能默默替換他人的 active run。新 Agent 建立新 runId，明確設定 predecessorRunId；無法決定則先澄清。不把逾時推定為 stopped。']:[]),
  '缺失的 Agent／進度／文件時間不可推定。本指令不授予新存取、部署、SQL 或其他寫入權限；不啟動 Agent。',
  'MC 回報：只使用你對本專案 GitHub repo 的既有寫入授權，不需要 MC token。先讀入口、核對目前工作 branch 與使用者真正要求的功能。不要從複製指令推定已開工。',
  '先把下方通用 reporter 存成本機暫存 mc-reporter.mjs；在本專案 repo 中執行。先填 registration 的新 runId、taskId、featureTitle、你自己的 agentName；provider/model 可為 null，不做模型選擇。接替他人時填 predecessorRunId；另一個 active run 不可覆寫。',
  'report 分支必須已經是核准的固定 mc/progress，只含不觸發部署的 vercel.json 與 .mission-control/runs/<runId>.json。若尚未初始化、權限未授予或 CI 副作用未確認，停止並報告，不能自行擴權或把未發布當開工回報。',
  '把下面 source packet 存成私人的 source-packet.json，建立 registration.json 與 started-event.json。started 的 event id 要唯一，sequence=1，eventAt=實際當下 ISO 時間，summary=你實際開工的摘要，result=null。',
  'node /你的暫存路徑/mc-reporter.mjs start --packet source-packet.json --meta registration.json --event started-event.json --publish',
  '只有 PUBLISHED / ALREADY_PUBLISHED 的實際 Git receipt 才代表 start 已發布。開工前先發布 started；每個有意義的 progress/blocked checkpoint 明確發布新事件。不能以背景 timer 捏造 heartbeat。五分鐘無新事件，MC 顯示最後回報／更新逾時，而非推定已停或完成。',
  '後續 event sequence 遞增。保存前次 receipt 的 fileSha 與 sequence，使用：node /你的暫存路徑/mc-reporter.mjs append --packet source-packet.json --meta registration.json --run <runId> --event event.json --expected-file-sha <前次fileSha> --expected-sequence <前次sequence> --publish。衝突停止並重新核對，不能 force push。',
  'completed 事件前先完成並更新專案交接；result 必含 codeSha、tests[{name,outcome:PASS/FAIL/NOT_RUN}]、nextSteps、handoff{path,commitSha}。完成不代表 merged/deployed/Joey accepted。只回報有界 metadata，不放原始 source、prompt、secret 或憑證。頁面可見時 MC 約每30秒讀取，不是永久 collector。',
  'validate --report <run.json> 不帶 packet 只驗 schema，不能當 MC scope 驗收；使用 validate --report <run.json> --packet <原 source-packet.json> 從所選 source SHA 的 .mission-control/source-profile.json 核對 authoritative scope；MC 仍以固定 server policy 驗收。',
  'canonicalContextPaths 是固定合法交接路徑清單，不代表每份文件都已讀取成功；已讀背景文件只以上方 FOUND 清單為準。',
  'Source packet: '+JSON.stringify(repositoryRunSourcePacket(packet)),
  'Registration template: '+JSON.stringify({runId:'__NEW_RUN_ID__',predecessorRunId:reports?.runs?.length===1?reports.runs[0].runId:null,taskId:'__NEW_TASK_ID__',featureTitle:'__USER_REQUESTED_FEATURE__',agentName:'__ACTUAL_AGENT_NAME__',provider:null,model:null}),
  'Reporter SHA256: '+repositoryRunReporterSha256,
  '```javascript',repositoryRunReporterSource,'```'].join('\n');
}
