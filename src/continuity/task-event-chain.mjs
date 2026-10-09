// Local bounded metadata only. No transport, provider SDK, persistence or executor.
import {ownerAgentSelection} from './agent-handoff-selection.mjs';
const VERSION='mc.task-events.v1';
const kinds=new Set(['started','progress','blocked','completed','failed']);
const terminal=new Set(['completed','failed']);
const qualifications=new Set(['SYNTHETIC_FIXTURE','EXECUTOR_VISIBLE_SUMMARY','UNVERIFIED_INPUT','LOCAL_PROCESS_EMITTER','PARENT_IMPORTED_VISIBLE_SUMMARY','CODEX_CLI_PUBLIC_STREAM']);
const summaryCodes=new Set(['RUN_STARTED','WORK_PROGRESS','PERMISSION_REQUIRED','SOURCE_CHANGED','MODEL_MISMATCH','RUN_COMPLETED','RUN_FAILED','SOURCE_UNAVAILABLE','CANCELLED','EXECUTOR_UNCONFIRMED']);
const summariesByKind={started:['RUN_STARTED'],progress:['WORK_PROGRESS'],blocked:['PERMISSION_REQUIRED','SOURCE_CHANGED','MODEL_MISMATCH','SOURCE_UNAVAILABLE','EXECUTOR_UNCONFIRMED'],completed:['RUN_COMPLETED'],failed:['RUN_FAILED','MODEL_MISMATCH','SOURCE_UNAVAILABLE','CANCELLED']};
const errors=new Set([null,'PERMISSION_REQUIRED','MODEL_MISMATCH','SOURCE_CHANGED','SOURCE_UNAVAILABLE','EXECUTOR_FAILURE','CANCELLED','UNSPECIFIED_FAILURE']);
const sensitive=/Bearer\s|\b(?:token|password|secret)\s*[:=]|gh[pousr]_|github_pat_|sk-[A-Za-z0-9]|PRIVATE KEY|^eyJ[A-Za-z0-9_-]+\./i;
const fail=code=>{throw Object.assign(Error(code),{code});};
const copy=value=>structuredClone(value);
// Unknown payloads (including getters) are never evaluated, copied or hashed.
function pick(value,fields){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('INVALID_METADATA');
 const result={};for(const key of fields){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&!('value'in descriptor))fail('INVALID_METADATA');result[key]=descriptor?.value;}return result;
}
function identifier(value,{nullable=false}={}){
 if(nullable&&value===null)return null;
 if(typeof value!=='string'||value.length>128||!value.trim()||/[\u0000-\u001f\u007f]/.test(value)||sensitive.test(value)||/^(?:\/|[A-Za-z]:\\|https?:\/\/)/i.test(value))fail('INVALID_IDENTIFIER');
 return value.trim();
}
function id(value){if(typeof value!=='string'||!/^[-A-Za-z0-9_.:]{1,100}$/.test(value)||sensitive.test(value))fail('INVALID_ID');return value;}
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(Date.parse(value)).toISOString()!==value)fail('INVALID_TIME');return Date.parse(value);}
function clock(now){const value=now();if(!Number.isSafeInteger(value)||value<0)fail('INVALID_CLOCK');return value;}
function selection(value,executionKind='AGENT_TASK'){
 const selected=ownerAgentSelection(pick(value,['agent','provider','model']));
 if(!['AGENT_TASK','MODEL_FREE_CHECK','PARENT_REPORTED_PROGRESS'].includes(executionKind))fail('EXECUTION_KIND_INVALID');
 if(executionKind==='AGENT_TASK'&&!selected.model)fail('MODEL_DECISION_REQUIRED');if(!selected.agent||!selected.provider)fail('AGENT_PROVIDER_DECISION_REQUIRED');
 if(executionKind==='MODEL_FREE_CHECK'&&selected.model!==null)fail('CHECK_DOES_NOT_INVOKE_MODEL');
 if(executionKind==='PARENT_REPORTED_PROGRESS'&&selected.model!==null)fail('RECORD_DOES_NOT_SELECT_MODEL');
 return {qualification:executionKind==='PARENT_REPORTED_PROGRESS'?'PARENT_REPORTED_EXECUTOR_NOT_OWNER_SELECTION':executionKind==='MODEL_FREE_CHECK'?'MODEL_FREE_TOOL_NO_MODEL':'OWNER_SELECTION',agent:identifier(selected.agent),provider:identifier(selected.provider),requestedModel:identifier(selected.model,{nullable:executionKind!=='AGENT_TASK'})};
}
function processEvidence(value){
 if(value===undefined||value===null)return null;const v=pick(value,['event','pid','exitCode','signal','outputBytes']);
 if(!['spawn','output','close','error','parent-summary'].includes(v.event)||v.pid!==null&&(!Number.isSafeInteger(v.pid)||v.pid<1)||v.exitCode!==null&&(!Number.isSafeInteger(v.exitCode)||v.exitCode<0||v.exitCode>255)||![null,'SIGTERM','SIGKILL','SIGINT'].includes(v.signal)||!Number.isSafeInteger(v.outputBytes)||v.outputBytes<0||v.outputBytes>1048576)fail('PROCESS_EVIDENCE_INVALID');return v;
}
function sourcePin(handoff,projectId,now,maxAgeMs){
 const packet=pick(handoff,['qualification','projectId','providerNeutral','executionAuthorized','sourceStatus','freshness','source']);
 if(packet.qualification!=='READ_ONLY_REPOSITORY_HANDOFF'||packet.projectId!==projectId||packet.providerNeutral!==true||packet.executionAuthorized!==false||packet.sourceStatus!=='FOUND'||packet.freshness!=='RECENT_DOCUMENT')fail('HANDOFF_REQUIRED');
 const source=pick(packet.source,['qualification','repositoryId','requestedRef','path','resolvedCommitSha','contentSha256','readAt']);
 if(source.qualification!=='REMOTE_FILE_READ'||typeof source.repositoryId!=='string'||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(source.repositoryId)||typeof source.requestedRef!=='string'||!/^[-A-Za-z0-9_./]{1,200}$/.test(source.requestedRef)||source.requestedRef.includes('..')||typeof source.path!=='string'||!/^(?:HANDOFF\.md|docs\/[A-Za-z0-9_.-]+\.md)$/.test(source.path)||source.path.includes('..')||[source.repositoryId,source.requestedRef,source.path].some(value=>sensitive.test(value))||!/^[a-f0-9]{40}$/.test(source.resolvedCommitSha)||!/^[a-f0-9]{64}$/.test(source.contentSha256))fail('HANDOFF_BINDING_INVALID');
 const readAt=timestamp(source.readAt);if(readAt>now+5000||now-readAt>maxAgeMs)fail('HANDOFF_OBSERVATION_STALE');
 return {...source,qualification:'LATEST_OBSERVED_REPOSITORY_HANDOFF'};
}
const samePin=(a,b)=>['repositoryId','requestedRef','path','resolvedCommitSha','contentSha256'].every(key=>a[key]===b[key]);
const sameScope=(a,b)=>['repositoryId','requestedRef','path'].every(key=>a[key]===b[key]);

