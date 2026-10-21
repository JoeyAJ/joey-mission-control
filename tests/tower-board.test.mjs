import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCard,towerModel,boardColumns,boardColumn,heartbeatOf,runTimeline,touchedFiles,TOWER_STATES,BOARD_COLUMNS} from '../public/tower-model.js';
import {towerWords} from '../public/control-tower.js';
import {demoTower} from '../public/tower-demo.js';

const now=Date.parse('2026-10-21T09:00:00Z');
const at=min=>new Date(now-min*60000).toISOString();
const task=(agentName,currentState,min,runId='r1')=>({runId,agentName,featureTitle:'v0.2 · F',currentState,reportedState:currentState==='unconfirmed'?'running':currentState,eventAt:at(min),summary:'S'});
const runs=(tasks,events=[])=>({tasks,events,active:tasks.filter(t=>['running','blocked'].includes(t.currentState)),blockers:tasks.filter(t=>t.currentState==='blocked')});
const project=(id,status='Active')=>({id,name:id,status});

test('every tower state maps to exactly one board column',()=>{
 for(const s of TOWER_STATES)assert.equal(BOARD_COLUMNS.filter(([,states])=>states.includes(s)).length,1,s);
 assert.equal(boardColumn('running'),'running');assert.equal(boardColumn('blocked'),'running');assert.equal(boardColumn('stale'),'running');
 assert.equal(boardColumn('review'),'review');assert.equal(boardColumn('done'),'done');
 for(const s of ['awaiting','push','decide','paused'])assert.equal(boardColumn(s),'pickup');
});

test('a completed run stops at awaiting review, never done, until Joey decides',()=>{
 const c=projectCard(project('A'),{runs:runs([task('Cursor','completed',5)]),now});
 assert.equal(c.state,'review');assert.equal(boardColumn(c.state),'review');
 const decided=projectCard(project('A'),{runs:runs([task('Cursor','completed',5)]),review:{runId:'r1',decision:'accepted'},now});
 assert.notEqual(boardColumn(decided.state),'review');assert.notEqual(decided.state,'done');
});

test('blocked and stale cards are flagged needs-you; a stale heartbeat is never live',()=>{
 const m=towerModel({projects:[project('A'),project('B'),project('C')],runsByProject:{A:runs([task('Codex','blocked',3)]),B:runs([task('Claude Code','unconfirmed',90)]),C:runs([task('Cursor','running',1)])},now});
 const cols=Object.fromEntries(boardColumns(m.cards).map(c=>[c.key,c.cards]));
 const by=id=>cols.running.find(c=>c.id===id);
 assert.equal(by('A').needsYou,true);assert.equal(by('B').needsYou,true);assert.equal(by('C').needsYou,false);
 assert.equal(heartbeatOf(by('B')),'stale');assert.equal(heartbeatOf(by('C')),'fresh');assert.equal(heartbeatOf(by('A')),'none');
 assert.equal(cols.pickup.length+cols.running.length+cols.review.length+cols.done.length,m.cards.length);
});

test('a copied handoff without a report stays awaiting pickup with no heartbeat',()=>{
 const c=projectCard(project('A'),{handoff:{agent:'cursor',goal:'g',at:at(2)},now});
 assert.equal(c.state,'awaiting');assert.equal(boardColumn(c.state),'pickup');assert.equal(heartbeatOf(c),'none');assert.deepEqual(c.timeline,[]);assert.deepEqual(c.files,[]);
});

test('timeline uses only reported events of the focus run, in sequence order; files only from FILE_READ/FILE_CHANGED',()=>{
 const events=[{runId:'r1',sequence:3,kind:'progress',eventAt:at(1),summary:'c',activity:{action:'FILE_CHANGED',path:'a.js'}},{runId:'r1',sequence:1,kind:'started',eventAt:at(9),summary:'a',activity:{action:'FILE_READ',path:'a.js'}},{runId:'r2',sequence:2,kind:'progress',eventAt:at(5),summary:'other',activity:{action:'FILE_READ',path:'x.js'}},{runId:'r1',sequence:2,kind:'heartbeat',eventAt:at(4),summary:'b',activity:{action:'OTHER',path:'y.js'}}];
 const c=projectCard(project('A'),{runs:runs([task('Cursor','running',1)],events),now});
 assert.deepEqual(c.timeline.map(e=>e.sequence),[1,2,3]);
 assert.deepEqual(c.files.map(f=>[f.path,f.read,f.changed]),[['a.js',true,true]]);
 assert.deepEqual(runTimeline(events,null),[]);assert.deepEqual(touchedFiles([]),[]);
});

