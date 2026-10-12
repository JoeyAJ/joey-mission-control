import {taskReviewReworkInput} from './task-review-rework.mjs';
import {canonicalTaskJson} from './development-task.mjs';
import {validateTaskReview,TASK_REVIEW_VERSION,sameTaskReviewBinding,validateTaskReviewReply,verifyTaskReviewDigests} from './task-review-contract.mjs';
// Records are private, dated attestations. Only a fresh bound cloud task can be reviewed.
export function createTaskReviews({tasks,source,reports,client,now=Date.now,randomId=()=>crypto.randomUUID(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let status='idle',records=[],sequence=0,busy=false,generation=0,disposed=false,abort=null,timer=null,pending=null,ack=null;
 const listeners=new Set(),key=v=>canonicalTaskJson({scope:v.scope,status:v.status,selected:v.selected,task:v.tasks.find(t=>t.taskId===v.selected)||null,cloud:v.cloud,ci:v.reconciliation});
 const snapshot=()=>structuredClone({status,records,sequence,busy,ack,retry:Boolean(pending),retryComment:pending?.review.comment??null}),emit=()=>{for(const f of listeners)f(snapshot());};
 function clear(next='idle'){generation++;abort?.abort();abort=null;clearTimer(timer);timer=null;records=[];sequence=0;ack=null;pending=null;busy=false;status=next;emit();}
 let taskKey=key(tasks.snapshot()),sourceEpoch=0,reportEpoch=0;
 const unsubTask=tasks.subscribe(v=>{const next=key(v);if(next!==taskKey){taskKey=next;clear(v.status==='denied'?'denied':'idle');}});
 const unsubSource=source.subscribe(v=>{sourceEpoch++;clear(v.status==='denied'?'denied':'idle');});
 const unsubReport=reports.subscribe(v=>{reportEpoch++;clear(v.status==='denied'?'denied':'idle');});
 function capture(){const v=tasks.snapshot(),t=v.tasks.find(t=>t.taskId===v.selected);if(v.status!=='open'||v.busy||!t||!v.cloud.selectedConfirmed||v.cloud.conflict)throw Error('TASK_REVIEW_SAVED_TASK_REQUIRED');return {task:t,key:key(v),sourceEpoch,reportEpoch};}
 function check(g,c){if(disposed||g!==generation||c.key!==key(tasks.snapshot())||c.sourceEpoch!==sourceEpoch||c.reportEpoch!==reportEpoch)throw Error('TASK_REVIEW_INVALIDATED');}
 function until(expiry){clearTimer(timer);timer=setTimer(()=>clear('expired'),Math.max(1,expiry-now()+1));}
 async function operation(c,fn){if(disposed||busy)throw Error('TASK_REVIEW_BUSY');const g=generation;busy=true;status='reading';ack=null;abort=new AbortController();emit();try{const value=await fn(g,c,abort.signal);check(g,c);return value;}catch(e){if(g===generation){records=[];sequence=0;ack=null;status=[401,403].includes(e.status)?'denied':e.code==='TASK_REVIEW_CAPACITY'?'capacity':pending?'unconfirmed':'unavailable';if(['denied','capacity'].includes(status))pending=null;}throw e;}finally{if(g===generation){busy=false;abort=null;emit();}}}
 async function read(c,g,signal){const cap=await client.capability({signal});check(g,c);if(!cap.enabled){status='disabled';records=[];sequence=0;until(cap.expiresAt);return false;}const request={action:'list',taskId:c.task.taskId,afterSequence:0,pageLimit:50},reply=await verifyTaskReviewDigests(validateTaskReviewReply(await client.list({taskId:c.task.taskId,afterSequence:0,pageLimit:50},{signal}),request,now()));check(g,c);if(reply.records.some(r=>r.review.projectId!==c.task.projectId||r.review.track!==c.task.track))throw Error('TASK_REVIEW_SCOPE_INVALID');records=reply.records;sequence=reply.sequence;until(Math.min(cap.expiresAt,reply.expiresAt));return true;}
 function binding(decision,comment){const v=tasks.snapshot(),c=capture(),ci=v.reconciliation,row=v.taskReports?.observation?.runs.find(r=>r.report.runId===ci?.request.runId),sv=source.snapshot();
  if(v.reconciliationStatus!=='observed'||!ci||ci.expiresAt<=now()||ci.executionAuthorized!==false||ci.binding.taskRevisionQualification!=='EXACT_TASK_REQUIREMENTS_MATCH'||ci.binding.workHeadQualification!=='EXACT_REPORTED_COMMIT'||!row||row.requirementsStatus!=='MATCH'||row.report.events.at(-1).kind!=='completed'||sv.status!=='connected'||sv.observation?.status!=='FOUND'||sv.observation.source.resolvedCommitSha!==ci.binding.canonicalHeadSha)throw Error('TASK_REVIEW_FRESH_COMPLETED_MATCH_REQUIRED');
  const b=ci.binding;return validateTaskReview({schemaVersion:TASK_REVIEW_VERSION,projectId:c.task.projectId,track:c.task.track,taskId:c.task.taskId,taskRequirements:b.taskRequirements,repositoryId:b.repositoryId,canonicalRef:b.canonicalRef,canonicalHeadSha:b.canonicalHeadSha,reportRef:'mc/progress',reportPath:row.source.path,reportHeadSha:b.reportHeadSha,reportBlobId:b.reportBlobId,reportSequence:b.reportSequence,runId:ci.request.runId,workRef:b.workRef,codeSha:b.codeSha,decision,comment});
 }
 return {snapshot,subscribe(f){listeners.add(f);f(snapshot());return()=>listeners.delete(f);},clear,
  async load(){if(busy)throw Error('TASK_REVIEW_BUSY');clear();await tasks.cloudRefresh();const c=capture();return operation(c,async(g,c,signal)=>{await read(c,g,signal);check(g,c);if(status!=='disabled')status='history';});},
  // Capture the displayed intent before any await. PR/CI refresh is a separate Owner action;
  // reconciling here could replace the report or source tuple without another decision click.
  async record({runId,decision,comment=''}){if(busy)throw Error('TASK_REVIEW_BUSY');const c=capture(),review=binding(decision,comment);if(review.runId!==runId)throw Error('TASK_REVIEW_DISPLAYED_RUN_REQUIRED');const retry=pending;clear();return operation(c,async(g,c,signal)=>{
   check(g,c);if(!await read(c,g,signal))throw Error('TASK_REVIEW_NOT_ACTIVATED');check(g,c);if(!sameTaskReviewBinding(review,binding(decision,comment)))throw Error('TASK_REVIEW_INVALIDATED');
   const request=retry&&canonicalTaskJson(retry.review)===canonicalTaskJson(review)?retry:{action:'append',review,operationId:randomId(),expectedSequence:sequence};pending=request;
   const reply=await verifyTaskReviewDigests(validateTaskReviewReply(await client.append({review:request.review,operationId:request.operationId,expectedSequence:request.expectedSequence},{signal}),request,now()));check(g,c);if(!sameTaskReviewBinding(review,binding(decision,comment)))throw Error('TASK_REVIEW_INVALIDATED');
   records=[...records.filter(r=>r.operationId!==reply.record.operationId),reply.record].sort((a,b)=>a.sequence-b.sequence);sequence=Math.max(sequence,reply.record.sequence);ack=reply.record;pending=null;status='recorded';until(Math.min(reply.expiresAt,tasks.snapshot().reconciliation.expiresAt));return reply;
  });},
  async prepareRework({stillClean=()=>true}={}){
   if(busy||disposed)throw Error('TASK_REVIEW_BUSY');if(!stillClean())throw Error('TASK_REWORK_UNSAVED_EDITS');const c=capture(),record=structuredClone(records.at(-1));
   if(!record||record.review.decision!=='REQUEST_CHANGES'||!record.review.comment.trim()||!sameTaskReviewBinding(record.review,binding(record.review.decision,record.review.comment)))throw Error('TASK_REWORK_CURRENT_REVIEW_REQUIRED');
   const g=generation;busy=true;emit();
   try{const input=await taskReviewReworkInput({task:c.task,record});check(g,c);if(canonicalTaskJson(records.at(-1))!==canonicalTaskJson(record))throw Error('TASK_REWORK_INVALIDATED');
    return await tasks.save(input,{expectedTask:c.task,beforeSave:()=>{if(disposed||!stillClean()||c.sourceEpoch!==sourceEpoch||c.reportEpoch!==reportEpoch)throw Error('TASK_REWORK_INVALIDATED');}});
   }finally{if(g===generation){busy=false;emit();}}
  },
  canPrepareRework(){try{const record=records.at(-1);return !busy&&!disposed&&record?.review.decision==='REQUEST_CHANGES'&&Boolean(record.review.comment.trim())&&sameTaskReviewBinding(record.review,binding(record.review.decision,record.review.comment));}catch{return false;}},
  canRecord(runId){try{return binding('APPROVE','').runId===runId;}catch{return false;}},
  current(record){try{return sameTaskReviewBinding(record.review,binding(record.review.decision,record.review.comment));}catch{return false;}},
  dispose(){disposed=true;clear();unsubTask();unsubSource?.();unsubReport?.();listeners.clear();}
 };
}
