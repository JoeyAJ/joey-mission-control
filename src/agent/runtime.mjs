import {missingOrUnverified,noAction,verifiedDecisionItems} from '../../public/control-semantics.js';
export const approvalStatuses=['NO_APPROVAL_REQUIRED','AWAITING_JOEY_APPROVAL','APPROVED','REJECTED','BLOCKED'];
export const runtimeStatuses=['Active','Not recorded','Awaiting sync','Awaiting Joey approval','Blocked','Completed'];
const known=v=>!missingOrUnverified(v);
// One runtime projection; the ledger is explicitly a local observation, never a second registry.
export function runtimeState(p,{handoff=null,history=[],handoffs=[],generatedAt=null,publicRead=false}={}){
 const fields={};
 function read(key,claim,fallback){
  const value=known(claim?.value)?claim.value:known(fallback?.value)?fallback.value:null;
  const source=known(claim?.value)?claim.source:fallback?.source||claim?.source||null;
  const unavailable=!source||claim?.missingReason==='source_unavailable';
  fields[key]={status:value!==null?'Active':unavailable?'Awaiting sync':'Not recorded',reason:value!==null?null:unavailable?'Source unavailable or not synchronized':'Field absent or unverified in the recorded source',source};
  return value;
 }
 const ref=handoff&&!handoff.conflict?handoff:null;
 const completion=[...handoffs,ref].filter(h=>h&&!h.conflict&&h.entityId===p.id&&/^(SUCCESS|COMPLETED|DONE)$/i.test(h.status||'')&&h.timestamp).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).at(-1)||null;
 const r={schemaVersion:'0.3',projectId:p.id,currentMission:read('currentMission',p.currentTask),missionStatus:'Not recorded',currentAgent:null,lastAgent:read('lastAgent',p.lastAI),currentModel:null,lastModel:read('lastModel',p.model),lastCompletedAction:read('lastCompletedAction',p.lastCompleted),lastCompletedAt:ref&&/^(SUCCESS|COMPLETED|DONE)$/i.test(ref.status)?ref.timestamp:null,nextAction:read('nextAction',p.nextAction,ref?{value:ref.nextAction,source:ref.source}:null),blocker:read('blocker',p.blocker),approvalRequired:false,approvalStatus:'NO_APPROVAL_REQUIRED',approvalItems:verifiedDecisionItems(p).map(v=>({what:v.what,why:v.why,source:v.source})),restrictions:p.approvalGates||[],handoffRef:ref?.sourcePath||null,sourceRepo:read('sourceRepo',p.where.repository),sourceBranch:read('sourceBranch',p.where.branch),baselineSha:read('baselineSha',p.where.storedCommit),productionUrl:read('productionUrl',p.where.production,p.projectUrls?.entries?.find(v=>v.type==='canonical_production')?{value:p.projectUrls.entries.find(v=>v.type==='canonical_production').url,source:p.projectUrls.source}:null),localWorkspace:publicRead?null:read('localWorkspace',p.where.localPath),lastSyncedAt:generatedAt||null,stateSource:publicRead?'verified_release_snapshot':'canonical_projection',fields};
 if(/^[\w.-]+\/[\w.-]+$/.test(r.sourceRepo||''))r.sourceRepo='https://github.com/'+r.sourceRepo;
 if(r.blocker&&noAction(r.blocker))r.blocker=null;
 r.approvalRequired=r.approvalItems.length>0;
 r.approvalStatus=r.approvalRequired?'AWAITING_JOEY_APPROVAL':'NO_APPROVAL_REQUIRED';
 r.missionStatus=r.approvalRequired?'Awaiting Joey approval':r.blocker?'Blocked':r.currentMission?'Active':fields.currentMission.status;
 if(p.conflicts?.length){r.missionStatus=p.conflicts.some(v=>!['git_observation_error','handoff_conflict'].includes(v.kind))?'Blocked':'Awaiting sync';r.conflicts=p.conflicts.map(v=>v.message||v.kind);}
 if(!r.lastCompletedAction&&!ref&&generatedAt)fields.lastCompletedAction={status:'Not recorded',reason:'Handoff scan completed; no validated completion record for this project',source:null};
 // Documents and Git events are not live execution or Agent identity.
 r.currentMission=null;r.currentAgent=null;r.currentModel=null;r.lastAgent=completion?.executedBy||null;r.lastModel=completion?.model||null;
 r.lastCompletedAction=completion?[completion.task,completion.summary].filter(Boolean).join(' — '):null;r.lastCompletedAt=completion?.timestamp||null;r.missionStatus=p.conflicts?.length?p.conflicts.some(v=>!['git_observation_error','handoff_conflict'].includes(v.kind))?'Blocked':'Awaiting sync':'Not recorded';
 for(const key of ['currentMission','currentAgent','currentModel'])fields[key]={status:'Not recorded',reason:'No fresh verified execution report; canonical task is a plan, not live execution',source:null};
 for(const key of ['lastAgent','lastModel','lastCompletedAction','lastCompletedAt'])fields[key]={status:r[key]?'Completed':!completion&&!p.lastAI?.source?'Awaiting sync':'Not recorded',reason:r[key]?null:completion?'Completion record omits this field':'No validated completion handoff',source:completion?.source||null};
 const latest=history.at(-1),completed=history.filter(v=>v.completed_at&&['COMPLETED','ACCEPTED','CLOSED'].includes(v.status)).sort((a,b)=>Date.parse(a.completed_at)-Date.parse(b.completed_at)).at(-1);
 if(latest){
  const running=latest.status==='RUNNING'&&latest.check_in?.verified===true&&Date.parse(latest.updated_at||latest.started_at)>Date.parse(generatedAt||new Date().toISOString())-30*60*1000;
  Object.assign(r,{currentMission:running?latest.task:null,currentAgent:running?latest.assigned_agent:null,currentModel:running?latest.model:null,lastAgent:r.lastAgent,lastModel:r.lastModel,nextAction:latest.next_action||r.nextAction,blocker:latest.blockers?.length?latest.blockers.join('\n'):null,approvalRequired:latest.status==='AWAITING_APPROVAL'||latest.approval?.required===true,approvalStatus:latest.approval?.status||(latest.status==='AWAITING_APPROVAL'?'AWAITING_JOEY_APPROVAL':latest.approval?.required?'AWAITING_JOEY_APPROVAL':'NO_APPROVAL_REQUIRED'),stateSource:'local_mission_overlay',missionId:latest.mission_id});
  r.missionStatus=latest.status==='BLOCKED'||r.approvalStatus==='BLOCKED'?'Blocked':r.approvalRequired&&r.approvalStatus==='AWAITING_JOEY_APPROVAL'?'Awaiting Joey approval':['COMPLETED','ACCEPTED','CLOSED'].includes(latest.status)?'Completed':running?'Active':'Not recorded';
  for(const key of ['currentMission','currentAgent','currentModel','lastAgent','lastModel','nextAction','blocker'])fields[key]={status:r[key]?'Active':'Not recorded',reason:r[key]?null:'Not recorded in local mission',source:{kind:'local_overlay',sourcePath:'local://missions/'+latest.mission_id,readAt:latest.updated_at||latest.created_at}};
 }
 if(completed){for(const key of ['lastAgent','lastModel','lastCompletedAction','lastCompletedAt'])fields[key]={status:'Completed',reason:null,source:{kind:'local_overlay',sourcePath:'local://missions/'+completed.mission_id,readAt:completed.updated_at||completed.completed_at,asOf:completed.completed_at}};r.lastAgent=completed.assigned_agent||null;r.lastModel=completed.model||null;r.lastCompletedAction=completed.result;r.lastCompletedAt=completed.completed_at;fields.lastCompletedAction={status:'Completed',reason:null,source:{kind:'local_overlay',sourcePath:'local://missions/'+completed.mission_id}};}
 for(const key of ['currentAgent','currentModel','lastCompletedAt','handoffRef','lastSyncedAt'])if(!fields[key])fields[key]={status:r[key]?'Active':key==='lastSyncedAt'?'Awaiting sync':'Not recorded',reason:r[key]?null:'No verified record for this field',source:key==='handoffRef'||key==='lastCompletedAt'?ref?.source||null:null};
 return r;
}
export function activities(p,{handoffs=[],history=[],publicRead=false}={}){
 const source=handoffs.filter(v=>v.entityId===p.id&&!v.conflict).map(v=>({projectId:p.id,missionId:null,agent:v.executedBy||null,model:v.model||null,action:v.task,status:v.status,startedAt:null,completedAt:/^(SUCCESS|COMPLETED|DONE)$/i.test(v.status)?v.timestamp:null,recordedAt:v.timestamp,commitSha:v.commit||null,handoffRef:publicRead?null:v.sourcePath,requiresApproval:false,stateSource:'canonical_handoff',source:publicRead?{fingerprint:v.fingerprint}:v.source}));
 const seen=new Set();const unique=source.filter(v=>{const k=JSON.stringify([v.projectId,v.action,v.recordedAt,v.source?.fingerprint]);if(seen.has(k))return false;seen.add(k);return true;});
 return [...unique,...history.map(v=>({projectId:p.id,missionId:v.mission_id,agent:v.assigned_agent,model:v.model,action:v.task,status:v.status,startedAt:v.started_at,completedAt:v.completed_at,recordedAt:v.updated_at||v.created_at,commitSha:v.resulting_commit,handoffRef:v.handoff_ref||null,requiresApproval:v.approval?.required===true,stateSource:'local_mission_overlay',events:v.events}))].sort((a,b)=>String(a.recordedAt).localeCompare(String(b.recordedAt)));
}
