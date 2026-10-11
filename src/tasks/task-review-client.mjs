import {taskReviewRequest,validateTaskReviewReply,verifyTaskReviewDigests,MAX_TASK_REVIEW_REPLY_BYTES,failTaskReview} from './task-review-contract.mjs';
export function createTaskReviewClient({getAccessToken,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin,now=Date.now}={}){
 if(globalThis.location?.origin&&origin!==globalThis.location.origin)throw Error('SAME_ORIGIN_TRANSPORT_REQUIRED');
 async function call(input,{signal}={}){
  const request=input?taskReviewRequest(input):null,token=await getAccessToken();if(typeof token!=='string'||!/^[A-Za-z0-9_.-]{20,8192}$/.test(token))throw failTaskReview('OWNER_REQUIRED',401);
  const r=await fetchImpl(new URL('/api/private/task-review-decisions',origin),{method:request?'POST':'GET',headers:{Authorization:'Bearer '+token,...(request?{'Content-Type':'application/json'}:{})},...(request?{body:JSON.stringify(request)}:{}),credentials:'same-origin',redirect:'error',cache:'no-store',signal});
  if(!r.ok){let code=r.status===409?'TASK_REVIEW_CONFLICT':r.status===403?'OWNER_DENIED':'TASK_REVIEW_UNCONFIRMED';try{let raw='',size=0;for await(const chunk of r.body){size+=chunk.length;if(size>4096)throw Error('LIMIT');raw+=new TextDecoder().decode(chunk);}if(JSON.parse(raw)?.error==='TASK_REVIEW_CAPACITY')code='TASK_REVIEW_CAPACITY';}catch{}throw failTaskReview(code,r.status);}
  let text='',bytes=0;const decoder=new TextDecoder('utf-8',{fatal:true});for await(const chunk of r.body){bytes+=chunk.length;if(bytes>MAX_TASK_REVIEW_REPLY_BYTES)throw failTaskReview('TASK_REVIEW_UNCONFIRMED',503);text+=decoder.decode(chunk,{stream:true});}const v=JSON.parse(text+decoder.decode());
  if(request)return verifyTaskReviewDigests(validateTaskReviewReply(v,request,now()));
  if(v?.schemaVersion!==1||v.qualification!=='OWNER_TASK_REVIEW_CAPABILITY'||typeof v.enabled!=='boolean'||v.executionAuthorized!==false||!Number.isSafeInteger(v.expiresAt)||v.expiresAt<=now()||v.expiresAt>now()+60000||Object.keys(v).length!==5)throw failTaskReview();return structuredClone(v);
 }
 return {capability:options=>call(null,options),list:(input,options)=>call({action:'list',...input},options),append:(input,options)=>call({action:'append',...input},options)};
}
