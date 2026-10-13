import {FIXED_DEPLOYMENT,canonical} from './task-closure-journal.mjs';
const fail=()=>{throw Object.assign(Error('PREVIEW_HANDOFF_REFERENCE_INVALID'),{code:'PREVIEW_HANDOFF_REFERENCE_INVALID'});};
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k)))fail();};
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
// Operator references for export only. No cloud journal mutation or provider grant.
export function validateUnmergedPreviewReferences(input,e){
 exact(input,['merge','deployment','verification']);
 if(input.merge!==null||!e.cloudConfirmed||!e.fresh||e.task?.projectId!=='MISSION_CONTROL'||e.task.track!=='BASELINE'||e.review?.decision!=='APPROVE')fail();
 const d=input.deployment;
 exact(d,['qualification','id','target','codeSha','reviewedCodeSha','taskId','taskRevision','requestDigest','reviewDecisionDigest','state']);
 if(d.qualification!=='UNVERIFIED_PROVIDER_RECEIPT_REFERENCE'||!same(d.target,FIXED_DEPLOYMENT)||!/^dpl_[A-Za-z0-9]+$/.test(d.id||'')||!sha(d.codeSha)||d.reviewedCodeSha!==e.codeSha||d.taskId!==e.task.taskId||d.taskRevision!==e.task.revision||d.requestDigest!==e.requirements?.requestDigest||d.reviewDecisionDigest!==e.review.decisionDigest||!['QUEUED','BUILDING','READY','ERROR'].includes(d.state))fail();
 if(input.verification!==null){const v=input.verification;exact(v,['qualification','status','deploymentId','codeSha','url']);if(v.qualification!=='UNVERIFIED_PROVIDER_RECEIPT_REFERENCE'||!['PASS','FAIL','BLOCKED'].includes(v.status)||v.deploymentId!==d.id||v.url!==FIXED_DEPLOYMENT.fixedUrl||(v.status==='PASS'?v.codeSha!==d.codeSha:v.codeSha!==null)||v.status==='PASS'&&d.state!=='READY')fail();}
 if(new TextEncoder().encode(JSON.stringify(input)).length>16384)fail();
 return {qualification:'OWNER_SUPPLIED_PREVIEW_REFERENCES_NOT_INDEPENDENTLY_VERIFIED',references:structuredClone(input),cloudSaved:false,mergeObserved:false,executionAuthorized:false,productAccepted:false};
}
