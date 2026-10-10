// Server only. Fixed repository and explicit runtime credential; never GH_TOKEN fallback.
import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {readRemoteHandoff,mcRemoteHandoffConfiguration} from '../canonical/remote-handoff-adapter.mjs';
import {projectEntryReadConfiguration} from './project-entry-read-allowlist.mjs';
import {readProjectEntrySource} from './project-entry-source-adapter.mjs';
const sha=/^[a-f0-9]{40}$/,bearer=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/;
const fail=code=>Object.assign(Error(code),{code});
async function jsonRequest(fetchImpl,url,options,signal,limit=262144){
 const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,4000);
 try{const response=await fetchImpl(url,{...options,signal:abort.signal,redirect:'error'});if(!response.ok){await response.body?.cancel();return{status:response.status,data:null};}let bytes=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)throw fail('UNAVAILABLE');text+=decoder.decode(chunk,{stream:true});}text+=decoder.decode();return{status:response.status,data:JSON.parse(text)};}
 catch{throw fail('UNAVAILABLE');}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export function createGitHubHandoffRepositoryReader({credential,fetchImpl=globalThis.fetch,configuration=mcRemoteHandoffConfiguration}={}){
 const configured=typeof credential==='string'&&credential.length>=20&&!/[\s\r\n]/.test(credential),c=structuredClone(configuration);
 const request=(url,signal)=>jsonRequest(fetchImpl,url,{headers:{Authorization:'Bearer '+credential,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}},signal);
 const scope=repositoryId=>{if(!configured||repositoryId!==c.repositoryId)throw fail('ACCESS_DENIED');};
 return Object.freeze({configured,async resolveRevision({repositoryId,ref,signal}){scope(repositoryId);if(ref!==c.ref)throw fail('ACCESS_DENIED');const url='https://api.github.com/repos/'+repositoryId+'/git/ref/heads/'+ref.split('/').map(encodeURIComponent).join('/'),r=await request(url,signal);if(r.status===401||r.status===403)throw fail('ACCESS_DENIED');if(r.status!==200||r.data?.object?.type!=='commit'||!sha.test(r.data.object.sha))throw fail('UNAVAILABLE');return{commitSha:r.data.object.sha};},async readFile({repositoryId,commitSha,path,maxBytes,signal}){scope(repositoryId);if(!sha.test(commitSha)||![c.path,c.legacyPath,...(c.contextPaths||[])].filter(Boolean).includes(path))throw fail('ACCESS_DENIED');const url=new URL('https://api.github.com/repos/'+repositoryId+'/contents/'+path.split('/').map(encodeURIComponent).join('/'));url.searchParams.set('ref',commitSha);const r=await request(url.href,signal);if(r.status===404)return{status:'MISSING'};if(r.status===401||r.status===403)return{status:'ACCESS_DENIED'};if(r.status!==200)return{status:'UNAVAILABLE'};const d=r.data;if(d?.type!=='file'||d.submodule_git_url||d.target)return{status:'UNSUPPORTED_TYPE'};if(!Number.isInteger(d.size)||d.size>maxBytes)return{status:'TOO_LARGE'};if(d.encoding!=='base64'||typeof d.content!=='string'||!sha.test(d.sha))return{status:'UNAVAILABLE'};try{const encoded=d.content.replace(/\n/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error();const bytes=Buffer.from(encoded,'base64');if(bytes.length!==d.size||bytes.length>maxBytes)throw Error();return{status:'FOUND',entryType:'file',commitSha,blobId:d.sha,content:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};}catch{return{status:'UNAVAILABLE'};}}});
}
export function createCurrentOwnerVerifier({fetchImpl=globalThis.fetch,policy=ownerAuthConfig,identityProject='NEXAEON',now=Date.now}={}){
 return async(token,{signal}={})=>{
  const headers={apikey:policy.publishableKey,Authorization:'Bearer '+token};
  const [user,session]=await Promise.all([jsonRequest(fetchImpl,policy.origin+'/auth/v1/user',{headers},signal),jsonRequest(fetchImpl,policy.origin+'/rest/v1/rpc/mc_owner_session',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({project:identityProject})},signal)]);
  if(user.status!==200||user.data?.id!==policy.ownerSubject||user.data.is_anonymous===true)throw fail('OWNER_DENIED');const s=session.data;
  if(session.status!==200||s?.subject!==policy.ownerSubject||s.role!=='OWNER'||s.projectId!==identityProject||s.sessionActive!==true||s.memberActive!==true||s.aal!=='aal2'||!Number.isSafeInteger(s.expiresAt)||s.expiresAt<=now())throw fail('OWNER_DENIED');
  return {subject:s.subject,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,identityProject,expiresAt:s.expiresAt};
 };
}
export function createRemoteHandoffServer({repositoryReader,verifyOwner,configuration=mcRemoteHandoffConfiguration,ownerSubject=ownerAuthConfig.ownerSubject,allowedOrigin=ownerAuthConfig.stageOrigin,now=Date.now,sourceRead=readRemoteHandoff}={}){
 const c=structuredClone(configuration);
 const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','Pragma':'no-cache'}});
 return Object.freeze({async handle(req,{action='read',project=c.projectId,signal}={}){
  if(req.method!=='GET')return result(405,{error:'READ_ONLY_ENDPOINT'});
  if(req.headers?.origin&&req.headers.origin!==allowedOrigin||req.headers?.['sec-fetch-site']==='cross-site')return result(403,{error:'ORIGIN_DENIED'});
  const token=bearer.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_AUTHENTICATION_REQUIRED'});
  try{const actor=await verifyOwner(token,{signal});if(actor?.subject!==ownerSubject||actor.role!=='OWNER'||actor.aal!=='aal2'||actor.verified!==true||actor.sessionActive!==true||!Number.isSafeInteger(actor.expiresAt)||actor.expiresAt<=now())throw fail('OWNER_DENIED');
   if(project!==c.projectId)return result(403,{error:'SOURCE_SCOPE_DENIED'});
   // Identity is checked through an existing Owner session realm. This independent
   // exact-Owner repo policy does not claim MC database membership or write access.
   const authorization={qualification:'OWNER_REPOSITORY_READ_POLICY',projectId:c.projectId,repositoryId:c.repositoryId,identityProject:actor.identityProject,subject:actor.subject};
   if(repositoryReader?.configured!==true)return result(503,{error:'REPOSITORY_CONNECTION_NOT_CONFIGURED',backendConfigured:false});
   if(action==='config')return result(200,{schemaVersion:1,configuration:c,authorization,expiresAt:actor.expiresAt,privateReadOnly:true});
   if(action!=='read')return result(404,{error:'NOT_FOUND'});
   const observation=await sourceRead({configuration:c,reader:repositoryReader,signal,now});const after=await verifyOwner(token,{signal});if(after?.subject!==actor.subject||after.role!=='OWNER'||after.aal!=='aal2'||after.sessionActive!==true||after.verified!==true||!Number.isSafeInteger(after.expiresAt)||after.expiresAt<=now())throw fail('OWNER_DENIED');
   return result(200,{schemaVersion:1,observation,authorization,expiresAt:after.expiresAt,privateReadOnly:true});
  }catch(error){return result(error?.code==='OWNER_DENIED'?403:503,{error:error?.code==='OWNER_DENIED'?'OWNER_AUTHORIZATION_DENIED':'PRIVATE_READ_UNAVAILABLE'});}
 }});
}
export function createDeploymentRemoteHandoffServer({environment=process.env,fetchImpl=globalThis.fetch,policy=ownerAuthConfig,now=Date.now}={}){
 const verifyOwner=createCurrentOwnerVerifier({fetchImpl,policy,now});
 return Object.freeze({async handle(req,{project='MISSION_CONTROL',track='BASELINE',...options}={}){
  let configuration;try{configuration=project==='MISSION_CONTROL'&&track==='BASELINE'?mcRemoteHandoffConfiguration:projectEntryReadConfiguration(project,{track});}
  catch{return{status:403,body:{error:'SOURCE_SCOPE_DENIED'},headers:{'Cache-Control':'private, no-store',Vary:'Authorization',Pragma:'no-cache'}};}
  const repositoryReader=createGitHubHandoffRepositoryReader({credential:environment.MC_GITHUB_READ_TOKEN,fetchImpl,configuration});
  const sourceRead=project==='MISSION_CONTROL'?readRemoteHandoff:args=>readProjectEntrySource({...args,projectId:project,track});
  return createRemoteHandoffServer({repositoryReader,verifyOwner,configuration,sourceRead,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}).handle(req,{...options,project});
 }});
}
// Shared bounded GET transport for the independent fixed repository-report reader.
export {jsonRequest as boundedPrivateJsonRequest};
