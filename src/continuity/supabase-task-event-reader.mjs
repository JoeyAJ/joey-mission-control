// Normal Owner SDK read only; never export a JWT to a CLI or management caller.
import {replayTaskEventRecord} from './task-event-record.mjs';
import {prepareTaskEventHandoff} from './task-event-chain.mjs';
import {buildAgentContinuationPackage,requireContinuationSelection} from './agent-continuation-package.mjs';
export function createSupabaseTaskEventReader({rpc,sourceReader,now=Date.now}={}){
 async function load(taskId){
  if(typeof taskId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(taskId))throw Error('TASK_ID_INVALID');
  const {data,error}=await rpc('mc_task_events_read',{task_id:taskId});if(error)throw Object.assign(Error('OWNER_EVENT_READ_DENIED'),{status:403});
  if(data?.schemaVersion!==1||data.projectId!=='MISSION_CONTROL'||data.taskId!==taskId||!Number.isSafeInteger(data.expiresAt)||data.expiresAt<=now()||!Number.isSafeInteger(data.revision)||data.revision<1||data.record?.operations?.length!==data.revision)throw Error('DURABLE_EVENT_RESPONSE_INVALID');
  const chain=replayTaskEventRecord(data.record,{taskId,now});for(const run of chain.snapshot().runs)if(run.handoffSource.repositoryId!=='JoeyAJ/joey-mission-control'||run.handoffSource.requestedRef!=='codex/mc-command-center-checkpoint-20261006'||!(run.sourceQualification==='CODEX_CLI_PUBLIC_STREAM'&&run.executionKind==='AGENT_TASK'||run.sourceQualification==='PARENT_IMPORTED_VISIBLE_SUMMARY'&&run.executionKind==='PARENT_REPORTED_PROGRESS'))throw Error('DURABLE_EVENT_SOURCE_INVALID');return {data,chain};
 }
 const disabled=()=>{throw Error('CLOUD_TASK_WRITER_NOT_EXPOSED');};
 async function handoff({taskId,runId,ownerSelection}){
  const {data,chain}=await load(taskId),packet=await prepareTaskEventHandoff({chain,runId,reader:sourceReader,ownerSelection}),latest=await load(taskId);if(latest.data.revision!==data.revision)throw Error('EVENT_CHAIN_CHANGED_DURING_READ');
  return {schemaVersion:1,expiresAt:latest.data.expiresAt,packet:{...packet,taskEventContext:{...packet.taskEventContext,sourceQualification:chain.inspectRun(runId).sourceQualification,durableRevision:data.revision,storageQualification:'SUPABASE_DURABLE_PARENT_MANAGED_RECORD'}},chain};
 }
 async function continuation(input,selected){
  const reply=await handoff({...input,ownerSelection:selected||{}});let cursor=null,latestEvent=null;
  do{const page=reply.chain.readPage({cursor,limit:100});for(const event of page.events)if(event.runId===input.runId)latestEvent=event;cursor=page.cursor;if(!page.hasMore)break;}while(true);
  return {schemaVersion:1,expiresAt:reply.expiresAt,packet:buildAgentContinuationPackage({handoff:reply.packet,runs:reply.chain.snapshot().runs,latestEvent,ownerSelection:selected})};
 }
 return Object.freeze({
  config:async()=>({schemaVersion:1,projectId:'MISSION_CONTROL',readOnly:true,modelExecutionEnabled:false}),
  async events({taskId,cursor,signal}){if(signal?.aborted)throw Error('EVENT_READ_ABORTED');const {data,chain}=await load(taskId);if(signal?.aborted)throw Error('EVENT_READ_ABORTED');const page=chain.readPage({cursor}),lease=data.lease;
   return {...page,schemaVersion:1,eventSchemaVersion:page.schemaVersion,sourceQualification:'SUPABASE_DURABLE_PARENT_MANAGED_RECORD',expiresAt:data.expiresAt,runs:chain.snapshot().runs.map(run=>({...chain.inspectRun(run.runId),emitterAttached:false,deliveryLeaseActive:lease?.runId===run.runId&&lease.expiresAt>now()&&!['completed','failed'].includes(run.status),recoveryState:null})),runtimeConnected:false};
  },
  async handoff(input){const {chain,...reply}=await handoff(input);return reply;},
  overview:input=>continuation(input,null),
  continuation:input=>continuation(input,requireContinuationSelection(input.ownerSelection)),
  startCheck:disabled,registerAgent:disabled,importSummary:disabled
 });
}
