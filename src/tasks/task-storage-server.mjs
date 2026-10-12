// Existing Owner task specification transport; no execution queue or new source grant.
import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {createCurrentOwnerVerifier} from '../continuity/remote-handoff-server.mjs';
import {taskStorageActivation,taskStorageEnabled} from './task-storage-config.mjs';
import {MAX_TASK_REQUEST_BYTES,MAX_TASK_LIST_BYTES,taskStorageRequest,validateTaskRpcReply} from './task-storage-contract.mjs';
const error=(code,status=503)=>Object.assign(Error(code),{code,status});
async function boundedJson(response,limit){let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)throw error('TASK_STORAGE_UNAVAILABLE');text+=decoder.decode(chunk,{stream:true});}return JSON.parse(text+decoder.decode());}
export function createTaskRpcPort({fetchImpl=globalThis.fetch,policy=ownerAuthConfig,scopeAuthority=null,projectId=null}={}){
 if(policy.origin!==ownerAuthConfig.origin||policy.publishableKey!==ownerAuthConfig.publishableKey)throw error('FIXED_TASK_PROVIDER_REQUIRED');
 return {async call(action,request,token,{signal}={}){
  if(!['list','save'].includes(action))throw error('TASK_ACTION_DENIED',400);
  const payload=action==='list'?{}:{task:request.task,expected_revision:request.expectedRevision};
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,8000);
  try{const r=await fetchImpl(policy.origin+'/rest/v1/rpc/mc_owner_development_task_'+action,{method:'POST',headers:{apikey:policy.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal,redirect:'error',cache:'no-store'});const data=await boundedJson(r,r.ok?MAX_TASK_LIST_BYTES:4096);
   if(!r.ok){if(data?.code==='40001')throw error('TASK_REVISION_CONFLICT',409);if(r.status===401||r.status===403||data?.code==='42501')throw error('OWNER_AUTHORIZATION_DENIED',403);throw error('TASK_STORAGE_UNAVAILABLE');}
   return validateTaskRpcReply(action,data,request,{scopeAuthority,projectId});
  }catch(e){if(e.code)throw e;throw error('TASK_STORAGE_UNAVAILABLE');}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }};
}
async function requestBody(req){
 if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers?.['content-type']||''))throw error('JSON_BODY_REQUIRED',415);
 if(req.headers?.['content-length']&&(!/^\d+$/.test(req.headers['content-length'])||Number(req.headers['content-length'])>MAX_TASK_REQUEST_BYTES))throw error('TASK_BODY_TOO_LARGE',413);
 if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>MAX_TASK_REQUEST_BYTES)throw error('TASK_BODY_TOO_LARGE',413);return JSON.parse(raw);}
 let body='',bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>MAX_TASK_REQUEST_BYTES)throw error('TASK_BODY_TOO_LARGE',413);body+=chunk;}return JSON.parse(body);
}
export function createTaskStorageServer({activation=taskStorageActivation,verifyOwner,port,ownerSubject=ownerAuthConfig.ownerSubject,allowedOrigin=ownerAuthConfig.stageOrigin,now=Date.now,scopeAuthority=null,projectId=null}={}){
 const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store',Vary:'Authorization',Pragma:'no-cache'}});
 const valid=a=>a?.subject===ownerSubject&&a.role==='OWNER'&&a.aal==='aal2'&&a.verified===true&&a.sessionActive===true&&Number.isSafeInteger(a.expiresAt)&&a.expiresAt>now();
 return {async handle(req,{signal}={}){
  const action={GET:'list',POST:'save'}[req.method];if(!action)return result(405,{error:'TASK_METHOD_DENIED'});
  if(action==='save'&&!taskStorageEnabled(activation))return result(503,{error:'TASK_STORAGE_NOT_ACTIVATED'});
  if(req.headers?.origin&&req.headers.origin!==allowedOrigin||req.headers?.['sec-fetch-site']==='cross-site'||action!=='list'&&req.headers?.origin!==allowedOrigin)return result(403,{error:'ORIGIN_DENIED'});
  const token=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_AUTHENTICATION_REQUIRED'});
  try{const before=await verifyOwner(token,{signal});if(!valid(before))throw error('OWNER_AUTHORIZATION_DENIED',403);let request=null;if(action!=='list'){const raw=await requestBody(req);try{request=taskStorageRequest(raw,{scopeAuthority,projectId});}catch{throw error('TASK_REQUEST_INVALID',400);}}if(signal?.aborted)throw error('TASK_STORAGE_UNAVAILABLE');const reply=taskStorageEnabled(activation)?await port.call(action,request,token,{signal}):{schemaVersion:1,qualification:'OWNER_PRIVATE_DEVELOPMENT_TASKS',tasks:[]};let body;try{body=validateTaskRpcReply(action,reply,request,{scopeAuthority,projectId});}catch{throw error('TASK_STORAGE_UNAVAILABLE');}const after=await verifyOwner(token,{signal});if(!valid(after)||after.subject!==before.subject)throw error('OWNER_AUTHORIZATION_DENIED',403);if(signal?.aborted)throw error('TASK_STORAGE_UNAVAILABLE');const expiresAt=Math.min(before.expiresAt,after.expiresAt);return result(200,action==='list'?{schemaVersion:1,qualification:'CURRENT_OWNER_DEVELOPMENT_TASKS',persistence:taskStorageEnabled(activation)?'OWNER_RPC_AVAILABLE':'NOT_CONNECTED',tasks:body.tasks,expiresAt}:{...body,expiresAt});
  }catch(e){const status=[400,401,403,409,413,415].includes(e.status)?e.status:e instanceof SyntaxError?400:503;return result(status,{error:status===409?'TASK_REVISION_CONFLICT':status===403?'OWNER_AUTHORIZATION_DENIED':status>=500?'TASK_STORAGE_UNAVAILABLE':'TASK_REQUEST_INVALID'});}
 }};
}
export function createDeploymentTaskStorageServer({fetchImpl=globalThis.fetch,policy=ownerAuthConfig,activation=taskStorageActivation,now=Date.now,scopeAuthority=null,projectId=null}={}){return createTaskStorageServer({activation,verifyOwner:createCurrentOwnerVerifier({fetchImpl,policy,now}),port:taskStorageEnabled(activation)?createTaskRpcPort({fetchImpl,policy}):null,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now});}
