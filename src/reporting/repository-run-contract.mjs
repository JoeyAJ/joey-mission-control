// Provider-neutral repository reports. Declarative private metadata, never an executor.
import {isStrictDateTime} from '../canonical/date-time.mjs';
export const REPORT_REF='mc/progress',REPORT_DIRECTORY='.mission-control/runs';
export const REPORT_VERSION='mc.repository-run.v1',MAX_REPORT_BYTES=16384,MAX_EVENTS=64,MAX_RUNS=20;
const sha=/^[a-f0-9]{40}$/,id=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;
const kinds=new Set(['started','progress','heartbeat','blocked','completed','failed']),terminal=new Set(['completed','failed']);
const sensitive=/Bearer\s|gh[pousr]_|github_pat_|\b(?:password|secret|token)\s*[:=]|PRIVATE KEY|^eyJ[A-Za-z0-9_-]+\./i;
function fail(code='RUN_REPORT_INVALID'){throw Object.assign(Error(code),{code});}
function object(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).some(k=>!keys.includes(k)))fail();for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(!('value'in descriptor))fail();}
function string(value,max){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value)||sensitive.test(value))fail();return value;}
function identifier(value){if(typeof value!=='string'||!id.test(value)||sensitive.test(value))fail();return value;}
function relative(value){string(value,200);if(!/^[A-Za-z0-9_.\/-]+$/.test(value)||value.startsWith('/')||value.includes('..'))fail();return value;}
function timestamp(value){if(!isStrictDateTime(value))fail('RUN_REPORT_TIME_INVALID');return Date.parse(value);}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const sameRunReportEvent=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function runReportPath(runId){return REPORT_DIRECTORY+'/'+identifier(runId)+'.json';}
export function validateRepositoryRun(input,{scope=null,now=Date.now()}={}){
 object(input,['schemaVersion','projectId','track','runId','predecessorRunId','taskId','featureTitle','agentName','provider','model','repositoryId','reportRef','workRef','baseline','events']);
 if(input.schemaVersion!==REPORT_VERSION||!Number.isSafeInteger(now)||now<0||typeof input.projectId!=='string'||!/^[_A-Z][_A-Z0-9]{0,79}$/.test(input.projectId)||!['BASELINE','UNIVERSITY_CANDIDATE'].includes(input.track)||input.track==='UNIVERSITY_CANDIDATE'&&input.projectId!=='JOEY_ASSET_SYSTEM'||typeof input.repositoryId!=='string'||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(input.repositoryId)||input.reportRef!==REPORT_REF)fail('RUN_REPORT_SCOPE_INVALID');
 identifier(input.runId);identifier(input.taskId);if(input.predecessorRunId!==null&&(identifier(input.predecessorRunId)===input.runId))fail();string(input.featureTitle,500);string(input.agentName,100);for(const k of ['provider','model'])if(input[k]!==null)string(input[k],100);relative(input.workRef);
 object(input.baseline,['ref','commitSha','handoffPath','handoffDigest','contextPaths']);if(input.baseline.contextPaths!==undefined){if(!Array.isArray(input.baseline.contextPaths)||input.baseline.contextPaths.length>4||new Set(input.baseline.contextPaths).size!==input.baseline.contextPaths.length)fail('RUN_REPORT_SCOPE_INVALID');for(const p of input.baseline.contextPaths)relative(p);if(scope&&JSON.stringify(input.baseline.contextPaths)!==JSON.stringify(scope.contextPaths||[]))fail('RUN_REPORT_SCOPE_INVALID');}relative(input.baseline.ref);relative(input.baseline.handoffPath);if(!sha.test(input.baseline.commitSha)||!/^[a-f0-9]{64}$/.test(input.baseline.handoffDigest))fail();
 if(scope&&(input.projectId!==scope.projectId||input.repositoryId!==scope.repositoryId||input.track!==(scope.track||'BASELINE')||input.baseline.ref!==scope.ref||input.baseline.handoffPath!==scope.path))fail('RUN_REPORT_SCOPE_INVALID');
 if(!Array.isArray(input.events)||!input.events.length||input.events.length>MAX_EVENTS)fail('RUN_REPORT_EVENT_LIMIT');
 let state=null,previousTime=0;const eventIds=new Set();
 for(const [index,event]of input.events.entries()){
  object(event,['id','sequence','eventAt','kind','summary','result']);identifier(event.id);if(eventIds.has(event.id))fail('RUN_REPORT_EVENT_CONFLICT');eventIds.add(event.id);
  if(event.sequence!==index+1||!kinds.has(event.kind)||index===0&&event.kind!=='started'||index>0&&event.kind==='started'||terminal.has(state))fail('RUN_REPORT_TRANSITION_INVALID');
  const at=timestamp(event.eventAt);if(at<previousTime||at>now+30000)fail('RUN_REPORT_TIME_INVALID');previousTime=at;string(event.summary,500);
  if(event.kind==='started'||event.kind==='progress')state='running';else if(event.kind!=='heartbeat')state=event.kind;
  if(event.kind==='heartbeat'&&!['running','blocked'].includes(state))fail('RUN_REPORT_TRANSITION_INVALID');
  if(event.kind==='completed'){
   object(event.result,['codeSha','tests','nextSteps','handoff']);if(!sha.test(event.result.codeSha)||!Array.isArray(event.result.tests)||!event.result.tests.length||event.result.tests.length>12)fail('RUN_REPORT_RESULT_INVALID');
   for(const t of event.result.tests){object(t,['name','outcome']);string(t.name,150);if(!['PASS','FAIL','NOT_RUN'].includes(t.outcome))fail('RUN_REPORT_RESULT_INVALID');}
   string(event.result.nextSteps,1000);object(event.result.handoff,['path','commitSha']);relative(event.result.handoff.path);if(!sha.test(event.result.handoff.commitSha)||scope&&![scope.path,...(scope.contextPaths||[])].includes(event.result.handoff.path))fail('RUN_REPORT_RESULT_INVALID');
  }else if(event.result!==null)fail('RUN_REPORT_RESULT_INVALID');
 }
 const bytes=new TextEncoder().encode(JSON.stringify(input));if(bytes.length>MAX_REPORT_BYTES)fail('RUN_REPORT_TOO_LARGE');return structuredClone(input);
}
export function parseRepositoryRun(content,options={}){
 if(typeof content!=='string'||content.includes('\0')||new TextEncoder().encode(content).length>MAX_REPORT_BYTES)fail('RUN_REPORT_TOO_LARGE');let value;try{value=JSON.parse(content);}catch{fail();}return validateRepositoryRun(value,options);
}
export function appendRepositoryRunEvent(report,event,{expectedSequence,scope=null,now=Date.now()}={}){
 const current=validateRepositoryRun(report,{scope,now});object(event,['id','sequence','eventAt','kind','summary','result']);const prior=current.events.find(e=>e.id===event?.id);if(prior){if(sameRunReportEvent(prior,event))return {report:current,idempotent:true};fail('RUN_REPORT_EVENT_CONFLICT');}
 if(expectedSequence!==current.events.at(-1).sequence)fail('RUN_REPORT_SEQUENCE_CONFLICT');
 return {report:validateRepositoryRun({...current,events:[...current.events,event]},{scope,now}),idempotent:false};
}
export function repositoryRunPresentation(report,{now=Date.now(),sourceAvailable=true}={}){
 const v=validateRepositoryRun(report,{now});let state='running';for(const event of v.events){if(['started','progress'].includes(event.kind))state='running';else if(event.kind!=='heartbeat')state=event.kind;}
 const event=v.events.at(-1),terminal=['completed','failed'].includes(state),expiresAt=Date.parse(event.eventAt)+300000,fresh=sourceAvailable&&(terminal||now<expiresAt);
 return {qualification:'AGENT_SELF_REPORTED_REPOSITORY_SOURCE',projectId:v.projectId,track:v.track,runId:v.runId,predecessorRunId:v.predecessorRunId,taskId:v.taskId,featureTitle:v.featureTitle,agentName:v.agentName,provider:v.provider,model:v.model,workRef:v.workRef,reportedState:state,currentState:fresh?state:'unconfirmed',freshness:sourceAvailable?(fresh?'FRESH':'STALE'):'SOURCE_UNCONFIRMED',eventAt:event.eventAt,expiresAt:terminal?null:new Date(expiresAt).toISOString(),summary:event.summary,sequence:event.sequence,result:event.result,productAccepted:false,merged:false,deployed:false,executionAuthorized:false};
}
export function createRepositoryRun({scope,runId,predecessorRunId=null,taskId,featureTitle,agentName,provider=null,model=null,workRef,eventId,summary,now=Date.now()}={}){
 return validateRepositoryRun({schemaVersion:REPORT_VERSION,projectId:scope.projectId,track:scope.track||'BASELINE',runId,predecessorRunId,taskId,featureTitle,agentName,provider,model,repositoryId:scope.repositoryId,reportRef:REPORT_REF,workRef,baseline:{ref:scope.ref,commitSha:scope.baselineSha,handoffPath:scope.path,handoffDigest:scope.entryDigest,contextPaths:scope.contextPaths||[]},events:[{id:eventId,sequence:1,eventAt:new Date(now).toISOString(),kind:'started',summary,result:null}]},{scope,now});
}
