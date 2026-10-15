import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowerRefresh,SIGNED_IN_MS,SIGNED_OUT_MS} from '../public/tower-refresh.js';
import {renderControlTower,towerWords} from '../public/control-tower.js';

// Manual timers: run(delay) fires the timers registered with that delay.
function clock(){const timers=new Map();let id=0;return{setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimer:i=>timers.delete(i),pending:()=>[...timers.values()].map(t=>t.ms).sort((a,b)=>a-b),async run(ms){for(const [i,t] of [...timers])if(t.ms===ms){timers.delete(i);await t.fn();}}};}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};

test('the first Owner read starts immediately and the board stays loading until it settles',async()=>{
 const c=clock(),first=deferred(),phases=[];let reads=0;
 const r=createTowerRefresh({read:()=>{reads++;return first.promise;},render:()=>{phases.push(r.phase);r.schedule();},setTimer:c.setTimer,clearTimer:c.clearTimer,slowMs:15000});
 assert.equal(r.phase,'loading');r.schedule();
 assert.deepEqual(c.pending(),[0,15000]);// no 5 s wait before the first read
 const tick=c.run(0);await Promise.resolve();assert.equal(reads,1);
 // Re-renders while the read is in flight never start a second read.
 r.schedule();r.schedule();assert.deepEqual(c.pending(),[15000]);
 first.resolve({ready:true,changed:false});await tick;
 assert.deepEqual(phases,['ready']);assert.equal(r.phase,'ready');assert.deepEqual(c.pending(),[SIGNED_IN_MS]);
});
test('a signed-out or failed first read settles at once and keeps polling for sign-in',async()=>{
 for(const outcome of [()=>Promise.resolve({ready:false,changed:false}),()=>Promise.reject(Error('offline'))]){
  const c=clock(),phases=[];const r=createTowerRefresh({read:outcome,render:()=>{phases.push(r.phase);r.schedule();},setTimer:c.setTimer,clearTimer:c.clearTimer});
  r.schedule();await c.run(0);
  assert.deepEqual(phases,['ready']);assert.deepEqual(c.pending(),[SIGNED_OUT_MS]);
 }
});
test('a slow first read shows the board with an out-of-date notice, then the live result',async()=>{
 const c=clock(),first=deferred(),phases=[];const r=createTowerRefresh({read:()=>first.promise,render:()=>{phases.push(r.phase);r.schedule();},setTimer:c.setTimer,clearTimer:c.clearTimer,slowMs:15000});
 r.schedule();const tick=c.run(0);await c.run(15000);
 assert.deepEqual(phases,['slow']);
 first.resolve({ready:true,changed:true});await tick;assert.deepEqual(phases,['slow','ready']);
});
test('later refreshes skip hidden pages and only re-render on change',async()=>{
 const c=clock();let visible=false,reads=0,renders=0;const r=createTowerRefresh({read:async()=>{reads++;return {ready:true,changed:reads===3};},render:()=>{renders++;r.schedule();},canRefresh:()=>visible,setTimer:c.setTimer,clearTimer:c.clearTimer});
 r.schedule();await c.run(0);assert.equal(renders,1);
 await c.run(SIGNED_IN_MS);assert.equal(reads,1);// hidden: no read
 visible=true;await c.run(SIGNED_IN_MS);assert.equal(reads,2);assert.equal(renders,1);
 await c.run(SIGNED_IN_MS);assert.equal(reads,3);assert.equal(renders,2);
});

// Minimal DOM for rendering checks.
function fakeDoc(){const make=tag=>{const n={tag,children:[],className:'',textContent:'',dataset:{},style:{setProperty(){}},attrs:{},classList:{add(){},remove(){}},setAttribute(k,v){n.attrs[k]=v;},append(...c){n.children.push(...c);},prepend(...c){n.children.unshift(...c);},addEventListener(){},querySelector(){return null;},replaceChildren(...c){n.children=c;},remove(){}};return n;};return{createElement:make};}
const text=n=>[n.textContent,...(n.children||[]).map(text)].join(' ');
const storage=seed=>({getItem:k=>seed[k]??null,setItem(){}});

