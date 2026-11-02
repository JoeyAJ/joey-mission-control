// Actual Tower DOM/CSS; Owner data synthetic. No real session, remote request or mutation.
import http from 'node:http';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const script=`import {renderControlTower} from '/control-tower.js';
import {withMissionControlProject} from '/mission-control-project.js';
const guest=new URLSearchParams(location.search).has('guest');
const fixed=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'].map(id=>({id,name:id,status:'Active'}));
const projects=withMissionControlProject([...fixed,...(guest?[]:[{id:'AI_INTERACTIVE_EXPERIENCE_ENGINE',name:'AI Engine',status:'Active',kind:'registered'}])]);
const render=()=>{const q=new URLSearchParams(location.hash.slice(1));document.querySelector('main').replaceChildren(renderControlTower({projects,runsByProject:{},guest,signedIn:!guest,locale:new URLSearchParams(location.search).get('locale')||'en',storage:localStorage,detailId:q.get('detail'),view:q.get('view')||'list',onOpenDetail:id=>location.hash='detail='+id,onBack:()=>location.hash='',onView:v=>location.hash='view='+v,onDetails:id=>{document.body.dataset.workspace=id;},mountHandoff:(host)=>{host.append(document.createTextNode('Synthetic verified handoff'));return()=>{};}}));};addEventListener('hashchange',render);render();`;
const server=http.createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/control-tower.css"><body class="tower-mode"><main></main><script type="module" src="/fixture.js"></script>');}if(p==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(script);}if(!/^\/[a-z0-9.-]+\.(js|css)$/.test(p)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'text/css');res.end(await fs.readFile('public'+p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;try{browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let cases=0;
for(const width of [375,1440])for(const locale of ['zh-TW','ko','en'])for(const guest of [false,true]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/?locale='+locale+(guest?'&guest=1':''));
 await page.locator('[data-project="MISSION_CONTROL"]').waitFor();
 assert.equal(await page.locator('[data-project="AI_INTERACTIVE_EXPERIENCE_ENGINE"]').count(),guest?0:1);
 for(let i=0;i<2;i++){
  await page.locator('[data-project="MISSION_CONTROL"] .tower-name-link').click();
  await page.locator('.tower-detail-mode').waitFor();
  assert.equal(await page.locator('a[href*="github.com/JoeyAJ/joey-mission-control/"]').count(),guest?0:4);
  if(!guest){await page.locator('.tower-detail-tech summary').click();assert.ok(await page.locator('a[href$="/main/HANDOFF.md"]').isVisible());}
  await page.locator('.tower-back').click();await page.locator('.tower-detail-mode').waitFor({state:'detached'});await page.locator('[data-project="MISSION_CONTROL"]').waitFor();
 }
 if(!guest){for(let i=0;i<2;i++){await page.locator('[data-project="MISSION_CONTROL"] .tower-primary').click();await page.locator('dialog[open]').waitFor();await page.locator('.tower-sheet-actions button').last().click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}}
 await page.evaluate(()=>location.hash='view=board');await page.locator('.tower-board').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width+' '+locale);
 assert.deepEqual(errors,[]);await page.close();cases++;
}console.log(JSON.stringify({status:'PASS',cases,widths:[375,1440],locales:['zh-TW','ko','en'],boundary:'synthetic Owner; guest has no registry or private technical links; repeated detail/back, handoff open/close, list/board'}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
