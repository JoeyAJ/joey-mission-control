// Generic offline bootstrap review. No ambient sources, network, SQL or authority.
import {continuityDigest} from '../../docs/contracts/private-continuity.mjs';
const plans=new WeakSet();
const fail=code=>{throw Error(code);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
function compatible(v){
 if(typeof v==='number'&&!Number.isSafeInteger(v))fail('IMPORT_INTEGER_REQUIRED');
 if(typeof v==='string'&&(v.includes('\u0000')||!v.isWellFormed()))fail('IMPORT_TEXT_REQUIRED');
 if(v&&typeof v==='object')for(const [key,x]of Object.entries(v)){if(!/^[\x20-\x7e]*$/.test(key))fail('IMPORT_ASCII_KEYS_REQUIRED');compatible(x);}
}
function upperBytes(v){let tokens=0;const visit=x=>{if(x&&typeof x==='object'){tokens+=Object.keys(x).length*2;Object.values(x).forEach(visit);}};visit(v);return Buffer.byteLength(JSON.stringify(v))+tokens;}

export function prepareReadonlyImport({entries,custodyDigest,readAt}){
 // Validate accessors/proxies before reading any caller-controlled field.
 continuityDigest({entries,custodyDigest,readAt});
 if(!/^[a-f0-9]{64}$/.test(custodyDigest)||!Number.isFinite(Date.parse(readAt))||!Array.isArray(entries)||!entries.length||entries.length>32)fail('IMPORT_SCOPE');
 if(new Set(entries.map(e=>e.projectId)).size!==entries.length)fail('IMPORT_DUPLICATE_PROJECT');
 const contexts=entries.map(e=>{
  if(Object.keys(e).length!==3||!Object.hasOwn(e,'projectId')||!Object.hasOwn(e,'baselineSha')||!Object.hasOwn(e,'filteredClaims')||!/^[A-Za-z0-9_-]{1,80}$/.test(e.projectId)||!/^[a-f0-9]{40}$/.test(e.baselineSha)||!e.filteredClaims||Array.isArray(e.filteredClaims)||typeof e.filteredClaims!=='object')fail('IMPORT_ENTRY');
  compatible(e.filteredClaims);const bytes=upperBytes(e.filteredClaims);if(bytes>65536)fail('IMPORT_CONTEXT_CAPACITY');
  return {projectId:e.projectId,baselineSha:e.baselineSha,contextHash:continuityDigest(e.filteredClaims),filteredClaims:structuredClone(e.filteredClaims),jsonbBytesUpperBound:bytes};
 }).sort((a,b)=>a.projectId.localeCompare(b.projectId,'en'));
 const identity={custodyDigest,contexts:contexts.map(c=>({projectId:c.projectId,baselineSha:c.baselineSha,contextHash:c.contextHash})),membershipRows:0,eventRows:0,writesEnabled:false};
 const importId=continuityDigest(identity),epoch='import_'+importId.slice(0,32);
 const heads=contexts.map(c=>({projectId:c.projectId,baselineSha:c.baselineSha,epoch,revision:0,usedBytes:0,lastCommittedAt:0,writesEnabled:false,backupVerifiedRevision:0}));
 const budgetUpperBound=contexts.reduce((n,c)=>n+c.jsonbBytesUpperBound+512,0);if(budgetUpperBound>104857600)fail('IMPORT_SHARED_CAPACITY');
 const summary={status:'OFFLINE_PENDING_SEPARATE_APPROVAL',projectCount:contexts.length,headRows:heads.length,contextRows:contexts.length,budgetRows:1,newRows:heads.length+contexts.length+1,membershipRows:0,eventRows:0,checkpointRows:0,budgetUpperBound,
  privatePayloadIncluded:false,sourceMetadataIncluded:false,writerEnabled:false,readAccessEnabled:false,sqlExecuted:false};
 const plan=freeze({importId,epoch,readAt,identity,heads,contexts,budget:{singleton:true,eventCount:0,usedBytes:0},summary});plans.add(plan);return plan;
}
function validated(plan){if(!plans.has(plan))fail('IMPORT_UNVALIDATED_PLAN');}
export function assessReadonlyImport(plan,observed){
 validated(plan);continuityDigest(observed);
 if(!observed||!['heads','contexts','members','events','checkpoints'].every(k=>Array.isArray(observed[k]))||!Object.hasOwn(observed,'budget'))fail('IMPORT_OBSERVATION');
 if(observed.members.length||observed.events.length||observed.checkpoints.length)fail('IMPORT_EXISTING_AUTHORITY_OR_HISTORY');
 if(!observed.heads.length&&!observed.contexts.length&&observed.budget===null)return {status:'EMPTY_REQUIRES_IMPORT_APPROVAL',newRows:plan.summary.newRows};
 if(observed.heads.length!==plan.heads.length||observed.contexts.length!==plan.contexts.length||new Set(observed.heads.map(h=>h.projectId)).size!==plan.heads.length||new Set(observed.contexts.map(c=>c.projectId)).size!==plan.contexts.length||observed.budget?.singleton!==true||observed.budget.eventCount!==0)fail('IMPORT_PARTIAL_OR_CONFLICTING_STATE');
 for(const expected of plan.heads){const h=observed.heads.find(h=>h.projectId===expected.projectId);if(!h||Object.keys(expected).some(k=>h[k]!==expected[k]))fail('IMPORT_HEAD_CHANGED');}
 let charges=0;
 for(const expected of plan.contexts){const c=observed.contexts.find(c=>c.projectId===expected.projectId);
  if(!c||c.contextHash!==expected.contextHash||continuityDigest(c.filteredClaims)!==expected.contextHash||!Number.isSafeInteger(c.postgresBytes)||c.postgresBytes<Buffer.byteLength(JSON.stringify(c.filteredClaims))||c.postgresBytes>expected.jsonbBytesUpperBound)fail('IMPORT_CONTEXT_CHANGED');charges+=c.postgresBytes+512;
 }
 if(observed.budget.usedBytes!==charges)fail('IMPORT_BUDGET_CHANGED');return {status:'EXACT_IMPORTED_NOOP',newRows:0,contextCharges:charges};
}
export function reviewReadonlyImportRollback(plan,observed){
 const match=assessReadonlyImport(plan,observed);if(match.status!=='EXACT_IMPORTED_NOOP')fail('IMPORT_ROLLBACK_NOT_EXACT');
 return {status:'EXACT_REMOVAL_REQUIRES_SEPARATE_APPROVAL',rowsToRemove:plan.summary.newRows,budgetBytesToRelease:match.contextCharges,sourceCustodyPreserved:true,removeExistingHistory:false,changeAuth:false,changePrivileges:false};
}
