// Explicit metadata declarations, never content transport or an executor.
import {isStrictDateTime} from '../canonical/date-time.mjs';
export const REPORT_VERSION_V3='mc.repository-run.v3';
export const FILE_ACTIVITY_MODE='EXPLICIT_FILE_METADATA';
export const MAX_FILE_ACTIVITIES=8,MAX_ACTIVITY_FILE_BYTES=65536;
export const supportsDeliveryVersion=v=>['mc.repository-run.v2',REPORT_VERSION_V3].includes(v);
const digest=/^[a-f0-9]{64}$/,sha=/^[a-f0-9]{40}$/;
const fail=code=>{throw Object.assign(Error(code),{code});};
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k))||Object.values(Object.getOwnPropertyDescriptors(v)).some(d=>!('value'in d)))fail('RUN_REPORT_ACTIVITY_INVALID');}
export function safeActivityPath(value){
 if(typeof value!=='string'||value.length>160||!value||!/^[-A-Za-z0-9_./]+$/.test(value)||value.startsWith('/')||value.includes('..')||value.split('/').some(p=>!p||p.startsWith('.'))||!/(?:\.m?[jt]sx?|\.css|\.html|\.md|\.json|\.py)$/.test(value)||/(?:^|\/)(?:node_modules|vendor|dist|build|coverage|data|private|secrets?|credentials?|backups?)(?:\/|\.|$)|(?:^|\/)[^/]*(?:credential|password|secret|token|inventory|ledger|transcript|reasoning)[^/]*(?:\.|\/|$)/i.test(value))return false;
 return true;
}
export function validateActivityManifest(report){
 if(report.activityMode!==FILE_ACTIVITY_MODE||!Array.isArray(report.activityPaths)||!report.activityPaths.length||report.activityPaths.length>MAX_FILE_ACTIVITIES||new Set(report.activityPaths).size!==report.activityPaths.length||report.activityPaths.some(p=>!safeActivityPath(p)))fail('RUN_REPORT_ACTIVITY_MANIFEST_INVALID');
}
export function validateFileActivity(value,{report,event,priorEvents=[]}={}){
 if(value===null)return null;
 exact(value,['schemaVersion','qualification','scope','actor','action','path','contentSha256','previousContentSha256','byteLength','workHeadSha','observedAt','precision']);
 if(value.schemaVersion!=='mc.file-activity.v1'||value.qualification!=='AGENT_REPORTED_METADATA'||report.schemaVersion!==REPORT_VERSION_V3||event.kind!=='progress'||value.actor!==report.agentName||!report.activityPaths.includes(value.path)||!safeActivityPath(value.path)||typeof value.contentSha256!=='string'||!digest.test(value.contentSha256)||!Number.isSafeInteger(value.byteLength)||value.byteLength<0||value.byteLength>MAX_ACTIVITY_FILE_BYTES||typeof value.workHeadSha!=='string'||!sha.test(value.workHeadSha)||!isStrictDateTime(value.observedAt)||Date.parse(value.observedAt)>Date.parse(event.eventAt)||Date.parse(value.observedAt)<Date.parse(report.events[0].eventAt))fail('RUN_REPORT_ACTIVITY_INVALID');
 exact(value.scope,['projectId','track','repositoryId','runId','taskId','workRef']);for(const k of Object.keys(value.scope))if(value.scope[k]!==report[k])fail('RUN_REPORT_ACTIVITY_SCOPE_INVALID');
 const prior=priorEvents.filter(e=>e.activity?.path===value.path).at(-1)?.activity;
 const latest=priorEvents.filter(e=>e.activity).at(-1)?.activity;if(latest&&Date.parse(value.observedAt)<Date.parse(latest.observedAt))fail('RUN_REPORT_ACTIVITY_TIME_INVALID');
 if(value.action==='FILE_READ'){if(value.previousContentSha256!==null||value.precision!=='REPORTER_BOUNDED_READ')fail('RUN_REPORT_ACTIVITY_INVALID');}
 else if(value.action==='FILE_CHANGED'){if(value.precision!=='OBSERVED_DIGEST_CHANGE'||!prior||typeof value.previousContentSha256!=='string'||!digest.test(value.previousContentSha256)||value.previousContentSha256!==prior.contentSha256||value.contentSha256===prior.contentSha256)fail('RUN_REPORT_ACTIVITY_LINEAGE_INVALID');}
 else fail('RUN_REPORT_ACTIVITY_INVALID');
 return structuredClone(value);
}
