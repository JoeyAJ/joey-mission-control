import {createDeploymentTaskReconciliationServer} from '../src/tasks/task-reconciliation-server.mjs';
import {createDeploymentRepositoryRunServer} from '../src/reporting/repository-run-server.mjs';
import {commandReadout,commandWorkspaceHealth} from '../src/operations/command-readouts.mjs';
import {phaseSummary} from '../public/phase-summary.js';
import {productView} from '../src/product/view.mjs';
import {manifest} from '../src/agent/control.mjs';
import fs from 'node:fs/promises';
import {securityHeaders,safeId} from '../src/api/routes.mjs';
import {release} from '../src/release.mjs';
import {candidate} from '../src/candidate.mjs';
import {assertPublicCases} from '../src/public-cases.mjs';
import {composeContinue} from '../src/continue/continue-composer.mjs';
import {createDeploymentRemoteHandoffServer} from '../src/continuity/remote-handoff-server.mjs';
import {createDeploymentProjectEntryServer} from '../src/continuity/project-entry-server.mjs';
import {ownerAuthConfig} from '../public/owner-auth-config.js';
import {createDeploymentProjectOnboardingServer} from '../src/onboarding/project-onboarding-server.mjs';
import {createDeploymentProjectDraftStorageServer} from '../src/onboarding/project-draft-storage-server.mjs';
import {createDeploymentTaskStorageServer} from '../src/tasks/task-storage-server.mjs';
import {createDeploymentTaskReviewServer} from '../src/tasks/task-review-server.mjs';
const stageChanges=JSON.parse(await fs.readFile(new URL('../deployment/stage-changes.safe.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url),'utf8'));
const projectStates=JSON.parse(await fs.readFile(new URL('../deployment/project-state.v03b.json',import.meta.url),'utf8'));
const phaseRecords=JSON.parse(await fs.readFile(new URL('../deployment/last-development.v03d.json',import.meta.url),'utf8')).projects;
const publicCases=assertPublicCases(JSON.parse(await fs.readFile(new URL('../deployment/public-cases.v03e.json',import.meta.url),'utf8')));
const projectManifest=p=>{const m=manifest(p,{handoff:snapshot.handoffs.byEntity[p.id],handoffs:[snapshot.handoffs.globalLatest,...snapshot.handoffs.history].filter(Boolean),generatedAt:snapshot.generatedAt,publicRead:true});m.product=productView(p,{publicRead:true});m.canonicalState=projectStates.projects.find(s=>s.id===p.id);m.product.documentedPurpose=m.canonicalState?.missionStatement||m.product.documentedPurpose;m.phase=phaseSummary(p,m,{records:phaseRecords,handoffs:[snapshot.handoffs.globalLatest,...snapshot.handoffs.history].filter(Boolean),readOnly:true});m.sourceReadout=commandReadout(p.id,{publicRead:true});return m;};
export function productionResponse(method,url){
 if(method!=='GET')return{status:403,body:{error:'Public production is read-only. Use authorized local Mission Control for writes.'}};
 const route=url.searchParams.get('route')||'';
 if(route==='health')return{status:200,body:{ok:true,...release,...candidate,mode:'verified_release_snapshot',readOnly:true,stageChanges:true,commandWorkspace:commandWorkspaceHealth,snapshotGeneratedAt:snapshot.generatedAt}};
 if(route==='stage-changes')return{status:200,body:stageChanges};
 if(route==='state')return{status:200,body:snapshot};
 if(route==='public-cases')return{status:200,body:publicCases};
 if(route==='projects')return{status:200,body:snapshot.projects.map(p=>projectManifest(p))};
 const canonical=route.match(/^projects\/([^/]+)\/project-state$/);if(canonical){const state=projectStates.projects.find(s=>s.id===safeId(canonical[1]));return state?{status:200,body:state}:{status:404,body:{error:'Project not found'}};}
 const normalized=route.match(/^projects\/([^/]+)\/(state|manifest|runtime|activity|product)$/);
 if(normalized){const p=snapshot.projects.find(p=>p.id===safeId(normalized[1]));return p?{status:200,body:normalized[2]==='runtime'?projectManifest(p).runtime:normalized[2]==='activity'?projectManifest(p).activity:normalized[2]==='product'?projectManifest(p).product:projectManifest(p)}:{status:404,body:{error:'Project not found'}};}
 if(route==='inbox')return{status:200,body:[]};
 if(route==='handoffs')return{status:200,body:snapshot.handoffs};
 if(route==='workspaces')return{status:200,body:snapshot.projects.map(p=>({id:p.id,name:p.name.value,...p.workspaceObservation,repository:p.where.repository.value,storedCommit:p.where.storedCommit.value,ai:p.lastAI.value,model:p.model.value,session:p.session}))};
 const match=route.match(/^projects\/([^/]+)(\/continue)?$/);
 if(match){const project=snapshot.projects.find(p=>p.id===safeId(match[1]));if(!project)return{status:404,body:{error:'Project not found'}};
  if(!match[2])return{status:200,body:project};
  return{status:200,body:composeContinue({project,handoff:snapshot.handoffs.byEntity[project.id],git:{error:'Public release snapshot cannot inspect live Mac repositories; perform continuation inspection on the authorized Local Master.'},currentFingerprints:project.sourceFingerprints})};
 }
 return{status:404,body:{error:'Not found'}};
}
export default async function handler(req,res){
 try{const url=new URL(req.url,'https://mission-control.invalid'),route=url.searchParams.get('route');let result;
  if(['private/remote-handoff','private/remote-handoff/config'].includes(route)&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentRemoteHandoffServer().handle(req,{action:route.endsWith('/config')?'config':'read',project:url.searchParams.get('project')||'MISSION_CONTROL',track:url.searchParams.get('track')||'BASELINE',runId:url.searchParams.get('retainedRun'),taskId:url.searchParams.get('retainedTask'),expectedHead:url.searchParams.get('reportHead')});}
  else if(route==='private/repository-runs'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentRepositoryRunServer().handle(req,{project:url.searchParams.get('project')||'MISSION_CONTROL',track:url.searchParams.get('track')||'BASELINE'});}
  else if(route==='private/project-entry'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentProjectEntryServer().handle(req,{project:url.searchParams.get('project')});}
  else if(route==='private/project-onboarding'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentProjectOnboardingServer().handle(req);}
  else if(route==='private/project-drafts'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentProjectDraftStorageServer().handle(req);}
  else if(route==='private/task-reconciliation'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentTaskReconciliationServer().handle(req);}
  else if(route==='private/development-tasks'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentTaskStorageServer().handle(req);}
  else if(route==='private/task-review-decisions'&&req.headers.host===new URL(ownerAuthConfig.stageOrigin).host){result=await createDeploymentTaskReviewServer().handle(req);}
  else result=productionResponse(req.method,url);
  res.writeHead(result.status,{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...result.headers});res.end(JSON.stringify(result.body));}
 catch(error){res.writeHead(error.status||500,{...securityHeaders,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:error.status?error.message:'Production request failed'}));}
}
