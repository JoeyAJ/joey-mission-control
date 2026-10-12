import {validateTaskReviewRecord,validateTaskReviewReply,verifyTaskReviewDigests} from './task-review-contract.mjs';
import {taskRequirementsStatus} from './task-requirements.mjs';
export function validateTaskHandoffReview(value,packet,{scopeAuthority=null,now=Date.now()}={}){
 if(value?.qualification!=='CURRENT_OWNER_TASK_REVIEW'||value.executionAuthorized!==false||!Number.isSafeInteger(value.expiresAt)||value.expiresAt<=now)throw Error('TASK_HANDOFF_REVIEW_UNCONFIRMED');
 const record=validateTaskReviewRecord(value.record,{scopeAuthority}),r=record.review,t=packet.developmentTask,source=packet.source,reports=packet.repositoryReports,row=reports?.runs?.find(row=>row.runId===r.runId);
 if(!t||r.projectId!==t.projectId||r.track!==t.track||r.taskId!==t.taskId||taskRequirementsStatus(r.taskRequirements,packet.taskRequirements)!=='MATCH'||r.repositoryId!==source?.repositoryId||r.canonicalRef!==source?.requestedRef||r.canonicalHeadSha!==source?.resolvedCommitSha||r.reportHeadSha!==reports?.source?.resolvedCommitSha||!row||row.taskId!==t.taskId||row.reportedState!=='completed'||row.source?.providerBlobId!==r.reportBlobId||row.source.path!==r.reportPath||row.latestCheckpoint?.sequence!==r.reportSequence||row.result?.codeSha!==r.codeSha||row.workRef!==r.workRef)throw Error('TASK_HANDOFF_REVIEW_UNCONFIRMED');
 return {...value,record};
}
export async function prepareTaskHandoffReview(packet,client,{scopeAuthority=null,now=Date.now,signal}={}){
 const request={action:'list',taskId:packet.developmentTask.taskId,afterSequence:0,pageLimit:50};
 const reply=await verifyTaskReviewDigests(validateTaskReviewReply(await client.list({taskId:request.taskId,afterSequence:0,pageLimit:50},{signal}),request,now(),{scopeAuthority}));
 for(const record of [...reply.records].reverse()){try{return validateTaskHandoffReview({qualification:'CURRENT_OWNER_TASK_REVIEW',record,expiresAt:reply.expiresAt,executionAuthorized:false},packet,{scopeAuthority,now:now()});}catch{/* Historical tuples stay historical, never current acceptance. */}}
 return null;
}
