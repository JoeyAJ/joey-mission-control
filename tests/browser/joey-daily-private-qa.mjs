// Real daily view + task controller/view; synthetic existing Owner/source only.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import http from 'node:http';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
import {mountJoeyTakeover} from './public/joey-takeover.js';
import {createDevelopmentTasks} from './src/tasks/development-task-controller.mjs';
import {mountDevelopmentTask} from './src/tasks/development-task-view.mjs';
import {createDevelopmentTask} from './src/tasks/development-task.mjs';
import {createRepositoryRun,appendRepositoryRunEvent} from './src/reporting/repository-run-contract.mjs';
const owner=document.createElement('details');owner.dataset.ownerAuth='verified';let reads=0,writes=0,decisionCalls=0;
const task=createDevelopmentTask({projectId:'MISSION_CONTROL',track:'BASELINE'},{feature:'Synthetic existing task',acceptance:'Synthetic acceptance',constraints:'No real writes'},{taskId:'task_'+'f'.repeat(24)});
const at=Date.now()-1000,sha='a'.repeat(40),scope={projectId:'MISSION_CONTROL',track:'BASELINE',repositoryId:'fixture/mc',ref:'feature/test',path:'HANDOFF.md',baselineSha:sha,entryDigest:'c'.repeat(64),contextPaths:[]};
let report=createRepositoryRun({scope,runId:'synthetic-daily',taskId:task.taskId,agentName:'Synthetic Developer',featureTitle:'Synthetic completed work',workRef:scope.ref,eventId:'start',summary:'Synthetic start',now:at});report=appendRepositoryRunEvent(report,{id:'done',sequence:2,eventAt:new Date(at+500).toISOString(),kind:'completed',summary:'Synthetic completed result; no Owner acceptance',result:{codeSha:sha,tests:[{name:'Synthetic',outcome:'PASS'}],nextSteps:'Await actual Owner review',handoff:{path:'HANDOFF.md',commitSha:sha}}},{expectedSequence:1}).report;
const source={status:'connected',observation:{status:'FOUND',projectId:'MISSION_CONTROL',track:'BASELINE',source:{repositoryId:'fixture/mc',documentTimestamp:null},progress:{task:'Synthetic task',recordedStatus:'LOCAL_VERIFIED_PENDING_PUBLICATION'}}};const reports={status:'connected',observation:{status:'FOUND',projectId:'MISSION_CONTROL',track:'BASELINE',source:{repositoryId:'fixture/mc',resolvedCommitSha:sha},runs:[{report,source:{}}]}};
const port=value=>({snapshot:()=>value,subscribe(f){f(value);return()=>{};}});
const c=createDevelopmentTasks({projectId:'MISSION_CONTROL',ownerSubject:'synthetic-owner',inspectIdentity:async()=>({subject:'synthetic-owner',status:'authenticated',role:'OWNER',aal:'aal2',verified:true,sessionActive:owner.dataset.ownerAuth==='verified',memberActive:true,projects:['NEXAEON'],expiresAt:Date.now()+60000}),source:port(source),reports:port(reports),client:{list:async()=>{reads++;return{persistence:'OWNER_RPC_AVAILABLE',tasks:[task]};},save:async()=>{writes++;throw Error('NO_WRITE')}}});
const taskView=mountDevelopmentTask({controller:c,requireSignIn:()=>owner.dataset.ownerAuth==='verified',getAuthState:()=>owner.dataset.ownerAuth});owner.developmentTaskSource=taskView.root;owner.sourceController=port(source);owner.repositoryRunsController=port(reports);owner.remoteHandoffSource=document.createElement('div');owner.repositoryRunsSource=document.createElement('div');
const view=mountJoeyTakeover({project:'MISSION_CONTROL',ownerFactory:()=>owner,projectConnectionClient:null});document.body.append(view.root);
globalThis.qa={owner,view,taskView,c,state:()=>({reads,writes,decisionCalls}),revoke(){owner.dataset.ownerAuth='signed_out';taskView.clear();}};
`},bundle:true,write:false,format:'iife',platform:'browser'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:'<!doctype html><body><script src="/bundle.js"></script></body>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});let external=0;
try{const page=await browser.newPage();await page.route('**/*',route=>{if(route.request().url().startsWith(origin))return route.continue();external++;return route.abort();});await page.goto(origin);
 assert((await page.locator('[data-joey-daily=progress]').innerText()).includes('Synthetic completed result'));assert((await page.locator('[data-joey-daily=progress]').innerText()).includes('Joey 驗收待確認'));
 assert.equal(await page.locator('[data-joey-advanced]').evaluate(n=>n.open),false);assert.equal(await page.evaluate(()=>qa.state().reads),0);
 assert((await page.locator('[data-joey-daily=decisions]').innerText()).includes('回報沒有記錄待決策事項'));assert.equal(await page.locator('[data-task-review-action=approve]').count(),0);
 await page.locator('[data-joey-decision-entry]').click();await page.waitForFunction(()=>qa.c.snapshot().cloud.selectedConfirmed&&!qa.c.snapshot().busy);assert.equal(await page.locator('[data-joey-advanced]').evaluate(n=>n.open),true);assert.equal(await page.locator('[data-development-task-field=feature]').inputValue(),'Synthetic existing task');assert.equal(await page.evaluate(()=>qa.state().writes),0);
 await page.evaluate(()=>qa.revoke());await page.waitForFunction(()=>qa.c.snapshot().tasks.length===0);const reads=await page.evaluate(()=>qa.state().reads);await page.locator('[data-joey-decision-entry]').click();assert.equal(await page.evaluate(()=>qa.state().reads),reads);assert.equal(await page.evaluate(()=>qa.state().writes),0);assert((await page.locator('[data-joey-daily=decisions]').innerText()).includes('請先登入'));assert.equal(external,0);
 console.log(JSON.stringify({pass:true,qualification:'SYNTHETIC_OWNER_ACTUAL_VIEW_AND_TASK_CONTROLLER',existingTaskDirectlyReachable:true,completedReportDoesNotFabricateDecision:true,revokedOwnerRefused:true,external,writes:0,actualOwnerAcceptance:false}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
