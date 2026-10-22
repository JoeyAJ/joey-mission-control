import test from 'node:test';
import assert from 'node:assert/strict';
import {renderControlTower,towerWords} from '../public/control-tower.js';
import {demoTower} from '../public/tower-demo.js';
import handler,{productionResponse,guestSafe} from '../api/index.mjs';
import {ownerAuthConfig} from '../public/owner-auth-config.js';
function fakeDoc(){const make=tag=>{const n={tag,children:[],className:'',textContent:'',dataset:{},style:{setProperty(){}},attrs:{},classList:{add(){},remove(){}},setAttribute(k,v){n.attrs[k]=v;},append(...c){n.children.push(...c);},prepend(...c){n.children.unshift(...c);},addEventListener(){},querySelector(){return null;},replaceChildren(...c){n.children=c;},remove(){}};return n;};return{createElement:make};}
const text=n=>[n.textContent,...(n.children||[]).map(text)].join(' ');
const all=n=>[n,...(n.children||[]).flatMap(all)];
const find=(n,cls)=>all(n).filter(x=>String(x.className||'').split(' ').includes(cls));
const mem=()=>({getItem:()=>null,setItem(){}});
const now=Date.parse('2026-10-21T09:00:00Z');
const noop=()=>{};
const owner={onStatus:noop,onDecision:noop,onIdea:async()=>{},onIdeaEdit:async()=>{},mountHandoff:()=>noop,prepareInstruction:async()=>'x',onDetails:noop,onAdvanced:noop};
const guest=extra=>renderControlTower({doc:fakeDoc(),...demoTower(now),now,guest:true,signedIn:false,storage:mem(),onView:noop,...owner,...extra});

for(const locale of ['zh-TW','en','ko'])test('guest view shows the read-only note and hides every action ('+locale+')',()=>{
 const w=towerWords(locale);
 for(const root of [guest({locale}),guest({locale,view:'board'})]){
  assert.equal(root.dataset.guest,'true');assert.equal(find(root,'tower-banner-guest').length,1);assert.ok(w.guestBanner);
  const labels=all(root).filter(n=>n.tag==='button'||n.tag==='select').map(n=>n.textContent);for(const word of [w.handoff,w.reviewBtn,w.advanced,w.continue,w.shelve,w.startDev,w.reject,w.cancelHandoff,w.remove,w.edit,w.reReview])if(word)assert.ok(!labels.includes(word),word);
  assert.equal(all(root).filter(n=>n.tag==='select'&&n.attrs['aria-label']!==w.lang).length,0);
  assert.equal(find(root,'tower-fab').length,0);assert.equal(find(root,'tower-status-pick').length,0);
  assert.equal(all(root).filter(n=>n.tag==='button'&&String(n.className).includes('tower-primary')).length,0);
 }
 assert.match(text(guest({locale:'zh-TW'})),/訪客僅供瀏覽/);
});

test('guest detail keeps progress and run timeline but hides touched files, repository, branch and technical links',()=>{
 for(const id of ['DEMO_H','DEMO_R','DEMO_A']){const d=guest({detailId:id});
  assert.equal(find(d,'tower-file').length,0);assert.equal(find(d,'tower-files').length,0);assert.equal(find(d,'tower-detail-tech').length,0);
  assert.doesNotMatch(text(d),/HANDOFF\.md|config\/sheet\.json|JoeyAJ\/|github\.com/);}
 assert.ok(find(guest({detailId:'DEMO_H'}),'tower-run-step').length>0);
 const owned=renderControlTower({doc:fakeDoc(),...demoTower(now),now,demo:true,storage:mem(),detailId:'DEMO_H',...owner});assert.ok(find(owned,'tower-file').length>0);
});

test('owner (signed in) keeps handoff, review and status controls',()=>{
 const w=towerWords('zh-TW'),root=renderControlTower({doc:fakeDoc(),...demoTower(now),now,demo:true,storage:mem(),...owner});
 assert.equal(find(root,'tower-banner-guest').length,0);assert.match(text(root),new RegExp(w.handoff));assert.ok(find(root,'tower-status-pick').length>0);
});

