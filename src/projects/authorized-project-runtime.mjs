import {assertProjectScope} from './project-scope-authority.mjs';
import {ownerAuthConfig} from '../../public/owner-auth-config.js';
import {createAuthorizedProjectConnections} from './authorized-project-connections.mjs';
import {createProjectConnectionServer} from './project-connection-server.mjs';
import {createProjectGrantRpcPort} from './project-grant-rpc.mjs';
import {projectRuntimeActivation,projectRuntimeEnabled,existingProjectIds} from './project-runtime-config.mjs';
import {createRegistrationGitPort} from '../onboarding/project-registration-git.mjs';
import {projectRegistrationActivation} from '../onboarding/project-registration-config.mjs';
import {projectRegistrationCatalogView} from '../onboarding/project-registration-catalog.mjs';
import {createCurrentOwnerVerifier,createGitHubHandoffRepositoryReader,boundedPrivateJsonRequest} from '../continuity/remote-handoff-server.mjs';
import {createGitHubRepositoryRunReader} from '../reporting/repository-run-server.mjs';
import {createGitHubTaskReconciliationReader,createTaskReconciliationServer} from '../tasks/task-reconciliation-server.mjs';
import {createTaskRpcPort,createTaskStorageServer} from '../tasks/task-storage-server.mjs';
import {createTaskReviewRpcPort,createTaskReviewServer,createTaskReviewFreshEvidence} from '../tasks/task-review-server.mjs';
import {taskStorageActivation} from '../tasks/task-storage-config.mjs';
import {taskReviewActivation} from '../tasks/task-review-config.mjs';
const routes=new Set(['private/project-connections','private/remote-handoff','private/remote-handoff/config','private/repository-runs','private/development-tasks','private/task-reconciliation','private/task-review-decisions']);
const result=(status,body)=>({status,body,headers:{'Cache-Control':'private, no-store',Vary:'Authorization',Pragma:'no-cache'}}),failure=(code,status=403)=>Object.assign(Error(code),{code,status});
export function createAuthorizedProjectRuntime({activation=projectRuntimeActivation,policy=ownerAuthConfig,authorizationPort,readCatalog,verifyOwner,verifyRepository,sourceReaderFactory,reportReaderFactory,metadataReaderFactory,taskPortFactory,reviewPortFactory,taskActivation=taskStorageActivation,reviewActivation=taskReviewActivation,now=Date.now}={}){
 const enabled=projectRuntimeEnabled(activation);
 return Object.freeze({async handle(req,{route,project,track='BASELINE',signal}={}){
  if(!routes.has(route)||route!=='private/project-connections'&&(!project||existingProjectIds.includes(project)))return null;
  if(!enabled)return result(route==='private/project-connections'?503:403,{error:'PROJECT_RUNTIME_NOT_ACTIVATED'});
  if(req.headers?.origin&&req.headers.origin!==policy.stageOrigin||req.headers?.['sec-fetch-site']==='cross-site')return result(403,{error:'ORIGIN_DENIED'});
  if(track!=='BASELINE'||project&&!/^[A-Z][A-Z0-9_]{2,63}$/.test(project))return result(403,{error:'PROJECT_SCOPE_DENIED'});
  const token=/^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization||'')?.[1];if(!token)return result(401,{error:'OWNER_REQUIRED'});
  try{
   if(route==='private/project-connections'){
    const snapshot=await authorizationPort.catalog(token,{signal}),catalog=await readCatalog({signal}),grants=new Map(snapshot.grants.map(g=>[g.projectId,g]));
    // Catalog construction gets a fresh combined authorization snapshot on every
    // Owner check, and refreshes each individual grant during selection.
    const catalogAuthorization=async()=>{const fresh=await authorizationPort.catalog(token,{signal});grants.clear();for(const g of fresh.grants)grants.set(g.projectId,g);return fresh.actor;};const connections=createAuthorizedProjectConnections({registeredProjects:catalog.projects,ownerSubject:policy.ownerSubject,currentGrant:id=>grants.get(id),verifyRepository,now,verifyOwner:catalogAuthorization});
    return createProjectConnectionServer({connections,registeredProjects:catalog.projects,verifyOwner:catalogAuthorization,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}).handle(req,{signal});
   }
   const initial=await authorizationPort.authorize(project,token,{signal});let grant=initial.grants[0];const catalog=await readCatalog({signal}),p=catalog.projects.find(p=>p.projectId===project);if(!p)throw failure('PROJECT_SCOPE_DENIED');
   const fresh=async()=>{const v=await authorizationPort.authorize(project,token,{signal});grant=v.grants[0];return v.actor;};
   const connections=createAuthorizedProjectConnections({registeredProjects:[p],ownerSubject:policy.ownerSubject,currentGrant:()=>grant,verifyOwner:fresh,verifyRepository,now}),connection=await connections.select(project,{token,signal}),scopeAuthority=connection.scopeAuthority,c=await connection.reportConfiguration(),verify=async()=>{const a=await fresh();assertProjectScope(scopeAuthority,project,track,'source');return a;};
   const sourceReader=()=>sourceReaderFactory(c.entry),reports=()=>reportReaderFactory(c),metadata=()=>metadataReaderFactory(c);
   if(route.startsWith('private/remote-handoff')){if(req.method!=='GET')return result(405,{error:'READ_ONLY_ENDPOINT'});const configuration=await connection.sourceConfiguration(),observation=route.endsWith('/config')?null:await connection.readSource(sourceReader());const after=await verify();return result(200,{schemaVersion:1,privateReadOnly:true,authorization:{qualification:'OWNER_REPOSITORY_READ_POLICY',subject:policy.ownerSubject,identityProject:'NEXAEON',projectId:project,repositoryId:c.repositoryId},expiresAt:Math.min(after.expiresAt,grant.expiresAt,now()+30000),...(observation?{observation}:{configuration})});}
   if(route==='private/repository-runs'){if(req.method!=='GET')return result(405,{error:'READ_ONLY_ENDPOINT'});const observation=await connection.readReports(reports());const after=await verify();return result(200,{schemaVersion:1,privateReadOnly:true,observation,authorization:{qualification:'OWNER_REPOSITORY_RUN_READ_POLICY',subject:policy.ownerSubject,identityProject:'NEXAEON',projectId:project,track,repositoryId:c.repositoryId,reportRef:c.reportRef,directory:c.directory,directories:c.directories},expiresAt:Math.min(after.expiresAt,grant.expiresAt,now()+30000)});}
   const taskPort=taskPortFactory(scopeAuthority,project);
   if(route==='private/development-tasks')return createTaskStorageServer({activation:taskActivation,verifyOwner:verify,port:taskPort,scopeAuthority,projectId:project,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}).handle(req,{signal});
   if(route==='private/task-reconciliation'){const body=typeof req.body==='string'?JSON.parse(req.body):req.body;return createTaskReconciliationServer({configuration:c,repositoryReader:reports(),metadataReader:metadata(),verifyOwner:verify,scopeAuthority,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}).handle({...req,body},{signal});}
   const freshEvidence=createTaskReviewFreshEvidence({configuration:c,scopeAuthority,taskPort,repositoryReaderFactory:reports,metadataReaderFactory:metadata,verifyOwner:verify,policy,now});
   return createTaskReviewServer({activation:reviewActivation,verifyOwner:verify,port:reviewPortFactory(scopeAuthority),freshEvidence,scopeAuthority,ownerSubject:policy.ownerSubject,allowedOrigin:policy.stageOrigin,now}).handle(req,{signal});
  }catch(error){return result([400,401,403,409,413].includes(error?.status)?error.status:503,{error:error?.code||'PROJECT_RUNTIME_UNAVAILABLE'});}
 }});
}
export function createDeploymentAuthorizedProjectRuntime({activation=projectRuntimeActivation,environment=process.env,fetchImpl=globalThis.fetch,policy=ownerAuthConfig,now=Date.now}={}){
 // Creating the disabled factory never opens a connection, reads a secret or
 // activates the approved-but-unbound registry writer.
 if(!projectRuntimeEnabled(activation))return createAuthorizedProjectRuntime({activation,policy,now});
 const credential=environment.MC_GITHUB_READ_TOKEN,verifyOwner=createCurrentOwnerVerifier({fetchImpl,policy,now});
 const git=createRegistrationGitPort({credential,ownerSubject:policy.ownerSubject,fetchImpl,activation:{...projectRegistrationActivation,enabled:true,qualification:'OWNER_PRIVATE_GIT_CATALOG_APPROVED'}});
 return createAuthorizedProjectRuntime({activation,policy,now,verifyOwner,authorizationPort:createProjectGrantRpcPort({fetchImpl,policy,now}),readCatalog:async({signal})=>projectRegistrationCatalogView(await git.readSnapshot({signal}),{ownerSubject:policy.ownerSubject,now:now()}),verifyRepository:async({repositoryId,signal})=>{if(typeof credential!=='string'||credential.length<20)throw failure('PROJECT_READER_NOT_CONFIGURED',503);const r=await boundedPrivateJsonRequest(fetchImpl,'https://api.github.com/repos/'+repositoryId,{headers:{Authorization:'Bearer '+credential,Accept:'application/vnd.github+json'}},signal,65536);if(r.status!==200||r.data?.archived!==false||r.data?.disabled!==false)throw failure('PROJECT_REPOSITORY_UNAVAILABLE');return {repositoryId:r.data.full_name,repositoryNumericId:r.data.id,private:r.data.private===true&&r.data.visibility==='private'};},sourceReaderFactory:configuration=>createGitHubHandoffRepositoryReader({credential,fetchImpl,configuration}),reportReaderFactory:configuration=>createGitHubRepositoryRunReader({credential,fetchImpl,configuration,now}),metadataReaderFactory:configuration=>createGitHubTaskReconciliationReader({credential,fetchImpl,configuration}),taskPortFactory:(scopeAuthority,projectId)=>createTaskRpcPort({fetchImpl,policy,scopeAuthority,projectId}),reviewPortFactory:scopeAuthority=>createTaskReviewRpcPort({fetchImpl,policy,scopeAuthority})});
}