test('while loading the tower shows a status message and no project cards or stale handoffs',()=>{
 const projects=[{id:'A',name:'Alpha',status:'Active'}],handoffs={'mc.tower.handoffs.v1':JSON.stringify({A:{agent:'codex',goal:'old',at:new Date().toISOString()}})};
 for(const locale of ['zh-TW','ko','en']){
  const w=towerWords(locale),root=renderControlTower({doc:fakeDoc(),locale,projects,loading:true,signedIn:false,storage:storage(handoffs)});
  const all=text(root);assert.match(all,new RegExp(w.loading.replace('…','')));assert.ok(!all.includes('Alpha'));assert.ok(!all.includes(w.signin));
  assert.deepEqual(root.towerModel.cards,[]);
  const box=root.children.find(n=>n.className==='tower-loading');assert.equal(box.attrs.role,'status');assert.equal(box.attrs['aria-busy'],'true');
 }
 const slow=renderControlTower({doc:fakeDoc(),locale:'en',projects,loadingSlow:true,storage:storage({})});
 assert.match(text(slow),/may not be current/);assert.match(text(slow),/Alpha/);
});
test('registered cards show the catalog version instead of "Registered" once development started',()=>{
 const w=towerWords('zh-TW'),root=renderControlTower({doc:fakeDoc(),projects:[{id:'E',name:'Engine',kind:'registered',status:'Active',version:'v0.5',lastAgent:'Claude Code',asOf:'2026-10-15',updatedAt:'2026-10-15'},{id:'P',name:'Pending',kind:'registered',status:'Idea'}],storage:storage({})});
 const find=(n,cls,out=[])=>{if(n.className===cls)out.push(n);for(const c of n.children||[])find(c,cls,out);return out;};
 assert.deepEqual(find(root,'tower-version').map(n=>n.textContent).sort(),['v0.5',w.registered].sort());// the pending one still reads "已登記"
 assert.ok(find(root,'tower-pilot-name').some(n=>n.textContent==='Claude Code'));
});

test('registered projects show their catalog website and catalog facts instead of a workspace they are not in',async()=>{
 const {catalogSiteUrl}=await import('../src/onboarding/project-registration-catalog.mjs');
 const yaml=v=>'# X\n\n```yaml\nversion: v0.5\npublic_url: '+v+'\n```\n';
 assert.equal(catalogSiteUrl(yaml('https://ai-interactive-experience-engine.vercel.app')),'https://ai-interactive-experience-engine.vercel.app/');
 for(const bad of ['javascript:alert(1)','http://plain.example','https://u:p@x.example','not a url'])assert.equal(catalogSiteUrl(yaml(bad)),null);
 assert.equal(catalogSiteUrl('# no yaml'),null);
 const find=(n,pred,out=[])=>{if(pred(n))out.push(n);for(const c of n.children||[])find(c,pred,out);return out;};
 const engine={id:'E',name:'Engine',kind:'registered',status:'Active',version:'v0.5',lastAgent:'Claude Code',asOf:'2026-10-15',updatedAt:'2026-10-15',repositoryId:'JoeyAJ/ai-interactive-experience-engine',ref:'main',siteUrl:'https://ai-interactive-experience-engine.vercel.app/'};
 const board=renderControlTower({doc:fakeDoc(),projects:[engine],storage:storage({})});
 assert.ok(find(board,n=>n.className==='tower-button tower-site'&&n.href===engine.siteUrl).length,'card links to the website');
 for(const locale of ['zh-TW','ko','en']){
  const w=towerWords(locale),detail=renderControlTower({doc:fakeDoc(),locale,projects:[engine],detailId:'E',storage:storage({})});
  const all=text(detail);
  assert.ok(all.includes(w.techRegistered));assert.ok(all.includes(w.registeredNoRuns));assert.ok(!all.includes(w.openWorkspace),'no button into a workspace that does not list it');
  assert.ok(all.includes('v0.5 · Claude Code · 2026-10-15'));
  assert.deepEqual(find(detail,n=>n.tag==='a'&&n.className==='tower-link').map(a=>a.href),['https://github.com/JoeyAJ/ai-interactive-experience-engine',engine.siteUrl]);
 }
});

