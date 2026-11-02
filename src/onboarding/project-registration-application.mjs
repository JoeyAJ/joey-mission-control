import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {createCurrentOwnerVerifier} from '../continuity/remote-handoff-server.mjs';
import {createProjectDraftRpcPort} from './project-draft-storage-server.mjs';
import {validateDraftStorageReply} from './project-draft-storage-contract.mjs';
import {projectRegistrationActivation,registrationActivated,registrationCatalogTarget,registrationReservedRepositoryIds} from './project-registration-config.mjs';
import {REGISTRATION_FILES,REGISTRATION_MAX_BYTES,contentDigest,registrationJson,registrationRequest,registrationError,verifyRegistrationObservation} from './project-registration-contract.mjs';
import {REGISTRY_PATH,INDEX_PATH,validateRegistrationCatalog,projectRegistrationCatalogView} from './project-registration-catalog.mjs';
import {createProjectRegistrationRepositoryReader} from './project-registration-repository.mjs';
import {createRegistrationGitPort,createAtomicGitRegistryWriter} from './project-registration-git.mjs';
import {createProjectRegistrationServer,registrationFailureResponse} from './project-registration-server.mjs';

const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store',Vary:'Authorization',Pragma:'no-cache'}});
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
async function jsonBody(req){if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers?.['content-type']||''))throw registrationError('REGISTRATION_JSON_REQUIRED',415);if(req.headers?.['content-length']&&(!/^\d+$/.test(req.headers['content-length'])||Number(req.headers['content-length'])>REGISTRATION_MAX_BYTES))throw registrationError('REGISTRATION_BODY_TOO_LARGE',413);if(req.body!==undefined){if(typeof req.body==='string'){if(Buffer.byteLength(req.body)>REGISTRATION_MAX_BYTES)throw registrationError('REGISTRATION_BODY_TOO_LARGE',413);return registrationJson(JSON.parse(req.body));}return registrationJson(req.body);}const chunks=[];let n=0;for await(const chunk of req){n+=Buffer.byteLength(chunk);if(n>REGISTRATION_MAX_BYTES)throw registrationError('REGISTRATION_BODY_TOO_LARGE',413);chunks.push(Buffer.from(chunk));}return registrationJson(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}
export function createProjectRegistrationApplication({activation=projectRegistrationActivation,ownerSubject=ownerAuthConfig.ownerSubject,allowedOrigin=ownerAuthConfig.stageOrigin,verifyOwner,draftPort,gitPort,repositoryReaderFactory,now=Date.now}={}) {
 const enabled=registrationActivated(activation);
 const checkOwner=async(token,signal)=>{let a;try{a=await verifyOwner(token,{signal});}catch{throw registrationError('OWNER_AUTHORIZATION_DENIED',403);}if(signal?.aborted)throw registrationError('REGISTRATION_PRIVATE_READ_UNAVAILABLE',503);if(a?.subject!==ownerSubject||a.role!=='OWNER'||a.aal!=='aal2'||a.verified!==true||a.sessionActive!==true||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=now())throw registrationError('OWNER_AUTHORIZATION_DENIED',403);return a;};
 const draft=async(id,revision,token,signal)=>{const list=validateDraftStorageReply('list',await draftPort.call('list',null,token,{signal}));const d=list.drafts.find(d=>d.draftId===id);if(!d||d.revision!==revision||!d.project.repositoryId.startsWith(activation.ownerNamespace+'/')||!d.project.acceptance||list.drafts.some(other=>other.draftId!==id&&(other.project.projectId===d.project.projectId||other.project.repositoryId.toLowerCase()===d.project.repositoryId.toLowerCase())))throw registrationError('REGISTRATION_DRAFT_CONFLICT',409);return d;};
 const exactPolicy=(request,expiresAt)=>({qualification:'EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY',ownerSubject,approvalRef:activation.approvalRef,expiresAt,target:Object.fromEntries(['draftId','draftRevision','projectId','repositoryId','repositoryNumericId','ref','baselineSha','expectedRegistryDigest','expectedIndexDigest','files','resources'].map(k=>[k,request[k]]))});
 return Object.freeze({async handle(req,{action='catalog',signal}={}){
  if(!['capabilities','catalog','verify','register'].includes(action)||req.method!==(['capabilities','catalog'].includes(action)?'GET':'POST'))return result(405,{error:'REGISTRATION_METHOD_DENIED'});
  if(req.headers?.origin&&req.headers.origin!==allowedOrigin||req.headers?.['sec-fetch-site']==='cross-site'||req.method==='POST'&&req.headers?.origin!==allowedOrigin)return result(403,{error:'ORIGIN_DENIED'});
  const token=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_AUTHENTICATION_REQUIRED'});
  const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();const timer=setTimeout(cancel,30000);timer.unref?.();
  try {
   const before=await checkOwner(token,abort.signal);
   if(action==='capabilities'){const after=await checkOwner(token,abort.signal);return result(200,{schemaVersion:1,qualification:'OWNER_PRIVATE_REGISTRATION_CAPABILITIES',enabled,privateRepositoryCreation:false,destination:registrationCatalogTarget,sourcePaths:[...REGISTRATION_FILES],expiresAt:Math.min(before.expiresAt,after.expiresAt,now()+30000)});}
   if(!enabled||(action==='catalog'?gitPort?.readConfigured!==true&&gitPort?.configured!==true:gitPort?.configured!==true))throw registrationError('REGISTRATION_NOT_ACTIVATED',503);
   const catalog=validateRegistrationCatalog(await gitPort.readSnapshot({signal:abort.signal}),ownerSubject);await checkOwner(token,abort.signal);
   if(action==='catalog'){const after=await checkOwner(token,abort.signal);return result(200,{...projectRegistrationCatalogView(catalog,{ownerSubject,now:now()}),liveRegistered:gitPort.sourceQualification==='APPROVED_REMOTE_GIT',expiresAt:Math.min(after.expiresAt,now()+30000)});}
   const input=await jsonBody(req);
   if(input.sourceReadConsent!=='OWNER_EXACT_PRIVATE_SOURCE_READ')throw registrationError('REGISTRATION_SCOPE_DENIED',403);
   if(action==='verify'){
    if(!exact(input,['draftId','draftRevision','sourceReadConsent']))throw registrationError('REGISTRATION_REQUEST_INVALID');
    const d=await draft(input.draftId,input.draftRevision,token,abort.signal);await checkOwner(token,abort.signal);
    const reader=repositoryReaderFactory({repositoryId:d.project.repositoryId,ref:d.project.branch});if(reader?.configured!==true)throw registrationError('REGISTRATION_PORT_NOT_CONFIGURED',503);
    const q={repositoryId:d.project.repositoryId,ref:d.project.branch,signal:abort.signal},startedAt=now(),identity=await reader.inspectIdentity(q);
    if(identity?.full_name!==q.repositoryId||identity.private!==true||identity.visibility!=='private'||identity.archived!==false||identity.disabled!==false||!Number.isSafeInteger(identity.id)||registrationReservedRepositoryIds.includes(identity.id)||catalog.ledger.entries.some(e=>e.receipt.projectId===d.project.projectId||e.receipt.repositoryNumericId===identity.id||e.receipt.repositoryId.toLowerCase()===q.repositoryId.toLowerCase()))throw registrationError('REGISTRATION_TARGET_CONFLICT',409);
    const head=await reader.resolveRevision(q),files={};for(const p of REGISTRATION_FILES){await checkOwner(token,abort.signal);files[p]=await reader.readFile({...q,commitSha:head.commitSha,path:p,maxBytes:98304});}
    const actor=await checkOwner(token,abort.signal),request=registrationRequest({schemaVersion:'mc.project-registration.v1',mode:'IMPORT_EXISTING_PRIVATE_REPOSITORY',requestId:'import_'+globalThis.crypto.randomUUID().replaceAll('-',''),draftId:d.draftId,draftRevision:d.revision,projectId:d.project.projectId,repositoryId:q.repositoryId,repositoryNumericId:identity.id,ref:q.ref,baselineSha:head.commitSha,expectedRegistryDigest:contentDigest(catalog.files[REGISTRY_PATH]),expectedIndexDigest:contentDigest(catalog.files[INDEX_PATH]),files:Object.fromEntries(REGISTRATION_FILES.map(p=>[p,contentDigest(files[p].content)])),resources:{backend:null,deployment:null}});
    const last=await reader.resolveRevision(q),identityAfter=await reader.inspectIdentity(q),freshDraft=await draft(d.draftId,d.revision,token,abort.signal),expiresAt=Math.min(actor.expiresAt,startedAt+30000);
    if(JSON.stringify(freshDraft)!==JSON.stringify(d))throw registrationError('REGISTRATION_DRAFT_CONFLICT',409);
    const receipt=verifyRegistrationObservation({request,draft:d,repository:identityAfter,headBefore:head.commitSha,headAfter:last.commitSha,files,resourceObservations:{backend:null,deployment:null},policy:exactPolicy(request,expiresAt),ownerSubject,startedAt,now:now()});
    const after=await checkOwner(token,abort.signal);return result(200,{schemaVersion:1,qualification:'OWNER_VERIFIED_IMPORT_PREVIEW_NOT_REGISTERED',request,requestDigest:receipt.requestDigest,expectedCatalogHeadSha:catalog.headSha,destination:registrationCatalogTarget,environmentStatus:receipt.environmentStatus,deploymentStatus:receipt.deploymentStatus,reportWriteScope:'PENDING_EXPLICIT_ACTIVATION',liveRegistered:false,developmentReady:false,executionAuthorized:false,verifiedDelivery:false,expiresAt:Math.min(receipt.expiresAt,after.expiresAt)});
   }
   if(!exact(input,['request','expectedCatalogHeadSha','sourceReadConsent','registrationConsent'])||input.registrationConsent!=='OWNER_EXACT_PRIVATE_CATALOG_REGISTRATION'||!/^[a-f0-9]{40}$/.test(input.expectedCatalogHeadSha||''))throw registrationError('REGISTRATION_REQUEST_INVALID');
   const request=registrationRequest(input.request),d=await draft(request.draftId,request.draftRevision,token,abort.signal);if(request.repositoryId!==d.project.repositoryId||request.ref!==d.project.branch||request.projectId!==d.project.projectId)throw registrationError('REGISTRATION_DRAFT_CONFLICT',409);
   const actor=await checkOwner(token,abort.signal),writer=createAtomicGitRegistryWriter({port:gitPort,ownerSubject,expectedHeadSha:input.expectedCatalogHeadSha,now,signal:abort.signal});
   return await createProjectRegistrationServer({policy:exactPolicy(request,Math.min(actor.expiresAt,now()+30000)),ownerSubject,allowedOrigin,verifyOwner,draftPort,repositoryReader:repositoryReaderFactory({repositoryId:request.repositoryId,ref:request.ref}),writer,now}).handle({method:req.method,headers:req.headers,body:request},{signal:abort.signal});
  }catch(e){const reply=registrationFailureResponse(e);if(action==='catalog'&&[401,403,404,429,500,502,503,504].includes(e?.upstreamStatus))reply.body.diagnostic={upstreamStatus:e.upstreamStatus};return reply;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }});
}
export function createDeploymentProjectRegistrationApplication({activation=projectRegistrationActivation,environment=process.env,fetchImpl=globalThis.fetch,policy=ownerAuthConfig,now=Date.now}={}) {
 const enabled=registrationActivated(activation);
 return createProjectRegistrationApplication({activation,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,verifyOwner:createCurrentOwnerVerifier({fetchImpl,policy,now}),now,
  draftPort:enabled?createProjectDraftRpcPort({fetchImpl,policy}):null,
  gitPort:enabled?createRegistrationGitPort({credential:environment.MC_GITHUB_REGISTRY_WRITE_TOKEN,readCredential:environment.MC_GITHUB_READ_TOKEN,activation,ownerSubject:policy.ownerSubject,fetchImpl}):null,
  repositoryReaderFactory:({repositoryId,ref})=>createProjectRegistrationRepositoryReader({credential:enabled?environment.MC_GITHUB_READ_TOKEN:undefined,fetchImpl,repositoryId,ref})});
}
