// Local/server composition only. No deployment factory, route, credentials or writes.
import {registrationReservedRepositoryIds} from '../onboarding/project-registration-config.mjs';
import {createProjectScopeAuthority,assertProjectScope} from './project-scope-authority.mjs';
import {projectEntryReadConfiguration} from '../continuity/project-entry-read-allowlist.mjs';
import {readProjectEntrySource} from '../continuity/project-entry-source-adapter.mjs';
import {repositoryRunConfiguration,readRepositoryRuns} from '../reporting/repository-run-source.mjs';
import {validateRepositoryRun} from '../reporting/repository-run-contract.mjs';
import {createDevelopmentTask,reviseDevelopmentTask,validateDevelopmentTask} from '../tasks/development-task.mjs';
import {taskRequirementsStatus,createTaskRequirements} from '../tasks/task-requirements.mjs';
import {validateTaskReview} from '../tasks/task-review-contract.mjs';
const existing=new Set(['MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const operations=['sourceRead','reportRead','reportWrite','task','review'];
const contextPaths=['PRD.md','README.md','docs/PRODUCT_CHARTER.md','docs/PHASE_PLAN.md'];
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))&&Object.values(Object.getOwnPropertyDescriptors(v)).every(d=>Object.hasOwn(d,'value'));
const deny=()=>{throw Object.assign(Error('PROJECT_CONNECTION_DENIED'),{code:'PROJECT_CONNECTION_DENIED'});};
// currentGrant is a trusted synchronous projection with immediate revocation, NOT
// an owner-supplied payload. verifyOwner must use the existing live-session verifier.
export function createAuthorizedProjectConnections({registeredProjects,ownerSubject,currentGrant,verifyOwner,verifyRepository,now=Date.now}={}){
 if(!Array.isArray(registeredProjects)||registeredProjects.length>32||typeof ownerSubject!=='string'||!ownerSubject||[currentGrant,verifyOwner,verifyRepository].some(f=>typeof f!=='function'))deny();
 const projects=structuredClone(registeredProjects),ids=new Set(),repos=new Set();
 for(const p of projects){if(p.qualification!=='HISTORICAL_PRIVATE_REGISTRATION_RECEIPT'||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||/[\r\n\u0000-\u001f]/.test(p.name)||!/^([A-Z][A-Z0-9_]{2,63})$/.test(p.projectId)||existing.has(p.projectId)||ids.has(p.projectId)||!/^JoeyAJ\/[-A-Za-z0-9_.]+$/.test(p.repositoryId)||p.repositoryId.length>200||!Number.isSafeInteger(p.repositoryNumericId)||p.repositoryNumericId<1||registrationReservedRepositoryIds.includes(p.repositoryNumericId)||repos.has(p.repositoryNumericId)||!/^[-A-Za-z0-9_./]+$/.test(p.ref)||p.ref.length>255||p.ref.includes('..')||p.ref.includes('//')||p.ref.startsWith('/')||p.ref.startsWith('-')||p.ref.endsWith('/')||!/^[a-f0-9]{40}$/.test(p.baselineSha)||!/^[a-f0-9]{64}$/.test(p.requestDigest))deny();ids.add(p.projectId);repos.add(p.repositoryNumericId);}
 function grant(p){const g=currentGrant(p.projectId);if(!exact(g,['schemaVersion','projectId','ownerSubject','repositoryId','repositoryNumericId','ref','registrationRequestDigest','approvalRef','revision','expiresAt','revoked','capabilities'])||g.schemaVersion!=='mc.project-scope-grant.v1'||g.ownerSubject!==ownerSubject||g.projectId!==p.projectId||g.repositoryId!==p.repositoryId||g.repositoryNumericId!==p.repositoryNumericId||g.ref!==p.ref||g.registrationRequestDigest!==p.requestDigest||typeof g.approvalRef!=='string'||!/^[-A-Za-z0-9_.:]{1,120}$/.test(g.approvalRef)||!Number.isSafeInteger(g.revision)||g.revision<1||!Number.isSafeInteger(g.expiresAt)||g.expiresAt<=now()||g.revoked!==false||!exact(g.capabilities,operations)||operations.some(k=>g.capabilities[k]!==true))deny();return structuredClone(g);}
 function owner(a){if(a?.subject!==ownerSubject||a.role!=='OWNER'||a.aal!=='aal2'||a.verified!==true||a.sessionActive!==true||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=now())deny();return a;}
 async function select(projectId,{token,signal}={}){
  const p=projects.find(p=>p.projectId===projectId);if(!p)deny();
  const first=owner(await verifyOwner(token,{signal})),g=grant(p),binding=JSON.stringify(g);
  const identity=await verifyRepository({repositoryId:p.repositoryId,signal});
  if(identity?.repositoryNumericId!==p.repositoryNumericId||identity?.repositoryId!==p.repositoryId||identity?.private!==true)deny();
  const last=owner(await verifyOwner(token,{signal}));let deadline=Math.min(first.expiresAt,last.expiresAt,g.expiresAt);
  const assert=({projectId,track,operation})=>{if(signal?.aborted||deadline<=now()||projectId!==p.projectId||track!=='BASELINE'||!['source','report','reportWrite','task','review'].includes(operation)||JSON.stringify(grant(p))!==binding)deny();return {projectId:p.projectId,track:'BASELINE',repositoryId:p.repositoryId,repositoryNumericId:p.repositoryNumericId,ref:p.ref,path:'HANDOFF.md',contextPaths:[...contextPaths],expectedBaseline:p.baselineSha,legacyPath:null,authorizationRevision:g.revision,approvalRef:g.approvalRef,registrationRequestDigest:g.registrationRequestDigest,entryQualification:'EXPLICITLY_AUTHORIZED_REGISTERED_ENTRY',executionAuthorized:false};};
  const scopeAuthority=createProjectScopeAuthority(assert);
  const selectedTask=task=>{if(task?.projectId!==p.projectId||task.track!=='BASELINE')deny();return validateDevelopmentTask(task,{scopeAuthority});};assertProjectScope(scopeAuthority,p.projectId,'BASELINE','source');
  async function run(operation,fn){const before=owner(await verifyOwner(token,{signal}));deadline=Math.min(deadline,before.expiresAt);const repository=await verifyRepository({repositoryId:p.repositoryId,signal});if(repository?.repositoryNumericId!==p.repositoryNumericId||repository?.repositoryId!==p.repositoryId||repository?.private!==true)deny();owner(await verifyOwner(token,{signal}));assertProjectScope(scopeAuthority,p.projectId,'BASELINE',operation);const result=await fn();const after=owner(await verifyOwner(token,{signal}));deadline=Math.min(deadline,after.expiresAt);assertProjectScope(scopeAuthority,p.projectId,'BASELINE',operation);return result;}
  return Object.freeze({scopeAuthority,selection:Object.freeze({projectId:p.projectId,name:p.name,track:'BASELINE',repositoryId:p.repositoryId,repositoryNumericId:p.repositoryNumericId,selectable:true,executionAuthorized:false,cloudPersistenceReady:false}),
   sourceConfiguration:()=>run('source',()=>projectEntryReadConfiguration(p.projectId,{scopeAuthority})),
   reportConfiguration:()=>run('report',()=>repositoryRunConfiguration(p.projectId,{scopeAuthority})),
   readSource:reader=>run('source',()=>readProjectEntrySource({projectId:p.projectId,scopeAuthority,reader,signal,now})),
   readReports:reader=>run('report',()=>readRepositoryRuns({configuration:repositoryRunConfiguration(p.projectId,{scopeAuthority}),reader,signal,now,scopeAuthority})),
   createTask:(request,options)=>run('task',()=>createDevelopmentTask({projectId:p.projectId,track:'BASELINE'},request,{...options,now:now(),scopeAuthority})),
   reviseTask:(task,request)=>run('task',()=>reviseDevelopmentTask(task,request,{now:now(),scopeAuthority})),
   taskRequirements:task=>run('task',()=>createTaskRequirements(selectedTask(task),{scopeAuthority})),
   validateReport:(report,task)=>run('reportWrite',async()=>{const t=selectedTask(task);if(report.taskId!==t.taskId||taskRequirementsStatus(report.taskRequirements,await createTaskRequirements(t,{scopeAuthority}))!=='MATCH')deny();return validateRepositoryRun(report,{scope:assertProjectScope(scopeAuthority,p.projectId,'BASELINE','reportWrite'),now:now()});}),
   validateReview:(review,task)=>run('review',async()=>{const t=selectedTask(task);if(review.taskId!==t.taskId||taskRequirementsStatus(review.taskRequirements,await createTaskRequirements(t,{scopeAuthority}))!=='MATCH')deny();return validateTaskReview(review,{scopeAuthority});})});
 }
 // Only fresh, explicitly authorized selections are returned. Missing grants do
 // not hide authentication/transport errors or restore stale private selections.
 async function selectable(options){owner(await verifyOwner(options?.token,{signal:options?.signal}));const result=[];for(const p of projects){try{grant(p);}catch(error){if(error?.code==='PROJECT_CONNECTION_DENIED')continue;throw error;}const c=await select(p.projectId,options);result.push(c.selection);}owner(await verifyOwner(options?.token,{signal:options?.signal}));for(const p of result)grant(projects.find(r=>r.projectId===p.projectId));return result;}
 return Object.freeze({select,selectable});
}
