// Real public app/controller and recorded production API; scroll geometry is test-only.
import http from 'node:http';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {productionResponse} from '../../api/index.mjs';
import {createApp} from '../../src/server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const before=process.env.MC_QA_CONTINUITY_EXPECT==='before',localHandler=createApp({});let mutationRequests=0;
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://fixture');if(u.pathname.startsWith('/api/')){if(req.method!=='GET')mutationRequests++;const url=new URL('https://fixture/api/index');url.searchParams.set('route',u.pathname.slice(5));const r=productionResponse(req.method,url);res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(r.body));return;}if(u.pathname==='/qa-geometry.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end('.command-events::after,.command-explorer::after,.command-inspector::after{content:"";display:block;height:1200px;pointer-events:none}');return;}return localHandler(req,res);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),cases=[];let externalRequests=0;
try{
 for(const width of before?[1440]:[1440,870,390,320])for(const locale of before?['en']:['zh-TW','en','ko']){
  const context=await browser.newContext({viewport:{width,height:900}});await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){externalRequests++;return r.abort();}return r.continue();});const page=await context.newPage(),errors=[];page.on('pageerror',()=>errors.push(true));
  await page.goto(origin+'/#workspace?project=WOOSONG_BUDDY&item=receipt&panel=context');await page.locator('[data-command-inspector=receipt]').waitFor();await page.locator('details.utility-menu').evaluate(n=>n.open=true);await page.locator('#locale-select').selectOption(locale);await page.locator('details.utility-menu').evaluate(n=>n.open=false);
  // Geometry canaries add no events, agents, source text or private data.
  await page.addStyleTag({url:origin+'/qa-geometry.css'});
  const scroll=async()=>page.evaluate(()=>Object.fromEntries(['.command-events','.command-layout>.command-explorer','.command-inspector'].map(s=>[s,document.querySelector(s)?.scrollTop||0])));
  if(width>768){
   const stage=page.locator('[data-explorer-item=stage]');await stage.focus();await page.evaluate(()=>{document.querySelector('.command-events').scrollTop=180;document.querySelector('.command-inspector').scrollTop=150;});await page.keyboard.press('Enter');await page.locator('[data-command-inspector=stage]').waitFor();
   const active=await page.evaluate(()=>document.activeElement?.getAttribute('data-explorer-item')),position=await scroll();
   if(before){assert.equal(active,null);assert.equal(position['.command-events'],0);cases.push({width,locale,baselineLostKeyboardFocus:true,baselineResetIndependentTimeline:true});await context.close();continue;}
   assert.equal(active,'stage');assert.equal(position['.command-events'],180);assert.equal(position['.command-inspector'],0);
   await page.locator('.command-source-details>summary').click();await page.evaluate(()=>{document.querySelector('.command-inspector').scrollTop=150;document.querySelector('.command-events').scrollTop=180;});
   await page.locator('[data-command-refresh]').click();await page.waitForFunction(()=>!document.querySelector('[data-command-refresh]').disabled);assert.equal((await scroll())['.command-inspector'],150);assert.equal((await scroll())['.command-events'],180);assert(await page.locator('.command-source-details').evaluate(n=>n.open));
   await page.locator('button[data-inspector-tab=graph]').focus();await page.keyboard.press('Enter');await page.locator('[data-inspector-tab=graph][aria-pressed=true]').waitFor();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-inspector-tab')),'graph');
   await page.locator('[data-graph-event=receipt]').focus();await page.keyboard.press('Enter');await page.locator('[data-command-inspector=receipt]').waitFor();assert.equal((await scroll())['.command-events'],180);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-graph-event')),'receipt');
   await page.locator('[data-command-project=NEXAEON]').click();await page.locator('#command-workspace[data-project=NEXAEON]').waitFor();assert.equal((await scroll())['.command-events'],0);assert.equal((await scroll())['.command-inspector'],0);
  }else{
   await page.locator('[data-workspace-panel=events]').click();await page.locator('[data-command-event=stage]').focus();await page.evaluate(()=>document.querySelector('.command-events').scrollTop=20);await page.keyboard.press('Enter');await page.locator('[data-command-inspector=stage]').waitFor();
   assert(await page.evaluate(()=>document.activeElement?.matches('.command-inspector h5')));await page.locator('[data-workspace-panel=events]').click();assert.equal((await scroll())['.command-events'],20);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-workspace-panel')),'events');
   await page.evaluate(()=>document.querySelector('.command-events').scrollTop=180);await page.locator('[data-workspace-panel=context]').click();await page.locator('[data-workspace-panel=events]').click();assert.equal((await scroll())['.command-events'],180);
   await page.locator('[data-workspace-panel=context]').click();await page.locator('[data-inspector-tab=explorer]').click();await page.locator('[data-mobile-explorer-item=receipt]').focus();await page.keyboard.press('Enter');await page.locator('[data-command-inspector=receipt]').waitFor();assert(await page.evaluate(()=>document.activeElement?.matches('.command-inspector h5')));
   await page.locator('[data-workspace-panel=entries]').click();await page.locator('[data-command-project=NEXAEON]').click();await page.locator('[data-workspace-panel=events]').click();assert.equal((await scroll())['.command-events'],0);
  }
  if(width<=768)await page.locator('[data-workspace-panel=events]').click();await page.evaluate(()=>document.querySelector('.command-events').scrollTop=180);
  await page.locator('.command-workspace-head button:last-child').click();await page.locator('.workspace-entry').click();assert.equal((await scroll())['.command-events'],180);
  await page.route('**/api/state',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA_READ_FAILURE'})}));
  await page.locator('[data-command-refresh]').click();await page.locator('#data-link-status[data-failed=true]').waitFor();assert.equal((await scroll())['.command-events'],180);assert.equal(await page.locator('#command-workspace').getAttribute('data-project'),'NEXAEON');
  await page.unroute('**/api/state');await page.locator('[data-command-refresh]').click();await page.locator('#data-link-status[data-failed=false]').waitFor();assert.equal((await scroll())['.command-events'],180);
  if(width<=768)await page.locator('[data-workspace-panel=context]').click();await page.locator('button[data-inspector-tab=graph]').click();await page.locator('button[data-inspector-tab=changes]').click();await page.goBack();await page.locator('button[data-inspector-tab=graph][aria-pressed=true]').waitFor();await page.goForward();await page.locator('button[data-inspector-tab=changes][aria-pressed=true]').waitFor();if(width<=768)await page.locator('[data-workspace-panel=events]').click();assert.equal((await scroll())['.command-events'],180);
  await page.locator('details.utility-menu>summary').focus();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert(await page.evaluate(()=>document.activeElement?.matches('details.utility-menu>summary')));
  await page.reload();await page.locator('button[data-inspector-tab=changes][aria-pressed=true]').waitFor({state:'attached'});assert.equal(await page.locator('#command-workspace').getAttribute('data-project'),'NEXAEON');assert.equal((await scroll())['.command-events'],0);
  assert.equal(await page.locator('[data-runtime=disconnected]').count(),1);assert.equal(await page.locator('[data-owner-decision-confirm]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(errors.length,0);
  cases.push({width,locale,keyboardFocusContinues:true,independentPaneScrollRetained:true,newSelectionStartsAtTop:true,sameSelectionRefreshRetained:width>768,mobileHiddenPaneRetained:width<=768,projectSwitchResets:true,workspaceReturnRetained:true,readFailureRecoveryRetained:true,historyRetainsReading:true,reloadRetainsRouteAndClearsTransientGeometry:true,outsideFocusNotStolen:true,noRuntimeInvented:true,noOwnerDecisionSubmit:true});await context.close();
 }
 assert.equal(externalRequests,0);assert.equal(mutationRequests,0);const receipt={pass:true,beforeFixReproduction:before,recordedPublicApi:true,actualLocalStaticHandler:true,syntheticScrollGeometryOnly:true,externalRequests,mutationRequests,cases};await fs.writeFile(process.env.MC_QA_OUTPUT||'/workspace/mc-deliverables/workspace-reading-browser.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({pass:true,beforeFixReproduction:before,cases:cases.length,externalRequests,mutationRequests}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
