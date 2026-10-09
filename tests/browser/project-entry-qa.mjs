// Actual app + official SDK, synthetic Auth/current Owner/clipboard only.
// Repository metadata is the verified read-only snapshot; no live repository, SQL or model calls.
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
import {productionResponse} from '../../api/index.mjs';
import {projectEntrySnapshots} from '../../src/continuity/project-entry-snapshots.mjs';
import {createProjectEntryServer} from '../../src/continuity/project-entry-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MC_PLAYWRIGHT_MODULE||(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'));
const OWNER='11111111-1111-4111-8111-111111111111',FACTOR='22222222-2222-4222-8222-222222222222',cases=[];
let origin,bundle,state,service,reads=0,writes=0,external=0;
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=()=>state.token||(state.token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:OWNER,role:'authenticated',aal:'aal2',exp:Math.floor(Date.now()/1000)+3600})+'.SYNTHETIC_SIGNATURE');
const user=()=>({id:OWNER,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',created_at:new Date().toISOString(),factors:[{id:FACTOR,factor_type:'totp',status:'verified'}],identities:[],app_metadata:{},user_metadata:{}});
const session=project=>({subject:OWNER,role:'OWNER',projectId:project,aal:'aal2',memberActive:state.active,sessionActive:state.active&&state.signedIn,expiresAt:state.expiry||Date.now()+60000});
const send=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,origin||'http://fixture.invalid');
 if(u.pathname==='/api/private/project-entry'){reads++;assert.equal(req.headers.authorization,'Bearer '+token());if(state.delay){state.delay=false;await new Promise(resolve=>state.release=resolve);}if(state.unavailable){state.unavailable=false;return send(res,{error:'SYNTHETIC_UNAVAILABLE'},503);}const r=await service.handle(req,{project:u.searchParams.get('project')});return send(res,r.body,r.status);}
 if(u.pathname==='/auth/v1/token'){state.signedIn=true;return send(res,{access_token:token(),refresh_token:'SYNTHETIC_REFRESH',expires_in:3600,token_type:'bearer',user:user()});}
 if(u.pathname==='/auth/v1/user')return send(res,user());if(u.pathname==='/auth/v1/logout'){state.signedIn=false;res.writeHead(204);return res.end();}
 if(u.pathname==='/rest/v1/rpc/mc_owner_session'){let text='';for await(const chunk of req)text+=chunk;return send(res,session(JSON.parse(text).project));}
 if(req.method!=='GET'){writes++;return send(res,{error:'UNEXPECTED_WRITE'},405);}
 if(u.pathname.startsWith('/api/')){const r=productionResponse('GET',new URL('https://fixture/api?route='+u.pathname.slice(5)));return send(res,r.body,r.status);}
 if(u.pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(bundle.outputFiles[0].text);}
 const path=u.pathname==='/'?'index.html':u.pathname.slice(1);if(!/^[A-Za-z0-9_-]+\.(html|css|js|svg)$/.test(path)){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript'});res.end(await fs.readFile('public/'+path));
 }catch(error){console.error('Synthetic project-entry failure: '+error.message);send(res,{error:'SYNTHETIC_FIXTURE_FAILURE'},500);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const policy={origin,publishableKey:'sb_publishable_SYNTHETIC',stageOrigin:origin,ownerSubject:OWNER,authSetupVerified:true,sessionBridgeVerified:true,privateReadSetupVerified:false,coordinatorReadSetupVerified:false,ownerDecisionSetupVerified:false};
service=createProjectEntryServer({ownerSubject:OWNER,allowedOrigin:origin,verifyOwner:async()=>({...session('NEXAEON'),verified:true})});
bundle=await build({entryPoints:['public/app.js'],bundle:true,format:'esm',write:false,metafile:true,plugins:[{name:'synthetic-entry',setup(b){
 b.onLoad({filter:/public\/owner-auth-client\.js$/},()=>({contents:"export {mountOwnerBrowserEntry} from '../src/continuity/owner-browser-entry.mjs';",resolveDir:process.cwd()+'/public'}));
 b.onLoad({filter:/owner-auth-config\.js$/},()=>({contents:'export const ownerAuthConfig='+JSON.stringify(policy)+';export const ownerAuthSetupStatus=()=>({status:"unconfigured",ownerIdentityEntryAvailable:true});'}));
 b.onLoad({filter:/task-workflow-config\.js$/},()=>({contents:'export const taskWorkflowConfig={enabled:false};'}));
 b.onLoad({filter:/vm-link-config\.js$/},()=>({contents:'export const vmLinkConfig={enabled:false};'}));
}}]});
assert(!Object.keys(bundle.metafile.inputs).some(p=>/project-entry-(snapshots|server)/.test(p)));for(const e of projectEntrySnapshots)assert(!bundle.outputFiles[0].text.includes(e.nextSteps));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),widget='[data-project-takeover=private]';
try{for(const [width,locale]of [[1440,'en'],[390,'zh-TW'],[320,'ko']]){
 state={active:true,signedIn:false};const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.syntheticCopies=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.syntheticClipboardDenied)throw Error('SYNTHETIC_DENIED');window.syntheticCopies.push(text);}}});});
 await context.route('**/*',route=>{if(!route.request().url().startsWith(origin)){external++;return route.abort();}return route.continue();});
 await page.goto(origin+'/#workspace?project=NEXAEON&panel=events&owner=signin');await page.locator('#locale-select').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));},locale);
 assert.equal(await page.locator(widget+' a').count(),0);await page.locator('input[type=email]').fill('synthetic@example.invalid');await page.locator('input[autocomplete=current-password]').fill('SYNTHETIC_PASSWORD');await page.locator('#owner-workspace-access form button').click();
 const choose=async project=>{if(width<=768)await page.locator('[data-workspace-panel=entries]').click();await page.locator('[data-command-project='+project+']').click();await page.waitForFunction(p=>document.querySelector('#command-workspace')?.dataset.project===p,project);if(width<=768)await page.locator('[data-workspace-panel=events]').click();};
 const loaded=async e=>{await page.locator(widget).waitFor({state:'visible'});await page.waitForFunction(({selector,sha})=>document.querySelector(selector)?.textContent.includes(sha),{selector:widget,sha:e.commitSha});};
 for(const e of projectEntrySnapshots){if(e.projectId!=='NEXAEON')await choose(e.projectId);await loaded(e);assert((await page.locator(widget).textContent()).includes(e.version));const before=reads,copied=await page.evaluate(()=>window.syntheticCopies.length);await page.locator(widget+' [data-project-entry-action=copy]').click();await page.waitForFunction(n=>window.syntheticCopies.length>n,copied);assert(reads>before);const text=await page.evaluate(()=>window.syntheticCopies.at(-1));assert(text.includes(e.repositoryId));assert(text.includes(e.commitSha));assert(text.includes('Last development Agent: not explicitly recorded'));assert(text.includes('not live website repository access'));assert.equal(await page.locator(widget+' select').count(),0);await page.locator(widget+' summary').click();for(const d of e.documents)assert.equal(await page.locator(widget+' a[href="https://github.com/'+e.repositoryId+'/blob/'+e.commitSha+'/'+d.path+'"]').count(),1);
  if(e.projectId==='JOEY_ASSET_SYSTEM'){assert(text.includes('CANDIDATE_JOEY_ACCEPTANCE_PENDING'));assert(text.includes(e.branches[0].commitSha+'/modules/education/university-lifecycle/docs/HANDOFF.md'));}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));cases.push({width,locale,project:e.projectId,pass:true});
 }
 await page.evaluate(()=>window.syntheticClipboardDenied=true);await page.locator(widget+' [data-project-entry-action=copy]').click();await page.locator('[data-project-entry-packet]').waitFor({state:'visible'});assert((await page.locator('[data-project-entry-packet]').textContent()).includes('JOEY_ASSET_SYSTEM'));
 await page.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.equal(await page.locator(widget+' a').count(),0);assert.equal(await page.locator('[data-project-entry-packet]').textContent(),'');await page.evaluate(()=>dispatchEvent(new Event('pageshow')));await loaded(projectEntrySnapshots[3]);
 const beforeLate=await page.evaluate(()=>window.syntheticCopies.length);state.delay=true;await page.locator(widget+' [data-project-entry-action=copy]').click();for(let i=0;i<100&&!state.release;i++)await page.waitForTimeout(10);assert(state.release);await choose('NEXAEON');state.release();delete state.release;await loaded(projectEntrySnapshots[0]);assert(!((await page.locator(widget).textContent()).includes(projectEntrySnapshots[3].commitSha)));assert.equal(await page.evaluate(()=>window.syntheticCopies.length),beforeLate);
 state.unavailable=true;await page.locator(widget+' [data-project-entry-action=read]').click();await page.waitForFunction(s=>document.querySelector(s+' button[data-project-entry-action=copy]')?.disabled&&!document.querySelector(s+' button[data-project-entry-action=read]')?.disabled,widget);assert.equal(await page.locator(widget+' a').count(),0);await page.locator(widget+' [data-project-entry-action=read]').click();await loaded(projectEntrySnapshots[0]);
 state.active=false;await page.locator(widget+' [data-project-entry-action=copy]').click();await page.waitForFunction(s=>document.querySelector(s+' a')===null,widget);assert.equal(await page.evaluate(()=>window.syntheticCopies.length),beforeLate);state.active=true;await page.locator(widget+' [data-project-entry-action=read]').click();await loaded(projectEntrySnapshots[0]);
 state.expiry=Date.now()+300;await page.locator(widget+' [data-project-entry-action=read]').click();await page.waitForTimeout(400);assert.equal(await page.locator(widget+' a').count(),0);delete state.expiry;
 await page.locator('#owner-workspace-access').evaluate(n=>n.open=true);await page.locator('#owner-workspace-access button').filter({hasText:locale==='en'?'Sign out':locale==='ko'?'로그아웃':'登出'}).click();assert.equal(await page.locator(widget+' a').count(),0);
 for(const storage of ['localStorage','sessionStorage'])assert(!await page.evaluate(({storage,sha})=>JSON.stringify(Object.entries(window[storage])).includes(sha),{storage,sha:projectEntrySnapshots[0].commitSha}));assert.deepEqual(errors,[]);await context.close();
 }assert.equal(external,0);assert.equal(writes,0);const report={pass:true,actualApp:true,officialSDK:true,repositoryAccess:'CONNECTOR_VERIFIED_METADATA_ONLY',auth:'SYNTHETIC',clipboard:'SYNTHETIC_OWNER_COPY',reads,externalRequests:external,unexpectedWrites:writes,cases,clearing:['pagehide','project-change','late-reply','unavailable','revocation','expiry','signout'],noNewPrivateMetadataInBundle:true};await fs.writeFile(process.argv[2]||'/tmp/mc-project-entry-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,cases:cases.length,reads,external,writes}));
}finally{state?.release?.();await browser.close();await new Promise(resolve=>server.close(resolve));}