test('public API responses withhold repository remotes and branch names',()=>{
 const ids=productionResponse('GET',new URL('https://f/api/index?route=projects')).body.map(p=>p.project_id);
 const routes=['health','state','projects','handoffs','workspaces','stage-changes','public-cases',...ids.flatMap(id=>['projects/'+id,'projects/'+id+'/continue','projects/'+id+'/manifest','projects/'+id+'/runtime','projects/'+id+'/activity'])];
 for(const r of routes){const s=JSON.stringify(productionResponse('GET',new URL('https://f/api/index?route='+r)).body);assert.doesNotMatch(s,/git@github\.com|github\.com\/JoeyAJ|"branch":"(?!\[withheld\])/,r);}
 assert.deepEqual(guestSafe({origin:'git@github.com:JoeyAJ/x.git',branch:'main',note:'see https://github.com/JoeyAJ/x'}),{origin:'[withheld]',branch:'[withheld]',note:'see [repository withheld]'});
});

const call=(route,{method='POST',host=new URL(ownerAuthConfig.stageOrigin).host,headers={}}={})=>new Promise(resolve=>{
 const res={status:0,writeHead(s){this.status=s;},end(b){resolve({status:this.status,body:b});}};
 const chunks=[Buffer.from('{}')];const req={method,url:'/api/index?route='+route,headers:{host,'content-type':'application/json',...headers},[Symbol.asyncIterator]:async function*(){yield* chunks;},on(e,f){if(e==='data')f(chunks[0]);if(e==='end')f();return this;}};
 Promise.resolve(handler(req,res)).catch(()=>resolve({status:500}));
});
test('every write route rejects unauthenticated requests on the owner origin and elsewhere',async()=>{
 const routes=['private/remote-handoff','private/repository-runs','private/project-entry','private/project-onboarding','private/project-registration','private/project-registration/verify','private/project-registrations','private/project-drafts','private/task-reconciliation','private/development-tasks','private/task-review-decisions','inbox','projects/NEXAEON/continue','sessions'];
 for(const route of routes)for(const method of ['POST','PATCH','PUT','DELETE']){for(const host of [new URL(ownerAuthConfig.stageOrigin).host,'guest.example']){for(const headers of [{},{origin:ownerAuthConfig.stageOrigin}]){const r=await call(route,{method,host,headers});if(process.env.SHOW)console.log(route,method,host,r.status,String(r.body).slice(0,90));assert.ok(r.status>=400&&r.status<600,route+' '+method+' '+host+' -> '+r.status);assert.doesNotMatch(String(r.body||''),/gh[pousr]_|sk-[A-Za-z0-9]|Bearer\s|PRIVATE KEY/);}}}
});
test('owner-only reads (live runs, registry catalog, drafts, handoff source) refuse unauthenticated guests',async()=>{
 for(const route of ['private/repository-runs','private/project-registrations','private/project-drafts','private/remote-handoff','private/project-entry','private/development-tasks','private/task-review-decisions'])for(const headers of [{},{origin:ownerAuthConfig.stageOrigin}]){const r=await call(route,{method:'GET',headers});if(process.env.SHOW)console.log('GET',route,r.status,String(r.body).slice(0,80));assert.ok(r.status>=400&&r.status<600,route+' -> '+r.status);}
});

test('guest sees one small Owner sign-in link; the existing login panel is revealed only after clicking it',()=>{
 const base=fakeDoc(),listeners=[];const doc={...base,createElement(tag){const n=base.createElement(tag);n.addEventListener=(type,fn)=>listeners.push({n,type,fn});return n;}};
 const account={tag:'details',open:true,children:[],textContent:'開啟 Ubuntu-1 連線面板',dataset:{},matches:s=>s==='details',querySelector:()=>null};
 for(const [locale,label] of [['zh-TW','擁有者登入'],['en','Owner sign-in'],['ko','소유자 로그인']])assert.equal(towerWords(locale).ownerLogin,label);
 const root=renderControlTower({doc,...demoTower(now),now,guest:true,signedIn:false,storage:mem(),onView:noop,...owner,account});
 const links=all(root).filter(n=>n.dataset?.ownerLoginLink==='true');assert.equal(links.length,1);assert.equal(links[0].textContent,'擁有者登入');
 const wrap=find(root,'tower-account')[0];assert.equal(wrap.hidden,true);assert.ok(wrap.children.includes(account));
 const click=listeners.find(l=>l.n===links[0]&&l.type==='click');assert.ok(click);click.fn();
 assert.equal(wrap.hidden,false);assert.equal(account.open,true);
 const owned=renderControlTower({doc:fakeDoc(),...demoTower(now),now,guest:false,signedIn:true,storage:mem(),onView:noop,...owner,account});
 assert.equal(all(owned).filter(n=>n.dataset?.ownerLoginLink==='true').length,0);assert.notEqual(find(owned,'tower-account')[0].hidden,true);
});
