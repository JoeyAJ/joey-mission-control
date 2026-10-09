// Shared metadata replay. No filesystem, credentials, network or model payload.
import {createTaskEventChain} from './task-event-chain.mjs';
const keys=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error('EVENT_RECORD_INVALID');};
export function replayTaskEventRecord(record,{projectId='MISSION_CONTROL',taskId,now=Date.now}={}){
 keys(record,['schemaVersion','projectId','taskId','chainId','operations']);if(record.schemaVersion!==1||record.projectId!==projectId||record.taskId!==taskId||!Array.isArray(record.operations)||record.operations.length>1100)throw Error('EVENT_RECORD_SCOPE_INVALID');
 let at=now();const chain=createTaskEventChain({projectId,taskId,chainId:record.chainId,now:()=>at});
 for(const operation of record.operations){keys(operation,['kind','at','input','expectedOffset']);if(!Number.isSafeInteger(operation.at)||operation.at<0)throw Error('EVENT_RECORD_TIME_INVALID');at=operation.at;if(operation.kind==='register')chain.registerRun(operation.input);else if(operation.kind==='append')chain.append(operation.input,{expectedOffset:operation.expectedOffset});else throw Error('EVENT_RECORD_OPERATION_INVALID');}
 at=now();return chain;
}
export function taskRecordOperation(record,{kind,input,expectedOffset,now=Date.now}={}){
 const chain=replayTaskEventRecord(record,{taskId:record.taskId,now}),at=now();let result;
 if(kind==='register'){
  result=chain.registerRun(input);const run=result.run;input={runId:run.runId,executionKind:run.executionKind,ownerSelection:{agent:run.selection.agent,provider:run.selection.provider,model:run.selection.requestedModel},sourceQualification:run.sourceQualification,handoff:{qualification:'READ_ONLY_REPOSITORY_HANDOFF',projectId:record.projectId,providerNeutral:true,executionAuthorized:false,sourceStatus:'FOUND',freshness:'RECENT_DOCUMENT',source:{...run.handoffSource,qualification:'REMOTE_FILE_READ'}}};
 }else if(kind==='append'){result=chain.append(input,{expectedOffset});input=result.event;}else throw Error('EVENT_RECORD_OPERATION_INVALID');
 return {result,operation:{kind,at,input,...(kind==='append'?{expectedOffset}:{})}};
}
