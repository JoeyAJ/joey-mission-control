import {runtimeState,activities} from './runtime.mjs';
// V0.3 normalized view is additive: legacy projection and UI contracts remain intact.
export const baselineSha='2efd329c56d0eaae36ab78f5a820b778a6a10dbb';
export const actionClasses=['READ_ONLY','LOCAL_WRITE','REPO_WRITE','DEPLOY','CANONICAL_STATE_WRITE','DESTRUCTIVE'];
export function permission(action){if(!actionClasses.includes(action))throw new Error('Unknown action class');return {action,approval_required:action!=='READ_ONLY',public_allowed:action==='READ_ONLY',grants_execution:false};}
export const lifecycle={PLANNED:['READY','CLOSED'],READY:['RUNNING','BLOCKED','AWAITING_APPROVAL'],RUNNING:['BLOCKED','AWAITING_APPROVAL','COMPLETED'],BLOCKED:['READY','CLOSED'],AWAITING_APPROVAL:['READY','CLOSED'],COMPLETED:['ACCEPTED','READY'],ACCEPTED:['CLOSED'],CLOSED:[]};
export function transition(mission,status,patch={}){
 if(!lifecycle[mission.status]?.includes(status))throw new Error('Invalid mission transition');
 if(['ACCEPTED','CLOSED'].includes(status)&&mission.status==='COMPLETED'&&patch.approval?.joey_accepted!==true)throw new Error('Joey acceptance required');
 if(status==='ACCEPTED'&&patch.approval?.joey_accepted!==true)throw new Error('Joey acceptance required');
 if(status==='RUNNING'&&(!mission.baseline_sha||!mission.assigned_agent||patch.check_in?.verified!==true))throw new Error('Verified check-in required');
 if(status==='COMPLETED'&&(!patch.result||!Array.isArray(patch.tests)))throw new Error('Result and tests required');
 const now=new Date().toISOString();return {...mission,...patch,status,...(status==='RUNNING'?{started_at:now}:{}),...(status==='COMPLETED'?{completed_at:now}:{}),...(status==='ACCEPTED'?{accepted_at:now}:{})};
}
const missing=v=>v===undefined||v===null||v===''||v==='Unknown';
export function resolve(candidates){const found=candidates.find(c=>c&&!missing(c.value));return found?{value:found.value,provenance:found.source||{kind:found.kind||'explicit_state'}}:{value:null,provenance:{kind:'unknown',reason:'No verified source record'}};}
const c=claim=>claim&&({value:claim.value,source:claim.source});
export function manifest(p,{explicit={},handoff=null,publicRead=false,history=[],handoffs=[],generatedAt=null}={}){
 const provenance={};const field=(key,...candidates)=>{const r=resolve(candidates);provenance[key]=r.provenance;return r.value;};
 const canonical_source={repository:field('canonical_source.repository',c(explicit.repository),c(p.where.repository)),branch:field('canonical_source.branch',c(explicit.branch),c(p.where.branch)),baseline_sha:field('canonical_source.baseline_sha',c(explicit.baseline_sha),c(p.where.storedCommit)),production_url:field('canonical_source.production_url',c(explicit.production_url),c(p.where.production),p.projectUrls?.entries?.find(e=>e.type==='canonical_production')?{value:p.projectUrls.entries.find(e=>e.type==='canonical_production').url,source:p.projectUrls.source}:null)};
 if(/^[\w.-]+\/[\w.-]+$/.test(canonical_source.repository||''))canonical_source.repository='https://github.com/'+canonical_source.repository;
 if(canonical_source.repository&&!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/.test(canonical_source.repository))canonical_source.repository=null;
 const task=field('mission.task',c(explicit.task),c(p.currentTask));
 const mission={current_mission_id:null,status:task?'UNREGISTERED':'NOT_ESTABLISHED',task,last_completed:field('mission.last_completed',c(p.lastCompleted)),next_action:field('mission.next_action',c(explicit.next_action),c(p.nextAction),handoff?{value:handoff.nextAction,source:handoff.source}:null),blockers:missing(p.blocker?.value)?[]:[p.blocker.value],approval_required:(p.approvalGates||[]).length>0,approval_gates:p.approvalGates||[],blockers_verified:!missing(p.blocker?.value)};
 const execution_workspace={environment:'Joey Mac',local_path:publicRead?null:field('execution_workspace.local_path',c(p.where.localPath)),available:publicRead?null:!!p.workspaceObservation?.head,observation:publicRead?null:{head:p.workspaceObservation?.head||null,branch:p.workspaceObservation?.branch||null,observed_at:p.workspaceObservation?.observedAt||null}};
 const agent={current_agent:null,last_agent:field('agent.last_agent',c(p.lastAI)),model:field('agent.model',c(p.model)),started_at:null,completed_at:null,status:missing(p.lastAI?.value)?'UNVERIFIED_HISTORY':'SOURCE_RECORDED'};
 const runtime=runtimeState(p,{handoff,history,generatedAt,publicRead});
 Object.assign(mission,{status:history.at(-1)?.status||mission.status,task:runtime.currentMission,last_completed:runtime.lastCompletedAction,next_action:runtime.nextAction,blockers:runtime.blocker?[runtime.blocker]:[],approval_required:runtime.approvalRequired,current_mission_id:runtime.missionId||null});
 Object.assign(agent,{current_agent:runtime.currentAgent,last_agent:runtime.lastAgent,model:runtime.currentModel||runtime.lastModel});
 const activity=activities(p,{handoffs:handoffs.length?handoffs:[handoff].filter(Boolean),history,publicRead});
 const out={runtime,activity,schema_version:'0.3',project_id:p.id,name:p.name.value,status:p.status.value,canonical_source,execution_workspace,mission,agent,handoff:{source:publicRead?null:handoff?.sourcePath||handoff?.source?.sourcePath||null,updated_at:handoff?.timestamp||null,availability:handoff?'SOURCE_RECORDED':'NOT_RECORDED'},permissions:actionClasses.map(permission),provenance,observation_mode:publicRead?'release_snapshot':'local_projection'};
 return publicRead?publicManifest(out):out;
}
// Explicit public allowlist, never recursively copy unknown metadata or local machine paths.
export function publicManifest(m){const safeText=v=>typeof v==='string'&&!/(?:Bearer\s|gh[pousr]_|sk-|PRIVATE KEY|\/Users\/|\/home\/|token\s*[:=]|password\s*[:=])/i.test(v)?v:null;
 const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash?v:null;}catch{return null;}};
 const runtimeKeys=['schemaVersion','projectId','currentMission','missionStatus','currentAgent','lastAgent','currentModel','lastModel','lastCompletedAction','lastCompletedAt','nextAction','blocker','approvalStatus','handoffRef','sourceRepo','sourceBranch','baselineSha','productionUrl','localWorkspace','lastSyncedAt','stateSource'];
 const runtime=m.runtime?{...Object.fromEntries(runtimeKeys.map(k=>[k,safeText(m.runtime[k])])),approvalRequired:m.runtime.approvalRequired===true,localWorkspace:null,handoffRef:null,fields:Object.fromEntries(runtimeKeys.filter(k=>m.runtime.fields[k]).map(k=>[k,{status:m.runtime.fields[k].status,reason:safeText(m.runtime.fields[k].reason),source:null}]))}:null;
 if(runtime){runtime.sourceRepo=safeUrl(m.runtime.sourceRepo);runtime.productionUrl=safeUrl(m.runtime.productionUrl);}
 const activity=(m.activity||[]).map(v=>({...Object.fromEntries(['projectId','missionId','agent','model','action','status','startedAt','completedAt','recordedAt','commitSha','stateSource'].map(k=>[k,safeText(v[k])])),requiresApproval:v.requiresApproval===true,handoffRef:null,source:{kind:'release_snapshot'}}));
 return {runtime,activity,schema_version:'0.3',project_id:m.project_id,name:safeText(m.name),status:safeText(m.status),canonical_source:{repository:safeUrl(m.canonical_source.repository),branch:safeText(m.canonical_source.branch),baseline_sha:/^[a-f0-9]{40}$/.test(m.canonical_source.baseline_sha||'')?m.canonical_source.baseline_sha:null,production_url:safeUrl(m.canonical_source.production_url)},execution_workspace:{environment:'private_local_workspace',local_path:null,available:null},mission:{...Object.fromEntries(['current_mission_id','status','task','last_completed','next_action'].map(k=>[k,safeText(m.mission[k])])),blockers:m.mission.blockers.map(safeText).filter(Boolean),approval_required:m.mission.approval_required,blockers_verified:m.mission.blockers_verified},agent:{current_agent:null,last_agent:safeText(m.agent.last_agent),model:safeText(m.agent.model),started_at:null,completed_at:null,status:m.agent.status},handoff:{source:null,updated_at:m.handoff.updated_at,availability:m.handoff.availability},permissions:actionClasses.map(permission),provenance:Object.fromEntries(Object.entries(m.provenance).map(([k,v])=>[k,{kind:v.classification||v.kind||'source_record',fingerprint:/^[a-f0-9]{64}$/.test(v.fingerprint||'')?v.fingerprint:null}])),observation_mode:'release_snapshot'};
}
