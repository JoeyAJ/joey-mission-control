// Candidate-only observer. No model/daemon/network execution or canonical writer.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {JsonStore} from '../../src/storage/json-store.mjs';
import {emptyReportState,restoreReportState,reduceExecutionReport,inspectExecutionReports} from './execution-report.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const hash=v=>createHash('sha256').update(v).digest('hex');
const qualifications=['SYNTHETIC_FIXTURE','UNVERIFIED_IMPORTED_JSONL'];
const eventKinds={'thread.started':'started','turn.started':'progress','item.started':'progress','item.updated':'progress','item.completed':'progress','turn.completed':'completed','turn.failed':'failed','error':'failed'};
export const candidateObserverContext={projectId:'MISSION_CONTROL',missionId:'mc-candidate-development-8b478',baselineSha:'8b478f0d8c017defdd2a5f5dab92ea9972479c78',sourceId:'mc-candidate-observer',sourceRevision:'8b478f0d8c017defdd2a5f5dab92ea9972479c78',sessions:[{bindingId:'candidate-input-not-verified',sessionId:'candidate-session-1'},{bindingId:'candidate-input-not-verified',sessionId:'candidate-session-2'}],evidenceIds:[],maxAgeMs:60000,maxValidityMs:60000,maxEvents:1000};
// Mission is this approved MC candidate task, displayed in the global workspace; it does not create/promote an owner mission or canonical record.
export async function createCandidateObserver({root,context=candidateObserverContext,qualification='UNVERIFIED_IMPORTED_JSONL'}){
 if(!qualifications.includes(qualification))throw Error('Unsupported source qualification');
 if(!path.isAbsolute(root)||path.resolve(root)!==root||!['/workspace','/tmp'].includes(path.dirname(root))||!/^mc-observer-candidate(?:-|$)/.test(path.basename(root)))throw Error('Explicit isolated candidate root required');
 restoreReportState(emptyReportState(),context);context=structuredClone(context);
 const relative=path.relative(repo,root);if(!relative.startsWith('..'+path.sep)&&relative!=='..')throw Error('Candidate data must remain outside product repo');
 if(await fs.realpath(path.dirname(root))!==path.dirname(root))throw Error('Candidate parent symlink rejected');
 try{if((await fs.lstat(root)).isSymbolicLink())throw Error('Candidate symlink root rejected');}catch(e){if(e.code!=='ENOENT')throw e;}
 await fs.mkdir(root,{recursive:true,mode:0o700});if(await fs.realpath(root)!==root)throw Error('Candidate symlink root rejected');
 const name='execution-reports.v1.json';for(const f of await fs.readdir(root))if(f!==name&&!f.startsWith(name+'.'))throw Error('Existing non-observer data root rejected');
 const bindingHash=hash(JSON.stringify({context,qualification}));
 const validate=data=>Array.isArray(data)&&data.length===1&&(data[0]?.version===1&&data[0]?.bindingHash===bindingHash&&data[0]?.qualification===qualification&&Array.isArray(data[0]?.observations));
 class CandidateStore extends JsonStore{async read(){return this.readOnly();}}
 const store=new CandidateStore(root,name,validate);
 const noWrite=()=>{throw Object.assign(new Error('No write'),{code:'NO_WRITE'});};
 function verify(record){
  if(!record)return {version:1,bindingHash,qualification,state:emptyReportState(),observations:[]};
  restoreReportState(record.state,context);
  if(Object.keys(record).sort().join('|')!=='bindingHash|observations|qualification|state|version'||record.observations.length!==record.state.revision)throw Error('Observer receipt mismatch');
  for(const [i,o]of record.observations.entries())if(Object.keys(o).sort().join('|')!=='deliverySequence|inputHash|sourceEventTime|standardType|timeBasis'||o.deliverySequence!==i+1||!/^[a-f0-9]{64}$/.test(o.inputHash)||!eventKinds[o.standardType]||o.sourceEventTime!==null||o.timeBasis!=='OBSERVER_RECEIVED_TIME_NOT_SOURCE_EVENT'||record.state.history[i].report.kind!==eventKinds[o.standardType])throw Error('Observer receipt mismatch');
  return record;
 }
 return {
  async ingest({line,deliverySequence,sessionId,expectedRevision,receivedAt}){
   if(typeof line!=='string'||Buffer.byteLength(line)>65536||!Number.isSafeInteger(deliverySequence)||deliverySequence<1)return {accepted:false,error:'INVALID_INPUT'};
   let e;try{e=JSON.parse(line);}catch{return {accepted:false,error:'INVALID_JSON'};}
   if(!e||typeof e!=='object'||typeof e.type!=='string'||!Object.hasOwn(eventKinds,e.type)||!context.sessions.some(s=>s.sessionId===sessionId))return {accepted:false,error:'UNSUPPORTED_EVENT_OR_SESSION'};
   if(e.type==='thread.started'&&e.thread_id!==sessionId)return {accepted:false,error:'THREAD_BINDING_MISMATCH'};
   let result;
   // All receipt/revision/dedupe checks and state mutation happen inside one
   // existing store lock, with atomic replacement. Never persist raw JSONL.
   try{await store.update(data=>{
    const previous=verify(data[0]),digest=hash(line),old=previous.observations[deliverySequence-1];
    if(old){if(old.inputHash!==digest||previous.state.history[deliverySequence-1].report.sessionId!==sessionId){result={accepted:false,error:'DELIVERY_CONFLICT'};noWrite();}result={accepted:true,duplicate:true,revision:previous.state.revision};noWrite();}
    if(deliverySequence!==previous.state.revision+1){result={accepted:false,error:'DELIVERY_SEQUENCE_CONFLICT'};noWrite();}
    const session=context.sessions.find(s=>s.sessionId===sessionId),prior=previous.state.history.filter(h=>h.report.sessionId===sessionId).at(-1);
    const report={schemaVersion:'mc.execution-report.v1',eventId:'delivery-'+deliverySequence,projectId:context.projectId,missionId:context.missionId,baselineSha:context.baselineSha,sourceId:context.sourceId,sourceRevision:context.sourceRevision,bindingId:session.bindingId,sessionId,sequence:(prior?.report.sequence||0)+1,expectedRevision,eventAt:receivedAt,issuedAt:receivedAt,expiresAt:new Date(Date.parse(receivedAt)+context.maxValidityMs).toISOString(),kind:eventKinds[e.type],model:null,evidenceId:null};
    const reduced=reduceExecutionReport(previous.state,report,context,receivedAt);if(!reduced.accepted){result={accepted:false,error:reduced.error};noWrite();}
    result={accepted:true,duplicate:false,revision:reduced.state.revision};return [{...previous,state:reduced.state,observations:[...previous.observations,{deliverySequence,inputHash:digest,standardType:e.type,sourceEventTime:null,timeBasis:'OBSERVER_RECEIVED_TIME_NOT_SOURCE_EVENT'}]}];
   });return result;}catch(e){return e.code==='NO_WRITE'?result:{accepted:false,error:'OBSERVER_PERSISTENCE_OR_INTEGRITY_FAILURE'};}
  },
  async inspect(readAt){const record=verify((await store.readOnly())[0]),view=inspectExecutionReports(record.state,context,readAt);return {...view,qualification,testOnly:qualification==='SYNTHETIC_FIXTURE',platformEventSource:'NOT_CONNECTED',history:view.history.map((h,i)=>({...h,...record.observations[i],qualification})),context:structuredClone(context)};}
 };
}