export function createTaskEventChain({projectId,taskId,chainId,now=Date.now,maxEvents=1000,maxRuns=100,freshnessMs=300000}={}){
 projectId=id(projectId);taskId=id(taskId);chainId=id(chainId);
 if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>1000||!Number.isSafeInteger(maxRuns)||maxRuns<1||maxRuns>100||!Number.isSafeInteger(freshnessMs)||freshnessMs<1||freshnessMs>300000)fail('INVALID_LIMITS');
 const task=Object.freeze({projectId,taskId}),runs=new Map(),events=[],byEventId=new Map();let revision=0,closed=false,taskSourceScope=null;
 const requireOpen=()=>{if(closed)fail('CHAIN_CLOSED');};
 const getRun=runId=>{const run=runs.get(id(runId));if(!run)fail('UNKNOWN_RUN');return run;};
 const cursor=(offset,runId)=>({schemaVersion:VERSION,chainId,projectId,taskId,runId,offset,anchorEventId:offset?events[offset-1].eventId:null});
 const snapshot=()=>{requireOpen();return copy({schemaVersion:VERSION,chainId,...task,revision,eventCount:events.length,cursor:cursor(events.length,null),inspectedAt:new Date(clock(now)).toISOString(),freshnessMs,runs:[...runs.values()],providerNeutral:true,storage:'MEMORY_ONLY',runtimeConnected:false,currentAgent:null,currentModel:null,executionAuthorized:false});};
 return Object.freeze({
  snapshot,
  registerRun({runId,ownerSelection,handoff,sourceQualification='UNVERIFIED_INPUT',executionKind='AGENT_TASK'}={}){
   requireOpen();runId=id(runId);if(!qualifications.has(sourceQualification))fail('INVALID_SOURCE_QUALIFICATION');
   if(executionKind==='PARENT_REPORTED_PROGRESS'&&sourceQualification!=='PARENT_IMPORTED_VISIBLE_SUMMARY')fail('PARENT_SOURCE_QUALIFICATION_REQUIRED');
   const chosen=selection(ownerSelection,executionKind),source=sourcePin(handoff,projectId,clock(now),freshnessMs),existing=runs.get(runId);
   if(taskSourceScope&&!sameScope(taskSourceScope,source))fail('HANDOFF_SCOPE_CHANGED');
   if(existing){if(!samePin(existing.handoffSource,source)||JSON.stringify(existing.selection)!==JSON.stringify(chosen)||existing.sourceQualification!==sourceQualification||existing.executionKind!==executionKind)fail('RUN_ID_CONFLICT');return {duplicate:true,run:copy(existing)};}
   if(runs.size>=maxRuns)fail('RUN_CAPACITY');
   const run={...task,runId,executionKind,selection:chosen,handoffSource:source,sourceQualification,identityQualification:executionKind==='PARENT_REPORTED_PROGRESS'?'PARENT_REPORTED_NOT_RUNTIME_VERIFIED':'CALLER_DECLARED_NOT_VERIFIED',status:'planned',sequence:0,actualModel:null,modelQualification:executionKind==='MODEL_FREE_CHECK'?'NOT_APPLICABLE_NO_MODEL':'UNKNOWN',eventAt:null,receivedAt:null};
   taskSourceScope={repositoryId:source.repositoryId,requestedRef:source.requestedRef,path:source.path};runs.set(runId,run);revision++;return {duplicate:false,run:copy(run)};
  },
  append(input,{expectedOffset}={}){
   requireOpen();const metadata=pick(input,['eventId','projectId','taskId','runId','agent','provider','requestedModel','actualModel','sequence','eventAt','kind','summaryCode','safeErrorCategory','handoffSha','processEvidence']);metadata.processEvidence=processEvidence(metadata.processEvidence);
   const run=getRun(metadata.runId);
   if(run.executionKind==='PARENT_REPORTED_PROGRESS'){
    const summary=pick(input,['publicSummary']).publicSummary;
    if(typeof summary!=='string'||!summary.trim()||summary.length>1024||/[\u0000-\u001f\u007f]/.test(summary)||sensitive.test(summary)||!['progress','blocked','completed'].includes(metadata.kind)||metadata.processEvidence!==null||metadata.actualModel!==null||metadata.eventAt!==null)fail('PARENT_SUMMARY_INVALID');
    metadata.publicSummary=summary.trim();
   }
   if(metadata.projectId!==projectId||metadata.taskId!==taskId||metadata.agent!==run.selection.agent||metadata.provider!==run.selection.provider||metadata.requestedModel!==run.selection.requestedModel||metadata.handoffSha!==run.handoffSource.resolvedCommitSha)fail('EVENT_SCOPE_MISMATCH');
   metadata.eventId=id(metadata.eventId);metadata.actualModel=identifier(metadata.actualModel,{nullable:true});
   if(run.executionKind==='MODEL_FREE_CHECK'&&metadata.actualModel!==null)fail('CHECK_DOES_NOT_INVOKE_MODEL');
   if(!Number.isSafeInteger(metadata.sequence)||metadata.sequence<1||!kinds.has(metadata.kind)||!summaryCodes.has(metadata.summaryCode)||!summariesByKind[metadata.kind].includes(metadata.summaryCode)||!errors.has(metadata.safeErrorCategory)||['started','progress','completed'].includes(metadata.kind)&&metadata.safeErrorCategory!==null)fail('INVALID_EVENT');
   if(metadata.eventAt!==null)timestamp(metadata.eventAt);
   const duplicate=byEventId.get(metadata.eventId);
   if(duplicate){if(JSON.stringify(duplicate.metadata)!==JSON.stringify(metadata))fail('EVENT_ID_CONFLICT');return {duplicate:true,event:copy(duplicate.event),revision};}
   if(!Number.isSafeInteger(expectedOffset)||expectedOffset!==events.length)fail('OFFSET_CONFLICT');
   if(events.length>=maxEvents)fail('EVENT_CAPACITY');
   if(metadata.sequence!==run.sequence+1)fail('SEQUENCE_CONFLICT');
   if(terminal.has(run.status))fail('RUN_CLOSED');
   if(!run.sequence&&metadata.kind!=='started'&&run.executionKind!=='PARENT_REPORTED_PROGRESS'&&!(metadata.kind==='failed'&&metadata.processEvidence?.event==='error'&&['LOCAL_PROCESS_EMITTER','CODEX_CLI_PUBLIC_STREAM'].includes(run.sourceQualification)))fail('START_REQUIRED');
   if(run.sequence&&metadata.kind==='started')fail('ALREADY_STARTED');
   const received=clock(now),receivedAt=new Date(received).toISOString();
   if(events.length&&received<timestamp(events.at(-1).receivedAt))fail('RECEIVED_TIME_REGRESSION');
   if(metadata.eventAt!==null&&(timestamp(metadata.eventAt)>received||run.eventAt!==null&&timestamp(metadata.eventAt)<timestamp(run.eventAt)))fail('EVENT_TIME_INVALID');
   const mismatch=metadata.actualModel!==null&&metadata.actualModel!==metadata.requestedModel;
   if(run.modelQualification==='REPORTED_MISMATCH'&&!['blocked','failed'].includes(metadata.kind))fail('MODEL_MISMATCH');
   if(mismatch&&(!['blocked','failed'].includes(metadata.kind)||metadata.safeErrorCategory!=='MODEL_MISMATCH'||metadata.summaryCode!=='MODEL_MISMATCH'))fail('MODEL_MISMATCH');
   if(run.actualModel!==null&&metadata.actualModel!==null&&metadata.actualModel!==run.actualModel&&!mismatch)fail('ACTUAL_MODEL_CHANGED');
   const event={schemaVersion:VERSION,...metadata,offset:events.length+1,receivedAt,timeBasis:metadata.eventAt===null?'RECEIVER_TIME_NOT_SOURCE_EVENT':'SOURCE_REPORTED_EVENT_TIME',sourceQualification:run.sourceQualification,identityQualification:run.identityQualification,modelMismatch:mismatch};
   events.push(event);byEventId.set(metadata.eventId,{metadata:copy(metadata),event});
   run.sequence=metadata.sequence;run.status=metadata.kind;run.receivedAt=receivedAt;if(metadata.eventAt!==null)run.eventAt=metadata.eventAt;
   if(metadata.actualModel!==null){run.actualModel=metadata.actualModel;run.modelQualification=mismatch?'REPORTED_MISMATCH':'REPORTED_NOT_VERIFIED';}
   revision++;return {duplicate:false,event:copy(event),revision};
  },
  readPage({cursor:previous=null,runId=null,limit=50}={}){
   requireOpen();if(runId!==null)getRun(runId);if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('INVALID_PAGE_SIZE');
   let offset=0;
   if(previous){const c=pick(previous,['schemaVersion','chainId','projectId','taskId','runId','offset','anchorEventId']);if(c.schemaVersion!==VERSION||c.chainId!==chainId||c.projectId!==projectId||c.taskId!==taskId||c.runId!==runId||!Number.isSafeInteger(c.offset)||c.offset<0||c.offset>events.length||c.anchorEventId!==(c.offset?events[c.offset-1].eventId:null))fail('CURSOR_SCOPE_MISMATCH');offset=c.offset;}
   const remaining=events.slice(offset).filter(event=>runId===null||event.runId===runId),page=remaining.slice(0,limit),hasMore=remaining.length>page.length;
   const nextOffset=hasMore?page.at(-1).offset:events.length;
   return copy({schemaVersion:VERSION,...task,events:page,cursor:cursor(nextOffset,runId),hasMore,revision,sourceQualification:'LOCAL_EVENT_METADATA_NOT_AUTOMATIC_PROVIDER_FEED',runtimeConnected:false,executionAuthorized:false});
  },
  inspectRun(runId){requireOpen();const run=getRun(runId),time=clock(now);return copy({...run,validity:terminal.has(run.status)?'CLOSED':run.receivedAt===null?'NOT_STARTED':time<timestamp(run.receivedAt)?'UNKNOWN_FUTURE_RECEIPT':time-timestamp(run.receivedAt)>=freshnessMs?'STALE':'RECENT_REPORTED_SUMMARY',runtimeConnected:false,currentAgent:null,currentModel:null,executionAuthorized:false});},
  dispose(){closed=true;runs.clear();events.length=0;byEventId.clear();taskSourceScope=null;}
 });
}

