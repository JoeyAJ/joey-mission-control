// Actual app and official Owner SDK, with intercepted public snapshot replies.
// No real Preview, Auth, repository, credential or database request is made.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {productionResponse} from '../../api/index.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
const PREVIEW='https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app';
const bundle=await build({entryPoints:['public/app.js'],bundle:true,format:'esm',write:false,plugins:[{name:'synthetic-origin-policy',setup(b){
 b.onLoad({filter:/public\/owner-auth-client\.js$/},()=>({contents:"export {mountOwnerBrowserEntry} from '../src/continuity/owner-browser-entry.mjs';",resolveDir:process.cwd()+'/public'}));
 b.onLoad({filter:/owner-auth-config\.js$/},async args=>({contents:(await fs.readFile(args.path,'utf8')).replace(/origin:'[^']*'/,'origin:'+JSON.stringify(PREVIEW)).replace(/publishableKey:'[^']*'/,"publishableKey:'sb_publishable_SYNTHETIC'").replace(/ownerSubject:'[^']*'/,"ownerSubject:'11111111-1111-4111-8111-111111111111'"),resolveDir:process.cwd()+'/public'}));
 b.onLoad({filter:/task-workflow-config\.js$/},()=>({contents:'export const taskWorkflowConfig={enabled:false,projectSourceSyncEnabled:true};'}));
 b.onLoad({filter:/vm-link-config\.js$/},()=>({contents:'export const vmLinkConfig={enabled:false};'}));
}}]});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),cases=[];
let external=0,writes=0,privateRequests=0,legacyContinueRequests=0;
try{
 for(const [kind,origin]of [['localhost','http://localhost:39471'],['other-origin','https://other-origin.invalid'],['fixed-preview',PREVIEW]])for(const [width,locale]of [[1440,'en'],[390,'zh-TW'],[320,'ko']]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==origin){external++;return route.abort();}
   if(req.method()!=='GET'){writes++;return route.fulfill({status:405,body:'{}'});}
   if(u.pathname.startsWith('/api/private/')){privateRequests++;return route.fulfill({status:403,body:'{}'});}
   if(u.pathname.endsWith('/continue'))legacyContinueRequests++;
   if(u.pathname.startsWith('/api/')){const r=productionResponse('GET',new URL('https://fixture/api?route='+u.pathname.slice(5)));return route.fulfill({status:r.status,contentType:'application/json',body:JSON.stringify(r.body)});}
   if(u.pathname==='/app.js')return route.fulfill({status:200,contentType:'text/javascript',body:bundle.outputFiles[0].text});
   const name=u.pathname==='/'?'index.html':u.pathname.slice(1);
   if(!/^[A-Za-z0-9_-]+\.(html|css|js|svg)$/.test(name))return route.fulfill({status:404,body:''});
   return route.fulfill({status:200,contentType:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript',body:await fs.readFile('public/'+name)});
  });
  await page.goto(origin+'/#project?project=WOOSONG_BUDDY');
  await page.locator('#locale-select').evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('change',{bubbles:true}));},locale);
  if(kind!=='fixed-preview'){
   for(const project of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']){
    await page.evaluate(p=>{location.hash='#project?project='+p;},project);await page.locator('#project.active').waitFor();
    await page.waitForFunction(()=>document.querySelector('#continue-result')?.dataset.continueAvailability==='historical-readonly');
    assert(await page.locator('#continue-button').isDisabled());assert((await page.locator('#continue-result').innerText()).includes({en:'Historical records are read-only','zh-TW':'歷史記錄僅供唯讀參考',ko:'과거 기록은 읽기 전용'}[locale]));
    await page.locator('#continue-button').evaluate(n=>n.dispatchEvent(new Event('click')));assert.equal(legacyContinueRequests,0);
   }
   await page.reload();await page.locator('#project.active').waitFor();assert(await page.locator('#continue-button').isDisabled());
   await page.evaluate(()=>{location.hash='#workspace?project=JOEY_ASSET_SYSTEM&panel=context&track=UNIVERSITY_CANDIDATE';});await page.locator('#workspace.active').waitFor();
   assert(await page.locator('[data-project-continue=unavailable]').isDisabled());assert(await page.locator('[data-project-continue-notice=unavailable]').isVisible());assert.equal(await page.locator('[data-agent-handoff-packet]').count(),0);
   await page.goBack();await page.locator('#project.active').waitFor();await page.goForward();await page.locator('#workspace.active').waitFor();assert(await page.locator('[data-project-continue=unavailable]').isDisabled());
  }else{
   await page.waitForFunction(()=>location.hash.startsWith('#workspace?'));await page.waitForFunction(()=>document.querySelector('#owner-workspace-access')?.dataset.ownerAuth==='signed_out');
   if(width<=768)await page.locator('[data-workspace-panel=context]').click();
   assert(await page.locator('[data-project-continue=verified-source]').isEnabled());assert.equal(await page.locator('[data-project-continue-notice]').count(),0);
   await page.locator('[data-project-continue=verified-source]').click();assert.equal(await page.locator('#continue-result').textContent(),'');
   assert(!await page.locator('[data-agent-handoff-packet]').isVisible());
  }
  assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  cases.push({kind,width,locale,pass:true,actualApp:true,interceptedPublicReplies:true,privateCapability:kind==='fixed-preview'});await context.close();
 }
 assert.equal(external,0);assert.equal(writes,0);assert.equal(privateRequests,0);assert.equal(legacyContinueRequests,0);
 const report={pass:true,actualApp:true,actualOwnerAuth:false,actualRemoteRepositoryRead:false,external,writes,privateRequests,legacyContinueRequests,cases};
 await fs.writeFile(process.argv[2]||'/tmp/mc-continue-origin-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,cases:cases.length,external,writes,privateRequests,legacyContinueRequests}));
}finally{await browser.close();}
