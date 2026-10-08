import {workerEvidence,evidenceFreshnessMs} from './owner-worker-evidence.mjs';

// Projection of the already-read private pilot view. No IO or execution authority.
export function workerWorkSummary({view,config,readAt,now,unconfirmed=false}){
 const evidence=workerEvidence({view,config,readAt,now});
 const jobs=[...evidence.jobs].sort((a,b)=>b.fence-a.fence),latest=jobs[0]??null;
 const completed=jobs.find(job=>job.completionConfirmed)??null;
 const reference=job=>job?Object.freeze({jobId:job.jobId,fence:job.fence,state:job.state,observedAt:job.observedAt}):null;
 let currentState;
 if(unconfirmed)currentState='READ_UNCONFIRMED';
 else if(now-readAt>=evidenceFreshnessMs)currentState='READBACK_EXPIRED';
 else if(!view.enabled)currentState='BROKER_DISABLED';
 else if(view.worker?.revoked||view.worker?.enabled===false)currentState='WORKER_DISABLED_OR_REVOKED';
 else currentState=latest?(latest.state==='INCONSISTENT'?'INCONSISTENT':latest.terminal?'NO_ACTIVE_JOB_REPORTED':latest.state):'NO_JOB_REPORTED';
 return Object.freeze({projectId:evidence.projectId,currentState,currentWork:currentState==='RUNNING_REPORTED',latest:reference(latest),
  lastConfirmed:completed?Object.freeze({...reference(completed),completedAt:completed.events.find(event=>event.payload.kind==='process_exit').observedAt}):null,
  readAt,validUntil:unconfirmed?null:Math.min(readAt+evidenceFreshnessMs,currentState==='RUNNING_REPORTED'?latest.validUntil:Infinity),
  actor:null,model:null,identityReason:'AGENT_MODEL_NOT_PROVIDED',qualification:'SIGNED_BY_APPROVED_WORKER',canonicalSubmit:false,automaticExecution:false});
}