async function latestHandoff(reader,ownerSelection,task){
 if(typeof reader?.refresh!=='function'||typeof reader?.handoff!=='function')fail('HANDOFF_READER_REQUIRED');
 const view=await reader.refresh();if(view.status!=='connected'||view.observation?.projectId!==task.projectId||view.observation?.status!=='FOUND')fail('CURRENT_HANDOFF_UNAVAILABLE');
 const value=await reader.handoff(ownerSelection);if(!value)fail('HANDOFF_CHANGED_DURING_READ');
 const handoff=pick(value,['schemaVersion','projectId','source','sourceStatus','contextDocuments','freshness','baselineChanged','progress','document','qualification','providerNeutral','targetSelection','modelDecisionRequired','currentAgent','currentModel','executionAuthorized','instruction']);
 if(handoff.projectId!==task.projectId||handoff.source?.resolvedCommitSha!==view.observation.source.resolvedCommitSha||handoff.source?.contentSha256!==view.observation.source.contentSha256)fail('HANDOFF_CHANGED_DURING_READ');return handoff;
}
// Inject the existing current-Owner reader. These helpers only perform its reads.
export async function prepareTaskEventRun({chain,runId,reader,ownerSelection,sourceQualification='UNVERIFIED_INPUT'}={}){
 selection(ownerSelection);const before=chain.snapshot(),handoff=await latestHandoff(reader,ownerSelection,before);
 if(chain.snapshot().revision!==before.revision)fail('EVENT_CHAIN_CHANGED_DURING_READ');
 return chain.registerRun({runId,ownerSelection,handoff,sourceQualification});
}
export async function prepareTaskEventHandoff({chain,runId,reader,ownerSelection={}}={}){
 const before=chain.snapshot(),run=chain.inspectRun(runId),handoff=await latestHandoff(reader,ownerSelection,before);
 const after=chain.snapshot();if(after.revision!==before.revision)fail('EVENT_CHAIN_CHANGED_DURING_READ');sourcePin(handoff,before.projectId,timestamp(after.inspectedAt),after.freshnessMs);
 if(!sameScope(run.handoffSource,handoff.source))fail('HANDOFF_SCOPE_CHANGED');
 // Keep the historical run pin and latest repository pin separate after drift.
 return {...handoff,taskEventContext:{schemaVersion:VERSION,projectId:before.projectId,taskId:before.taskId,runId,runHandoffSource:run.handoffSource,latestSourceChanged:!samePin(run.handoffSource,handoff.source),reportedRun:run,eventCount:before.eventCount,journalRevision:before.revision,cursor:before.cursor,sourceQualification:'LOCAL_EVENT_METADATA_NOT_AUTOMATIC_PROVIDER_FEED',reconciliationRequired:true},providerNeutral:true,currentAgent:null,currentModel:null,runtimeConnected:false,executionAuthorized:false};
}
