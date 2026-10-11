import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {createCurrentOwnerVerifier} from '../continuity/remote-handoff-server.mjs';
import {taskReviewActivation,taskReviewEnabled} from './task-review-config.mjs';
import {taskReviewRequest,validateTaskReviewRpcReply,verifyTaskReviewDigests,sameTaskReviewBinding,failTaskReview as fail,MAX_TASK_REVIEW_REQUEST_BYTES,MAX_TASK_REVIEW_REPLY_BYTES} from './task-review-contract.mjs';
import {createTaskRpcPort} from './task-storage-server.mjs';
import {createTaskRequirements,taskRequirementsStatus} from './task-requirements.mjs';
import {canonicalTaskJson} from './development-task.mjs';
import {createGitHubRepositoryRunReader} from '../reporting/repository-run-server.mjs';
import {repositoryRunConfiguration,readRepositoryRuns} from '../reporting/repository-run-source.mjs';
import {createGitHubTaskReconciliationReader,createTaskReconciliationServer} from './task-reconciliation-server.mjs';
import {RECONCILIATION_VERSION} from './task-reconciliation-contract.mjs';
async function boundedJson(response,limit){let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)throw fail('TASK_REVIEW_UNCONFIRMED',503);text+=decoder.decode(chunk,{stream:true});}return JSON.parse(text+decoder.decode());}
export function createTaskReviewRpcPort({fetchImpl=globalThis.fetch,policy=ownerAuthConfig}={}){
 if(policy.origin!==ownerAuthConfig.origin||policy.publishableKey!==ownerAuthConfig.publishableKey)throw fail('FIXED_TASK_PROVIDER_REQUIRED');
 return {async call(input,token,{signal}={}){
  const r=taskReviewRequest(input),payload=r.action==='list'?{task_id:r.taskId,after_sequence:r.afterSequence,page_limit:r.pageLimit}:{review:r.review,operation_id:r.operationId,expected_sequence:r.expectedSequence},abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,8000);
  try{const response=await fetchImpl(policy.origin+'/rest/v1/rpc/mc_owner_task_review_'+r.action,{method:'POST',headers:{apikey:policy.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal,redirect:'error',cache:'no-store'}),value=await boundedJson(response,response.ok?MAX_TASK_REVIEW_REPLY_BYTES:4096);
   if(!response.ok){if(response.status===401||response.status===403||value?.code==='42501')throw fail('OWNER_DENIED',403);if(['40001','54000'].includes(value?.code))throw fail(value.code==='54000'?'TASK_REVIEW_CAPACITY':'TASK_REVIEW_CONFLICT',409);if(value?.code==='22023')throw fail();throw fail('TASK_REVIEW_UNCONFIRMED',503);}
   return verifyTaskReviewDigests(validateTaskReviewRpcReply(value,r));
  }catch(e){if(e.code)throw e;throw fail('TASK_REVIEW_UNCONFIRMED',503);}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }};
}
async function body(req){
 if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers?.['content-type']||''))throw fail('JSON_BODY_REQUIRED',415);
 if(req.headers?.['content-length']&&(!/^\d+$/.test(req.headers['content-length'])||Number(req.headers['content-length'])>MAX_TASK_REVIEW_REQUEST_BYTES))throw fail('TASK_REVIEW_BODY_TOO_LARGE',413);
 let raw;if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{raw='';let count=0;for await(const chunk of req){count+=Buffer.byteLength(chunk);if(count>MAX_TASK_REVIEW_REQUEST_BYTES)throw fail('TASK_REVIEW_BODY_TOO_LARGE',413);raw+=chunk;}}
 if(Buffer.byteLength(raw)>MAX_TASK_REVIEW_REQUEST_BYTES)throw fail('TASK_REVIEW_BODY_TOO_LARGE',413);return taskReviewRequest(JSON.parse(raw));
}
export function createTaskReviewServer({activation=taskReviewActivation,verifyOwner,port,freshEvidence,ownerSubject=ownerAuthConfig.ownerSubject,allowedOrigin=ownerAuthConfig.stageOrigin,now=Date.now}={}){
 const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store',Vary:'Authorization',Pragma:'no-cache'}}),valid=a=>a?.subject===ownerSubject&&a.role==='OWNER'&&a.aal==='aal2'&&a.verified===true&&a.sessionActive===true&&a.identityProject==='NEXAEON'&&Number.isSafeInteger(a.expiresAt)&&a.expiresAt>now();
 return {async handle(req,{signal}={}){
  if(!['GET','POST'].includes(req.method))return result(405,{error:'TASK_REVIEW_METHOD_DENIED'});
  if(req.headers?.origin&&req.headers.origin!==allowedOrigin||req.headers?.['sec-fetch-site']==='cross-site'||req.method==='POST'&&req.headers?.origin!==allowedOrigin)return result(403,{error:'ORIGIN_DENIED'});
  if(req.method==='POST'&&!taskReviewEnabled(activation))return result(503,{error:'TASK_REVIEW_NOT_ACTIVATED'});
  const token=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_AUTHENTICATION_REQUIRED'});let attempted=false;
  try{
   const before=await verifyOwner(token,{signal});if(!valid(before))throw fail('OWNER_DENIED',403);
   if(req.method==='GET'){const after=await verifyOwner(token,{signal});if(!valid(after)||before.subject!==after.subject||signal?.aborted)throw fail('OWNER_DENIED',403);return result(200,{schemaVersion:1,qualification:'OWNER_TASK_REVIEW_CAPABILITY',enabled:taskReviewEnabled(activation),executionAuthorized:false,expiresAt:Math.min(before.expiresAt,after.expiresAt,now()+60000)});}
   const request=await body(req);let witness=null;
   if(request.action==='append'){witness=await freshEvidence(request.review,token,{signal});if(!witness||!sameTaskReviewBinding(witness.review,request.review)||witness.ci?.executionAuthorized!==false||witness.ci.binding.taskRevisionQualification!=='EXACT_TASK_REQUIREMENTS_MATCH'||witness.ci.binding.workHeadQualification!=='EXACT_REPORTED_COMMIT'||witness.ci.expiresAt<=now())throw fail('TASK_REVIEW_SOURCE_CHANGED',409);}
   const atWrite=await verifyOwner(token,{signal});if(!valid(atWrite)||atWrite.subject!==before.subject||signal?.aborted)throw fail('OWNER_DENIED',403);
   attempted=request.action==='append';const reply=await verifyTaskReviewDigests(validateTaskReviewRpcReply(await port.call(request,token,{signal}),request));
   if(witness){const afterWitness=await freshEvidence(request.review,token,{signal});if(!afterWitness||!sameTaskReviewBinding(afterWitness.review,request.review)||afterWitness.ci?.expiresAt<=now()||canonicalTaskJson(afterWitness.ci.binding)!==canonicalTaskJson(witness.ci.binding)||canonicalTaskJson(afterWitness.ci.channels)!==canonicalTaskJson(witness.ci.channels))throw fail('TASK_REVIEW_WRITE_UNCONFIRMED',409);}
   const after=await verifyOwner(token,{signal});if(!valid(after)||after.subject!==before.subject||signal?.aborted)throw fail('OWNER_DENIED',403);return result(200,{...reply,expiresAt:Math.min(before.expiresAt,atWrite.expiresAt,after.expiresAt,now()+60000)});
  }catch(e){const status=[400,401,403,409,413,415].includes(e.status)?e.status:e instanceof SyntaxError?400:503;return result(status,{error:status===403?'OWNER_DENIED':status===409?(e.code==='TASK_REVIEW_CAPACITY'?'TASK_REVIEW_CAPACITY':attempted?'TASK_REVIEW_WRITE_UNCONFIRMED':'TASK_REVIEW_CONFLICT'):status>=500?(attempted?'TASK_REVIEW_WRITE_UNCONFIRMED':'TASK_REVIEW_UNCONFIRMED'):'TASK_REVIEW_INVALID'});}
 }};
}
export function createDeploymentTaskReviewServer({environment=process.env,fetchImpl=globalThis.fetch,policy=ownerAuthConfig,activation=taskReviewActivation,now=Date.now}={}){
 const verifyOwner=createCurrentOwnerVerifier({fetchImpl,policy,now}),taskPort=createTaskRpcPort({fetchImpl,policy});
 const freshEvidence=async(review,token,{signal}={})=>{
  const c=repositoryRunConfiguration(review.projectId,{track:review.track});if(c.repositoryId!==review.repositoryId||c.entry.ref!==review.canonicalRef||c.reportRef!==review.reportRef)throw fail('TASK_REVIEW_SCOPE_DENIED',403);
  const task=async()=>{const list=await taskPort.call('list',null,token,{signal}),t=list.tasks.find(t=>t.taskId===review.taskId);if(!t||t.projectId!==review.projectId||t.track!==review.track||taskRequirementsStatus(review.taskRequirements,await createTaskRequirements(t))!=='MATCH')throw fail('TASK_REVIEW_REQUIREMENTS_CHANGED',409);};await task();
  const reader=createGitHubRepositoryRunReader({credential:environment.MC_GITHUB_READ_TOKEN,fetchImpl,configuration:c,now}),reports=await readRepositoryRuns({configuration:c,reader,signal,now});if(reports.status!=='FOUND'||reports.inventory?.truncated!==false)throw fail('TASK_REVIEW_REPORT_UNAVAILABLE',503);
  const rows=reports.runs.filter(r=>r.report.runId===review.runId&&r.report.taskId===review.taskId),row=rows[0],event=row?.report.events.at(-1);
  if(rows.length!==1||event?.kind!=='completed'||event.result?.codeSha!==review.codeSha||event.sequence!==review.reportSequence||row.report.workRef!==review.workRef||row.source.path!==review.reportPath||row.source.providerBlobId!==review.reportBlobId||reports.source.resolvedCommitSha!==review.reportHeadSha||taskRequirementsStatus(row.report.taskRequirements,review.taskRequirements)!=='MATCH')throw fail('TASK_REVIEW_REPORT_CHANGED',409);
  const server=createTaskReconciliationServer({configuration:c,repositoryReader:reader,metadataReader:createGitHubTaskReconciliationReader({credential:environment.MC_GITHUB_READ_TOKEN,fetchImpl,configuration:c}),verifyOwner,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}),request={schemaVersion:RECONCILIATION_VERSION,projectId:review.projectId,track:review.track,taskId:review.taskId,taskRevision:review.taskRequirements.revision,taskRequirements:review.taskRequirements,runId:review.runId};
  const response=await server.handle({method:'POST',headers:{origin:policy.stageOrigin,authorization:'Bearer '+token},body:request},{signal});if(response.status!==200)throw fail('TASK_REVIEW_SOURCE_UNCONFIRMED',response.status===403?403:409);const ci=response.body;
  if(['repositoryId','canonicalRef','canonicalHeadSha','reportHeadSha','reportBlobId','reportSequence','workRef','codeSha'].some(k=>ci.binding[k]!==review[k])||ci.binding.taskRevisionQualification!=='EXACT_TASK_REQUIREMENTS_MATCH'||ci.binding.workHeadQualification!=='EXACT_REPORTED_COMMIT')throw fail('TASK_REVIEW_SOURCE_CHANGED',409);await task();return {review,ci};
 };
 return createTaskReviewServer({activation,verifyOwner,port:taskReviewEnabled(activation)?createTaskReviewRpcPort({fetchImpl,policy}):null,freshEvidence,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now});
}