test('registered projects show the catalog work log like live reports, with real times',async()=>{
 const {catalogWorkLog}=await import('../src/onboarding/project-registration-catalog.mjs');
 const {projectCard}=await import('../public/tower-model.js');
 const {relativeTime}=await import('../public/control-tower.js');
 const md='# X\n\n## Work log\n\n- 2026-10-15T15:22:29+09:00 | Claude Code | completed | v0.5 interaction core\n- 2026-10-15T12:54:56+09:00 | Codex | completed | onboarding\n- 2026-10-15T16:00:00+09:00 | Claude Code | in_progress | newer, listed out of order\n- not a log line\n- 2026-13-40T00:00:00Z | X | completed | bad date\n- 2026-10-15T10:00:00Z | X | finished | bad state\n';
 const log=catalogWorkLog(md);
 assert.deepEqual(log.map(e=>[e.at,e.agent,e.state]),[['2026-10-15T07:00:00.000Z','Claude Code','running'],['2026-10-15T06:22:29.000Z','Claude Code','completed'],['2026-10-15T03:54:56.000Z','Codex','completed']]);
 assert.deepEqual(catalogWorkLog('# none'),[]);
 const now=Date.parse('2026-10-15T08:00:00Z'),project={id:'E',name:'E',kind:'registered',status:'Active',version:'v0.5',lastAgent:'Claude Code',asOf:'2026-10-15',updatedAt:'2026-10-15',workLog:log};
 const c=projectCard(project,{now});
 assert.equal(c.history.length,3);assert.equal(c.history[0].feature,'newer, listed out of order');assert.equal(c.updatedAt,'2026-10-15T07:00:00.000Z');
 assert.equal(relativeTime(c.at,towerWords('en'),now),relativeTime('2026-10-15T07:00:00Z',towerWords('en'),now));assert.match(relativeTime(c.at,towerWords('en'),now),/1/);
 assert.ok(!/小時|hours/.test(relativeTime('2026-10-15',towerWords('zh-TW'),now)));assert.equal(relativeTime('2026-10-15',towerWords('en'),now),'2026-10-15');
 // A log entry by the receiving Agent after the copy settles the handoff even if as_of is older.
 const handoff={agent:'codex',goal:'next',at:'2026-10-15T05:00:00Z'};
 assert.equal(projectCard({...project,lastAgent:'Claude Code',workLog:[{at:'2026-10-15T07:30:00Z',agent:'Codex',state:'running',summary:'took over'}]},{handoff,now}).pending,null);
 assert.equal(projectCard(project,{handoff,now}).state,'awaiting');
 // Projects with live reports keep using them.
 assert.equal(projectCard({...project,kind:'project'},{now}).history.length,0);
});

test('every project past the idea stage has a status picker; the overview is grouped by Joey\'s logic',()=>{
 const find=(n,pred,out=[])=>{if(pred(n))out.push(n);for(const c of n.children||[])find(c,pred,out);return out;};
 const calls=[];const w=towerWords('zh-TW');
 const root=renderControlTower({doc:fakeDoc(),projects:[{id:'K',name:'Keep',status:'Active'},{id:'P',name:'Asset',status:'Paused',joeyStatus:'push'},{id:'Z',name:'Zzz',status:'Paused'},{id:'I',name:'Idea',status:'Idea'}],onStatus:(id,s)=>calls.push([id,s]),onDecision:()=>{},storage:storage({})});
 const titles=find(root,n=>n.className==='tower-section-title').map(n=>n.children[0].textContent);
 assert.deepEqual(titles,[w.attention,w.groupPush,w.groupPaused]);
 const picks=find(root,n=>n.tag==='select'&&n.className==='tower-locale'&&/· /.test(n.attrs['aria-label']||''));
 assert.deepEqual(picks.map(s=>s.attrs['aria-label']).sort(),['狀態 · Asset','狀態 · Keep','狀態 · Zzz']);// no picker on the idea
 assert.deepEqual(picks.map(s=>s.children.find(o=>o.selected)?.value).sort(),['paused','push','push']);
});