test('board and timeline words exist in all three locales',()=>{
 const keys=Object.keys(towerWords('zh-TW')).filter(k=>/^(view|col|needsYou|hb|lastReport|timeline|ev[A-Z]|awaitReview|reviewedDone|staleTail|files|file[A-Z])/.test(k));
 assert.ok(keys.length>=30);
 for(const l of ['en','ko'])for(const k of keys)assert.ok(towerWords(l)[k],l+':'+k);
});

test('demo fixtures showcase a live run, a stale run and a run awaiting review',()=>{
 const d=demoTower(now),m=towerModel({...d,now}),get=id=>m.cards.find(c=>c.id===id);
 assert.equal(heartbeatOf(get('DEMO_A')),'fresh');assert.ok(get('DEMO_A').timeline.length>=3);assert.ok(get('DEMO_A').files.length>=2);
 assert.equal(heartbeatOf(get('DEMO_F')),'stale');
 assert.equal(get('DEMO_H').state,'review');assert.equal(get('DEMO_H').timeline.at(-1).kind,'completed');
});

import {renderControlTower} from '../public/control-tower.js';
function fakeDoc(){const make=tag=>{const n={tag,children:[],className:'',textContent:'',dataset:{},style:{setProperty(){}},attrs:{},classList:{add(){},remove(){}},setAttribute(k,v){n.attrs[k]=v;},append(...c){n.children.push(...c);},prepend(...c){n.children.unshift(...c);},addEventListener(){},querySelector(){return null;},replaceChildren(...c){n.children=c;},remove(){}};return n;};return{createElement:make};}
const text=n=>[n.textContent,...(n.children||[]).map(text)].join(' ');
const find=(n,cls)=>[...(String(n.className||'').split(' ').includes(cls)?[n]:[]),...(n.children||[]).flatMap(c=>find(c,cls))];
const mem=()=>({getItem:()=>null,setItem(){}});

test('board view renders four columns, list stays default, detail shows timeline and self-reported files',()=>{
 const d=demoTower(now),w=towerWords('zh-TW');
 const list=renderControlTower({doc:fakeDoc(),...d,now,demo:true,storage:mem(),onView:()=>{}});
 assert.equal(find(list,'tower-board').length,0);assert.equal(find(list,'tower-view-toggle').length,1);
 const board=renderControlTower({doc:fakeDoc(),...d,now,demo:true,storage:mem(),view:'board',onView:()=>{}});
 assert.equal(find(board,'tower-col').length,4);assert.match(text(board),new RegExp(w.needsYou));
 const beats=find(board,'tower-beat').map(b=>b.dataset.beat);assert.ok(beats.includes('fresh')&&beats.includes('stale'));
 const detail=renderControlTower({doc:fakeDoc(),...d,now,demo:true,storage:mem(),detailId:'DEMO_H'});
 assert.match(text(detail),new RegExp(w.awaitReview));assert.match(text(detail),new RegExp(w.filesSelf));assert.equal(find(detail,'tower-file').length,4);
 const glow=find(renderControlTower({doc:fakeDoc(),...d,now,demo:true,storage:mem(),detailId:'DEMO_F'}),'tower-run-step');assert.ok(glow.every(s=>s.dataset.glow!=='true'));assert.equal(glow.at(-1).dataset.stale,'true');
 const empty=renderControlTower({doc:fakeDoc(),...d,now,demo:true,storage:mem(),detailId:'DEMO_C'});assert.equal(find(empty,'tower-unreported').length,2);
});
