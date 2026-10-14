import {commandReadout} from './operations/command-readouts.mjs';
import {readAssetCatalog} from './proposals/asset-catalog.mjs';
import {ProposalService,validProposals} from './proposals/service.mjs';
import {phaseSummary} from '../public/phase-summary.js';
import {operationalView} from './operations/reconcile.mjs';
import {ProjectStateRepository} from './project-state/repository.mjs';
import {ProductService,validOwners} from './product/service.mjs';
import {MissionService,validLedger} from './agent/mission-service.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {config,assertSafeDataRoot,parseStartOptions} from './config.mjs';
import {securityHeaders,createRouter} from './api/routes.mjs';
import {buildProjection} from './projection/projection-service.mjs';
import {JsonStore} from './storage/json-store.mjs';
import {InboxService} from './inbox/inbox-service.mjs';
import {SessionService} from './workspace/session-service.mjs';
import {interpret} from './inbox/interpretation.mjs';
import {confirmPromotion} from './inbox/promotion-service.mjs';
import {composeContinue} from './continue/continue-composer.mjs';
import {loadSchema,collectionValidator} from './api/validation.mjs';

const phaseRecords=JSON.parse(await fs.readFile(new URL('../deployment/last-development.v03d.json',import.meta.url),'utf8')).projects;
const publicRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const [inboxSchema,sessionSchema]=await Promise.all([loadSchema('inbox-item'),loadSchema('ai-workspace-session')]);
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{...securityHeaders,'Content-Type':type,'Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}

export function createApp(deps){
  const router=createRouter(deps);
  return async(req,res)=>{
    try{
      const host=(req.headers.host||'').split(':')[0].replace(/^\[|\]$/g,'');
      if(!['127.0.0.1','localhost','::1'].includes(host))return send(res,403,{error:'Loopback Host required'});
      const url=new URL(req.url,'http://127.0.0.1');
      if(req.method!=='GET'&&req.method!=='HEAD'){
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return send(res,415,{error:'JSON content type required'});
        if(req.headers['x-mission-control-token']!==deps.token)return send(res,403,{error:'Write token required'});
        if(url.pathname==='/api/proposals'&&req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return send(res,403,{error:'Same-origin proposal write required'});
      }
      if(url.pathname.startsWith('/api/')){const result=await router(req,res,url);if(!result)return send(res,404,{error:'Not found'});return send(res,result.status,result.body);}
      const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
      if(!['index.html','styles.css','app.js','i18n.js','presentation.js','source-summaries.js','control-semantics.js','project-links.js','decision-view.js','agent-detail.js','joey-view.js','joey-takeover.js','report-time.js','takeover-instruction.js','repository-run-reporter-source.js','joey-operations.js','phase-summary.js','proposals.js','public-cases.js','proposal-navigation.js','joey-cockpit.js','joey-controls.js','visual-system.js','brand-eye-source.png','project-state.js','project-state-controls.js','command-workspace.js','task-workflow-config.js','workspace-reading.js','reading-panes.js','region-update.js','nexaeon-logo.png','control-tower.js','control-tower.css','tower-model.js','tower-demo.js','stage-changes.js','private-continuity-status.js','owner-auth-config.js','owner-auth-client.js','owner-recovery-config.js','owner-password-recovery.html','owner-password-recovery-client.js','owner-email-login-config.js','owner-email-login.html','owner-email-login-client.js'].includes(name))return send(res,404,{error:'Not found'});
      const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',png:'image/png'};
      return send(res,200,await fs.readFile(path.join(publicRoot,name),name.endsWith('.png')?undefined:'utf8'),types[name.split('.').pop()]);
    }catch(error){send(res,error.status||500,{error:error.status?error.message:'Internal error'});}
  };
}

export function createDefaultDeps({canonicalRoot=config.canonicalRoot,dataRoot=config.dataRoot,writeToken=config.writeToken,assetCatalogRoot=process.env.MC_ASSET_CATALOG_ROOT||'/Users/joeyaj/Documents/Codex/Projects/joey-asset-system'}={}){
  const ready=assertSafeDataRoot(canonicalRoot,dataRoot);
  const inbox=new InboxService(new JsonStore(dataRoot,'inbox.v1.json',collectionValidator(inboxSchema)));
  const sessionStore=new JsonStore(dataRoot,'sessions.v1.json',collectionValidator(sessionSchema));
  const sessions=new SessionService(sessionStore);
  async function state({readOnly=false}={}){await ready;return buildProjection(canonicalRoot,{sessions:await (readOnly?sessionStore.readOnly():sessions.list())});}
  const products=new ProductService(new JsonStore(dataRoot,'product-owner.v03.json',validOwners));
  const proposals=new ProposalService(new JsonStore(dataRoot,'proposals.v03e.json',validProposals),()=>products.store.readOnly());
  const projectStates=new ProjectStateRepository(products.store,async id=>{const snapshot=await state(),p=snapshot.projects.find(p=>p.id===id);if(!p)throw Object.assign(new Error('Project not found'),{status:404});const {productView}=await import('./product/view.mjs');const owners=await products.list();return productView(p,{owner:owners.find(o=>o.projectId===id),document:snapshot.productDocuments?.[id]});});
  return{
    ready,token:writeToken,products,projectStates,proposals,getAssetCatalog:()=>readAssetCatalog(assetCatalogRoot),missions:new MissionService(new JsonStore(dataRoot,'missions.v03.json',validLedger)),
    getState:state,commandReadout,
    phaseView:(p,m,snapshot)=>phaseSummary(p,m,{records:phaseRecords,handoffs:[snapshot.handoffs?.globalLatest,...(snapshot.handoffs?.history||[])].filter(Boolean)}),
    operationalView:(p,r,snapshot)=>operationalView(p,r,snapshot,canonicalRoot),
    getInbox:async()=>{await ready;return inbox.list();},
    transitionInbox:async(id,state,expectedState)=>{await ready;return inbox.transition(id,state,expectedState);},
    getProject:async id=>(await state()).projects.find(project=>project.id===id)||null,
    getWorkspaces:async()=>(await state()).projects.map(project=>({id:project.id,name:project.name.value,...project.workspaceObservation,repository:project.where.repository.value,storedCommit:project.where.storedCommit.value,ai:project.lastAI.value,model:project.model.value,session:project.session})),
    recheck:async id=>{const project=(await state()).projects.find(item=>item.id===id);if(!project)throw Object.assign(new Error('Workspace not found'),{status:404});return{id,...project.workspaceObservation,storedCommit:project.where.storedCommit.value};},
    getHandoffs:async()=>(await state()).handoffs,
    createInbox:async input=>{await ready;return inbox.capture(input);},
    interpretInbox:async id=>{await ready;const snapshot=await state(),knownEntityIds=[...snapshot.projects.map(item=>item.id),...snapshot.cases.map(item=>item.id)];return inbox.update(id,item=>{
      if(!['Needs review','Ready to confirm'].includes(item.state))throw Object.assign(new Error('Reopen Inbox item before interpreting'),{status:409});
      const result={...item,state:'Ready to confirm',interpretation:interpret(item,{knownEntityIds}),updatedAt:new Date().toISOString()};
      for(const key of ['confirmedAt','localProposalOnly','canonicalWritePerformed'])delete result[key];
      return result;
    });},
    confirmInbox:async(id,body)=>{await ready;return inbox.update(id,item=>{
      if(item.state!=='Ready to confirm')throw Object.assign(new Error('Inbox item must be ready to confirm'),{status:409});
      return {...item,...confirmPromotion(item,body.explicitDecision),updatedAt:new Date().toISOString()};
    });},
    createSession:async input=>{await ready;return sessions.start(input);},
    updateSession:async(id,input)=>{await ready;return sessions.update(id,input);},
    continueProject:async(id,expectedContext={})=>{
      const snapshot=await state({readOnly:true}),project=snapshot.projects.find(item=>item.id===id);
      if(!project)throw Object.assign(new Error('Project not found'),{status:404});
      const viewedSession=expectedContext.viewedSession??null;
      const storedContext={head:project.where.storedCommit.value==='Unknown'?'':project.where.storedCommit.value,path:project.where.localPath.value==='Unknown'?'':project.where.localPath.value,branch:project.where.branch.value==='Unknown'?'':project.where.branch.value,sessionPath:viewedSession?.path||'',viewedSession,currentSession:project.session||null,viewedGit:expectedContext.workspaceObservation||null,fingerprints:expectedContext.sourceFingerprints||[]};
      return composeContinue({project,handoff:snapshot.handoffs.byEntity[id],git:project.workspaceObservation,storedContext,currentFingerprints:project.sourceFingerprints});
    }
  };
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const runtime=parseStartOptions(process.argv.slice(2));
  const deps=createDefaultDeps({dataRoot:runtime.dataRoot});
  await deps.ready;
  const server=http.createServer(createApp(deps));
  server.listen(runtime.port,config.host,()=>console.log(`Mission Control: http://${config.host}:${runtime.port}\nWrite token: ${config.writeToken}`));
}
