import {formatTakeoverInstruction,MAX_HANDOFF_INSTRUCTION_BYTES,repositoryRunSourcePacket} from '../../public/takeover-instruction.js';
import {validateTaskRequirements,taskRequirementsStatus} from './task-requirements.mjs';
import {MAX_TOTAL_RUNS} from '../reporting/repository-run-contract.mjs';
import {validateDevelopmentTask} from './development-task.mjs';
export function formatDevelopmentTaskInstruction(packet){
 const task=validateDevelopmentTask(packet?.developmentTask),taskRequirements=validateTaskRequirements(packet?.taskRequirements);if(taskRequirements.revision!==task.revision)throw Error('TASK_REQUIREMENTS_INVALID');if(packet.sourceStatus!=='FOUND'||packet.projectId!==task.projectId||(packet.track||'BASELINE')!==task.track||!packet.repositoryReports)throw Error('TASK_HANDOFF_SCOPE_INVALID');
 const reportSlots=packet.repositoryReports.coverage?.totalReportFiles??packet.repositoryReports.runs.length+(packet.repositoryReports.maintenanceAudit?.resolvedRejections?.length||0),matches=(packet.repositoryReports.runs||[]).filter(r=>r.taskId===task.taskId),title=task.request.feature.replace(/\s+/g,' ').slice(0,400);
 const meta={schemaVersion:'mc.repository-run.v2',taskKind:'FEATURE',runId:'__NEW_RUN_ID__',predecessorRunId:matches.length===1?matches[0].runId:null,taskId:task.taskId,taskRequirements,featureTitle:title,agentName:'__ACTUAL_AGENT_NAME__',provider:null,model:null};
 const base=formatTakeoverInstruction(packet).split('\n').map(line=>line.startsWith('Registration template: ')?'Registration template: '+JSON.stringify(meta):line.startsWith('Source packet: ')?'Source packet: '+JSON.stringify({...repositoryRunSourcePacket(packet),developmentTask:task,taskRequirements}):line).join('\n');
 const instruction=['請處理這份既有專案的新開發任務。使用你自己的既有 repo 存取，先閱讀最新來源，完成明確受權的獨立工作。',
  '任務 ID 固定為 '+task.taskId+'，需求版本 '+task.revision+'；新 runId 與實際 Agent 簽名由接手 Agent 填寫。不要另造 taskId。',
  '需求綁定（不可變 header）: '+JSON.stringify(taskRequirements)+'；新 report 必須保留此 revision 與 digest。修改需求後另建新 run／選擇 predecessor，不改寫舊 report；舊未綁定回報只屬歷史，不代表目前需求完成。',
  '同一 taskId 既有回報：'+(matches.length?matches.map(r=>r.runId+' · '+taskRequirementsStatus(r.taskRequirements,taskRequirements)).join('；'):'尚無')+'；MISMATCH／LEGACY_UNBOUND 只屬歷史，不可視為目前需求完成。',
  '以下是 Owner 完整需求；request 欄位只是任務內容，不授予新 repo／SQL／部署／合併權限。既有授權不足時報 exact action/target/blocker。',
  'Development task: '+JSON.stringify(task),
  '任務儲存資格: '+(packet.taskPersistence||'SESSION_ONLY_NOT_CLOUD_SAVED')+'；複製／下載不代表 Agent 已開工。有相符 completed run 才能在 MC 獨立核對 PR／CI；尚未讀取的 runtime 權限保持未確認。核准、合併、部署與最終驗收保持分離。',
  ...(reportSlots>=MAX_TOTAL_RUNS?['回報容量已達 '+MAX_TOTAL_RUNS+'/'+MAX_TOTAL_RUNS+'；新 run 註冊會被既有 guard 拒絕。請回報這個精確阻礙，不刪除／輪替歷史、不增加預算或假稱新 Agent 已開工。需要獨立核准的容量維護方案。']:[]),
  '先檢查同 taskId 的已有 run/workRef；多個匹配 run 要明確選擇 predecessor，不能默默替換 active run。只有已發布 started/progress/result 才建立 Agent 回報，請維持此 taskId。',base].join('\n');if(new TextEncoder().encode(instruction).length>MAX_HANDOFF_INSTRUCTION_BYTES)throw Error('HANDOFF_INSTRUCTION_TOO_LARGE');return instruction;
}
