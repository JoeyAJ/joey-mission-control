import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {createCurrentOwnerVerifier} from './remote-handoff-server.mjs';
import {projectEntrySnapshots} from './project-entry-snapshots.mjs';
const bearer=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/;
export function createProjectEntryServer({verifyOwner,ownerSubject=ownerAuthConfig.ownerSubject,allowedOrigin=ownerAuthConfig.stageOrigin,now=Date.now}={}){
 const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','Pragma':'no-cache'}});
 const valid=actor=>actor?.subject===ownerSubject&&actor.role==='OWNER'&&actor.aal==='aal2'&&actor.verified===true&&actor.sessionActive===true&&Number.isSafeInteger(actor.expiresAt)&&actor.expiresAt>now();
 return Object.freeze({async handle(req,{project,signal}={}){
  if(req.method!=='GET')return result(405,{error:'READ_ONLY_ENDPOINT'});
  if(req.headers?.origin&&req.headers.origin!==allowedOrigin||req.headers?.['sec-fetch-site']==='cross-site')return result(403,{error:'ORIGIN_DENIED'});
  const token=bearer.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_AUTHENTICATION_REQUIRED'});
  try{const actor=await verifyOwner(token,{signal});if(!valid(actor))return result(403,{error:'OWNER_AUTHORIZATION_DENIED'});
   const entry=projectEntrySnapshots.find(e=>e.projectId===project);if(!entry)return result(403,{error:'PROJECT_ENTRY_SCOPE_DENIED'});
   const after=await verifyOwner(token,{signal});if(!valid(after))return result(403,{error:'OWNER_AUTHORIZATION_DENIED'});
   return result(200,{schemaVersion:1,privateReadOnly:true,qualification:'OWNER_CONNECTOR_SNAPSHOT_READ',entry:structuredClone(entry),expiresAt:after.expiresAt});
  }catch(error){return result(error?.code==='OWNER_DENIED'?403:503,{error:error?.code==='OWNER_DENIED'?'OWNER_AUTHORIZATION_DENIED':'PRIVATE_ENTRY_UNAVAILABLE'});}
 }});
}
export function createDeploymentProjectEntryServer({fetchImpl=globalThis.fetch}={}){return createProjectEntryServer({verifyOwner:createCurrentOwnerVerifier({fetchImpl})});}
