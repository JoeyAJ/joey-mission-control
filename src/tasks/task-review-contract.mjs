import {assertProjectScope} from '../projects/project-scope-authority.mjs';
// Private Owner acceptance records. No execution or provider verification authority.
import {validateTaskScope,canonicalTaskJson} from './development-task.mjs';
import {validateTaskRequirements} from './task-requirements.mjs';
import {hasSensitiveReconciliationLabel} from './task-reconciliation-label.mjs';
import {isStrictDateTime} from '../canonical/date-time.mjs';
import {MAX_EVENTS} from '../reporting/repository-run-contract.mjs';
import {browserContextDigest} from '../continuity/browser-context-digest.mjs';
export const TASK_REVIEW_VERSION='mc.owner-task-review.v1';
export const TASK_REVIEW_LIMITS=Object.freeze({perOwner:120,perTask:20,page:50,reviewBytes:16384,commentCharacters:2000,commentBytes:8192});
export const MAX_TASK_REVIEW_REQUEST_BYTES=TASK_REVIEW_LIMITS.reviewBytes+512;
export const MAX_TASK_REVIEW_REPLY_BYTES=(TASK_REVIEW_LIMITS.reviewBytes+512)*TASK_REVIEW_LIMITS.page+4096;
export const failTaskReview=(code='TASK_REVIEW_INVALID',status=400)=>Object.assign(Error(code),{code,status});
export function exactReviewKeys(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||Object.values(Object.getOwnPropertyDescriptors(v)).some(d=>!Object.hasOwn(d,'value')))throw failTaskReview();}
const bytes=s=>new TextEncoder().encode(s).length;
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(x);
const ref=x=>typeof x==='string'&&x.length<=255&&/^[-A-Za-z0-9_./]+$/.test(x)&&!x.includes('..')&&!x.startsWith('/')&&!x.startsWith('-')&&!x.endsWith('/')&&!x.includes('//');
const taskId=x=>typeof x==='string'&&/^task_[a-f0-9]{24}$/.test(x);
export const validReviewOperationId=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x)&&x!=='00000000-0000-0000-0000-000000000000';
export function validateTaskReview(v,{scopeAuthority=null}={}){
 exactReviewKeys(v,['schemaVersion','projectId','track','taskId','taskRequirements','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','reportSequence','runId','workRef','codeSha','decision','comment']);
 validateTaskScope(v.projectId,v.track,scopeAuthority);if(scopeAuthority){const c=assertProjectScope(scopeAuthority,v.projectId,v.track,'review');if(v.repositoryId!==c.repositoryId||v.canonicalRef!==c.ref)throw failTaskReview();}validateTaskRequirements(v.taskRequirements);
 if(v.schemaVersion!==TASK_REVIEW_VERSION||!taskId(v.taskId)||typeof v.repositoryId!=='string'||v.repositoryId.length>200||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(v.repositoryId)||!ref(v.canonicalRef)||!ref(v.workRef)||['canonicalHeadSha','reportHeadSha','reportBlobId','codeSha'].some(k=>!sha(v[k]))||v.reportRef!=='mc/progress'||!id(v.runId)||![`.mission-control/runs/${v.runId}.json`,`.mission-control/runs-page-2/${v.runId}.json`].includes(v.reportPath)||!Number.isSafeInteger(v.reportSequence)||v.reportSequence<2||v.reportSequence>MAX_EVENTS||!['APPROVE','REQUEST_CHANGES'].includes(v.decision)||typeof v.comment!=='string'||v.comment.length>TASK_REVIEW_LIMITS.commentCharacters||bytes(v.comment)>TASK_REVIEW_LIMITS.commentBytes||[...v.comment].some(c=>c.codePointAt(0)>=0xd800&&c.codePointAt(0)<=0xdfff)||hasSensitiveReconciliationLabel(v.comment.replace(/[\n\r\t]/g,' '))||/(?:\b[a-z]{2,12}:\/\/|\b(?:javascript|data|file):)/i.test(v.comment)||bytes(canonicalTaskJson(v))>TASK_REVIEW_LIMITS.reviewBytes)throw failTaskReview();
 return structuredClone(v);
}
export function taskReviewRequest(v){
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||!Object.hasOwn(Object.getOwnPropertyDescriptor(v,'action')||{},'value'))throw failTaskReview();
 if(v?.action==='list'){exactReviewKeys(v,['action','taskId','afterSequence','pageLimit']);if(!taskId(v.taskId)||!Number.isSafeInteger(v.afterSequence)||v.afterSequence<0||v.afterSequence>TASK_REVIEW_LIMITS.perTask||!Number.isSafeInteger(v.pageLimit)||v.pageLimit<1||v.pageLimit>TASK_REVIEW_LIMITS.page)throw failTaskReview();return structuredClone(v);}
 exactReviewKeys(v,['action','review','operationId','expectedSequence']);if(v.action!=='append'||!validReviewOperationId(v.operationId)||!Number.isSafeInteger(v.expectedSequence)||v.expectedSequence<0||v.expectedSequence>TASK_REVIEW_LIMITS.perTask)throw failTaskReview();return {...v,review:validateTaskReview(v.review)};
}
export function validateTaskReviewRecord(v){
 exactReviewKeys(v,['sequence','operationId','decisionDigest','committedAt','review']);if(!Number.isSafeInteger(v.sequence)||v.sequence<1||v.sequence>TASK_REVIEW_LIMITS.perTask||!validReviewOperationId(v.operationId)||typeof v.decisionDigest!=='string'||!/^[a-f0-9]{64}$/.test(v.decisionDigest)||!isStrictDateTime(v.committedAt)||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.committedAt))throw failTaskReview();return {...v,review:validateTaskReview(v.review)};
}
export function validateTaskReviewRpcReply(v,request){
 const r=taskReviewRequest(request);exactReviewKeys(v,r.action==='list'?['schemaVersion','qualification','taskId','afterSequence','sequence','records','executionAuthorized']:['schemaVersion','qualification','record','executionAuthorized']);
 if(v.schemaVersion!==1||v.qualification!=='OWNER_TASK_REVIEW_RECORDED'||v.executionAuthorized!==false)throw failTaskReview();
 if(r.action==='append'){const record=validateTaskReviewRecord(v.record);if(record.sequence!==r.expectedSequence+1||record.operationId!==r.operationId||canonicalTaskJson(record.review)!==canonicalTaskJson(r.review))throw failTaskReview();return {...v,record};}
 if(v.taskId!==r.taskId||v.afterSequence!==r.afterSequence||!Number.isSafeInteger(v.sequence)||v.sequence<0||v.sequence>TASK_REVIEW_LIMITS.perTask||v.afterSequence>v.sequence||!Array.isArray(v.records)||v.records.length>r.pageLimit||v.records.length!==Math.min(r.pageLimit,v.sequence-r.afterSequence))throw failTaskReview();
 const records=v.records.map(validateTaskReviewRecord);if(records.some((row,i)=>row.sequence!==r.afterSequence+i+1||row.review.taskId!==r.taskId)||new Set(records.map(x=>x.operationId)).size!==records.length)throw failTaskReview();return {...v,records};
}
export function validateTaskReviewReply(v,request,now=Date.now()){
 const r=taskReviewRequest(request);exactReviewKeys(v,[...(r.action==='list'?['schemaVersion','qualification','taskId','afterSequence','sequence','records','executionAuthorized']:['schemaVersion','qualification','record','executionAuthorized']),'expiresAt']);const expiry=v.expiresAt;if(!Number.isSafeInteger(expiry)||expiry<=now||expiry>now+60000||bytes(JSON.stringify(v))>MAX_TASK_REVIEW_REPLY_BYTES)throw failTaskReview('TASK_REVIEW_UNCONFIRMED',503);const {expiresAt,...rpc}=v;return {...validateTaskReviewRpcReply(rpc,r),expiresAt};
}
export async function verifyTaskReviewDigests(reply){for(const record of reply.records||[reply.record])if(record.decisionDigest!==await browserContextDigest(record.review))throw failTaskReview('TASK_REVIEW_UNCONFIRMED',503);return reply;}
export function sameTaskReviewBinding(a,b){const strip=x=>{const {decision,comment,...binding}=validateTaskReview(x);return binding;};return canonicalTaskJson(strip(a))===canonicalTaskJson(strip(b));}
