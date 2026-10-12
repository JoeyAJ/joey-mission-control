import {validateDevelopmentTask} from './development-task.mjs';
import {createTaskRequirements,taskRequirementsStatus} from './task-requirements.mjs';
import {validateTaskReviewRecord} from './task-review-contract.mjs';
import {browserContextDigest} from '../continuity/browser-context-digest.mjs';

export function assertTaskReworkLease(lease,now=Date.now()) {
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(lease?.reviewExpiresAt)||!Number.isSafeInteger(lease?.inspectionExpiresAt)||lease.reviewExpiresAt<=now||lease.inspectionExpiresAt<=now)throw Error('TASK_REWORK_EXPIRED');
 return true;
}
export function captureTaskReworkLease({reviewExpiresAt,inspectionExpiresAt}={},now=Date.now()) {
 const lease={reviewExpiresAt,inspectionExpiresAt};assertTaskReworkLease(lease,now);return Object.freeze(lease);
}

// An explicit local edit from a recorded Owner opinion; never an execution grant.
export async function taskReviewReworkInput({task,record,scopeAuthority=null}={}) {
 const t=validateDevelopmentTask(task,{scopeAuthority}),r=validateTaskReviewRecord(record,{scopeAuthority}),review=r.review;
 if(review.decision!=='REQUEST_CHANGES'||!review.comment.trim())throw Error('TASK_REWORK_COMMENT_REQUIRED');
 if(review.projectId!==t.projectId||review.track!==t.track||review.taskId!==t.taskId||taskRequirementsStatus(review.taskRequirements,await createTaskRequirements(t,{scopeAuthority}))!=='MATCH')throw Error('TASK_REWORK_CURRENT_REQUIREMENTS_REQUIRED');
 if(await browserContextDigest(review)!==r.decisionDigest)throw Error('TASK_REWORK_REVIEW_DIGEST_INVALID');
 const note='Owner requested changes · '+r.committedAt+' · review '+r.sequence+' · operation '+r.operationId+'\n'+review.comment;
 const request={...t.request,constraints:(t.request.constraints?t.request.constraints+'\n\n':'')+note};
 if(request.constraints.length>6000)throw Error('TASK_REWORK_CONSTRAINTS_CAPACITY');
 validateDevelopmentTask({...t,request},{scopeAuthority});
 return request;
}
