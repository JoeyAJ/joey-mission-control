// Real app/router/snapshot navigation. No Owner authentication or external writes.
import http from 'node:http';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {productionResponse} from '../../api/index.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
const screenshots='/workspace/mc-daily-navigation-qa';await fs.mkdir(screenshots,{recursive:true});let origin,writes=0,privateReads=0,external=0,unverified=false;
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,origin||'http://fixture');if(req.method!=='GET'){writes++;res.writeHead(405);return res.end('{}');}
 if(u.pathname.startsWith('/api/')){if(u.pathname.startsWith('/api/private/'))privateReads++;const r=productionResponse('GET',new URL('https://fixture/api?route='+u.pathname.slice(5)));const body=structuredClone(r.body);if(unverified&&u.pathname==='/api/state')body.projects.find(p=>p.id==='NEXAEON').projectUrls.entries[0].urlVerification='unverified';res.writeHead(r.status,{'Content-Type':'application/json'});return res.end(JSON.stringify(body));}
 const file=u.pathname==='/'?'index.html':u.pathname.slice(1);if(!/^[A-Za-z0-9_-]+\.(html|css|js|svg|png)$/.test(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'text/html'});res.end(await fs.readFile('public/'+file));
 }catch(error){res.writeHead(500);res.end('LOCAL_FIXTURE_ERROR');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'}),cases=[];
try{for(const width of [1440,390,320]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external++;return route.abort();});
 await page.goto(origin);await page.locator('[data-joey-daily=projects]').waitFor();
 const root=page.locator('section[data-joey-simple=true]'),advanced=page.locator('#advanced-navigation');
 assert.equal(await page.locator('body>nav>button[data-view]').count(),1);assert.equal(await page.locator('body>nav>button').innerText(),'Joey View · 日常總覽');assert.equal(await advanced.evaluate(n=>n.open),false);
 for(const [name,label]of [['projects','我的專案'],['progress','目前進度'],['decisions','等待我決策']]){assert(await root.locator('[data-joey-daily='+name+'] h3').innerText()===label);assert.equal(await root.locator('[data-joey-module='+name+'] .joey-module-label').innerText(),label);}
 assert.equal(await root.locator('[data-joey-advanced]').evaluate(n=>n.open),false);assert.equal(await root.locator('[data-joey-workspace-entry]').isVisible(),false);assert.equal(await root.locator('[data-development-task-open]').isVisible(),false);
 assert((await root.locator('[data-joey-daily=decisions]').innerText()).includes('才能確認目前是否有待你決策'));assert.equal(await root.locator('[data-task-review-action=approve]:visible').count(),0);
 assert.equal(await root.locator('[data-joey-public-site]').getAttribute('href'),'https://nexaeon-web.vercel.app/');assert.equal(await root.locator('[data-joey-public-site]').innerText(),'↗ 開啟專案成果');
 for(let repeat=0;repeat<2;repeat++){for(const name of ['progress','decisions','projects']){await root.locator('[data-joey-module='+name+']').click();assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('daily'),name);assert.equal(await root.locator('[data-joey-module='+name+']').getAttribute('aria-pressed'),'true');}}
 await root.locator('[data-joey-module=decisions]').click();await page.reload();await page.locator('[data-joey-module=decisions][aria-pressed=true]').waitFor();assert.equal(await page.locator('section[data-joey-simple=true]').count(),1);
 await page.locator('[data-joey-module=progress]').click();await page.goBack();await page.locator('[data-joey-module=decisions][aria-pressed=true]').waitFor();
 await page.locator('[data-joey-module=projects]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'progress');await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.dataset.joeyModule),'decisions');
 await page.locator('#joey-simple-project').selectOption('WOOSONG_BUDDY');assert.equal(await page.locator('[data-joey-public-site]').getAttribute('href'),'https://woosong-buddy-app.vercel.app/');await page.goBack();assert.equal(await page.locator('#joey-simple-project').inputValue(),'NEXAEON');
 for(const id of ['dashboard','inbox','workspaces','handoffs','project','workspace']){await page.locator('#advanced-navigation').evaluate(n=>n.open=true);await page.locator('#advanced-navigation [data-view='+id+']').click();await page.waitForFunction(id=>document.body.dataset.activeModule===id,id);assert.equal(await page.locator('#advanced-navigation').evaluate(n=>n.open),true);await page.locator('body>nav>button[data-view=joey]').click();await page.locator('[data-joey-daily=projects]').waitFor();assert.equal(await page.locator('#advanced-navigation').evaluate(n=>n.open),false);assert.equal(await page.locator('section[data-joey-simple=true]').count(),1);}
 await page.locator('[data-joey-advanced]>summary').click();assert(await page.locator('[data-joey-workspace-entry]').isVisible());await page.locator('[data-joey-advanced]>summary').click();
 await page.screenshot({path:screenshots+'/'+width+'-confirmed-url-daily.png',fullPage:true});
 unverified=true;await page.reload();await page.locator('[data-joey-public-site=unavailable]').waitFor();assert.equal(await page.locator('[data-joey-public-site]').getAttribute('href'),null);assert(await page.locator('[data-joey-public-site]').isDisabled());unverified=false;
 assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:screenshots+'/'+width+'-daily.png',fullPage:true});cases.push({width,pass:true,repeated:true,back:true,reload:true,advancedRoutes:6,unknownTruthful:true});await context.close();
 }assert.equal(writes,0);assert.equal(privateReads,0);assert.equal(external,0);const result={pass:true,cases,writes,privateReads,external,actualOwnerAcceptance:false};await fs.writeFile(screenshots+'/receipt.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
