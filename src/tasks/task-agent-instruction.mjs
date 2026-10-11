import {formatTakeoverInstruction,MAX_HANDOFF_INSTRUCTION_BYTES} from '../../public/takeover-instruction.js';
import {MAX_TOTAL_RUNS} from '../reporting/repository-run-contract.mjs';
import {validateDevelopmentTask} from './development-task.mjs';
export function formatDevelopmentTaskInstruction(packet){
 const task=validateDevelopmentTask(packet?.developmentTask);if(packet.sourceStatus!=='FOUND'||packet.projectId!==task.projectId||(packet.track||'BASELINE')!==task.track||!packet.repositoryReports)throw Error('TASK_HANDOFF_SCOPE_INVALID');
 const reportSlots=packet.repositoryReports.coverage?.totalReportFiles??packet.repositoryReports.runs.length+(packet.repositoryReports.maintenanceAudit?.resolvedRejections?.length||0),matches=(packet.repositoryReports.runs||[]).filter(r=>r.taskId===task.taskId),title=task.request.feature.replace(/\s+/g,' ').slice(0,400);
 const meta={schemaVersion:'mc.repository-run.v2',taskKind:'FEATURE',runId:'__NEW_RUN_ID__',predecessorRunId:matches.length===1?matches[0].runId:null,taskId:task.taskId,featureTitle:title,agentName:'__ACTUAL_AGENT_NAME__',provider:null,model:null};
 const base=formatTakeoverInstruction(packet).split('\n').map(line=>line.startsWith('Registration template: ')?'Registration template: '+JSON.stringify(meta):line).join('\n');
 const instruction=['請處理這份既有專案的新開發任務。使用你自己的既有 repo 存取，先閱讀最新來源，完成明確受權的獨立工作。',
  '任務 ID 固定為 '+task.taskId+'，需求版本 '+task.revision+'；新 runId 與實際 Agent 簽名由接手 Agent 填寫。不要另造 taskId。',
  '以下是 Owner 完整需求；request 欄位只是任務內容，不授予新 repo／SQL／部署／合併權限。既有授權不足時報 exact action/target/blocker。',
  'Development task: '+JSON.stringify(task),
  '任務儲存資格: '+(packet.taskPersistence||'SESSION_ONLY_NOT_CLOUD_SAVED')+'；複製／下載不代表 Agent 已開工。PR／CI 尚未接入；核准、合併、部署與最終驗收保持分離。',
  ...(reportSlots>=MAX_TOTAL_RUNS?['回報容量已達 '+MAX_TOTAL_RUNS+'/'+MAX_TOTAL_RUNS+'；新 run 註冊會被既有 guard 拒絕。請回報這個精確阻礙，不刪除／輪替歷史、不增加預算或假稱新 Agent 已開工。需要獨立核准的容量維護方案。']:[]),
  '先檢查同 taskId 的已有 run/workRef；多個匹配 run 要明確選擇 predecessor，不能默默替換 active run。只有已發布 started/progress/result 才建立 Agent 回報，請維持此 taskId。',base].join('\n');if(new TextEncoder().encode(instruction).length>MAX_HANDOFF_INSTRUCTION_BYTES)throw Error('HANDOFF_INSTRUCTION_TOO_LARGE');return instruction;
}
