// Actual app startup/history with public snapshot data and signed-out synthetic Auth.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {productionResponse} from '../../api/index.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
let origin,bundle,externalRequests=0,unexpectedWrites=0,privateRequests=0;
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin||'http://fixture.invalid');
  if(req.method!=='GET'){unexpectedWrites++;res.writeHead(405);res.end();return;}
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.startsWith('/api/private/'))privateRequests++;
   const result=productionResponse(req.method,new URL('https://fixture/api/index?route='+url.pathname.slice(5)));
   res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result.body));return;
  }
  if(url.pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bundle.outputFiles[0].text);return;}
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!/^[a-zA-Z0-9_-]+\.(html|css|js|svg)$/.test(file)){res.writeHead(404);res.end();return;}
  const data=await fs.readFile('public/'+file);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const policy={origin,publishableKey:'sb_publishable_SYNTHETIC_ONLY',stageOrigin:origin,ownerSubject:'11111111-1111-4111-8111-111111111111',authSetupVerified:true,sessionBridgeVerified:true,privateReadSetupVerified:false,coordinatorReadSetupVerified:false,ownerDecisionSetupVerified:false};
bundle=await build({entryPoints:['public/app.js'],bundle:true,format:'esm',write:false,metafile:true,plugins:[{name:'synthetic-auth-config',setup(build){
 build.onLoad({filter:/public\/owner-auth-client\.js$/},()=>({contents:"export {mountOwnerBrowserEntry,joeyRunSummary,renderSelectedTaskSummary,projectHandoffWords} from '../src/continuity/owner-browser-entry.mjs';",resolveDir:process.cwd()+'/public'}));
 build.onLoad({filter:/owner-auth-config\.js$/},()=>({contents:'export const ownerAuthConfig=Object.freeze('+JSON.stringify(policy)+');export const ownerAuthSetupStatus=()=>({status:"unconfigured",ownerIdentityEntryAvailable:true});'}));
 build.onLoad({filter:/vm-link-config\.js$/},()=>({contents:'export const vmLinkConfig={enabled:false};'}));
}}]});
assert(Object.keys(bundle.metafile.inputs).includes('public/app.js'));assert(Object.keys(bundle.metafile.inputs).includes('public/proposal-navigation.js'));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),cases=[];
const deepLink='#workspace?project=MISSION_CONTROL&panel=events&owner=signin';
try{
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{if(!route.request().url().startsWith(origin)){externalRequests++;return route.abort();}return route.continue();});
  const selected=async project=>{try{await page.waitForFunction(project=>document.querySelector('#workspace.active #command-workspace')?.dataset.project===project,project);}catch(error){console.error(JSON.stringify({expected:project,errors,view:await page.evaluate(()=>({hash:location.hash,active:document.body.dataset.activeModule,project:document.querySelector('#command-workspace')?.dataset.project,status:document.querySelector('#status')?.textContent}))}));throw error;}assert.equal(await page.locator('[data-command-project="'+project+'"]').getAttribute('aria-pressed'),'true');};
  const choose=async project=>{if(width<=768)await page.locator('[data-workspace-panel=entries]').click();await page.locator('[data-command-project="'+project+'"]').click();await selected(project);};
  await page.goto(origin+'/'+deepLink);await selected('MISSION_CONTROL');
  await page.waitForFunction(()=>document.querySelector('.owner-auth-entry')?.dataset.ownerAuth==='signed_out');
  assert.equal(await page.locator('#owner-workspace-access').getAttribute('open'),'');
  assert.equal(await page.locator('[data-remote-handoff-transport]').isVisible(),false);
  assert.equal(await page.locator('[data-command-project]').count(),5);
  await page.reload();await selected('MISSION_CONTROL');
  await choose('NEXAEON');await page.goBack();await selected('MISSION_CONTROL');await page.goForward();await selected('NEXAEON');
  for(const project of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']){await choose(project);await page.reload();await selected(project);await choose('MISSION_CONTROL');await page.reload();await selected('MISSION_CONTROL');}
  await page.goto(origin+'/#joey?project=MISSION_CONTROL&module=proposal');await page.locator('#joey.active').waitFor();await page.waitForFunction(()=>document.querySelector('section[data-joey-simple=true]')?.dataset.project==='MISSION_CONTROL');assert.equal(await page.locator('#joey-simple-project').inputValue(),'MISSION_CONTROL');assert.equal(await page.locator('#workspace.active').count(),0);
  await page.goto(origin+'/'+deepLink);await selected('MISSION_CONTROL');
  const fresh=await context.newPage();await fresh.goto(origin+'/'+deepLink);await fresh.waitForFunction(()=>document.querySelector('#workspace.active #command-workspace')?.dataset.project==='MISSION_CONTROL');await fresh.close();
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  cases.push({width,pass:true,actualApp:true,directOpen:true,refresh:true,backForward:true,allProjectSwitches:true,freshTab:true,proposalScopeUnchanged:true,signedOutSourceHidden:true,noOverflow:true});await context.close();
 }
 assert.equal(externalRequests,0);assert.equal(unexpectedWrites,0);assert.equal(privateRequests,0);
 const report={pass:true,localHTTP:true,actualApp:true,syntheticAuth:true,actualOwnerVerified:false,externalRequests,unexpectedWrites,privateRequests,cases};
 await fs.writeFile(process.argv[2]||'/tmp/remote-handoff-route-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,cases:cases.length,externalRequests,unexpectedWrites,privateRequests}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
