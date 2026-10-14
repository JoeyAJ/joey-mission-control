import test from 'node:test';
import assert from 'node:assert/strict';
import {towerModel,projectCard,agentKey,versionOf,HANDOFF_TTL_MS} from '../public/tower-model.js';
import {handoffInstruction,readHandoffs,writeHandoff,relativeTime,towerWords} from '../public/control-tower.js';

const now=Date.parse('2026-10-14T12:00:00Z');
const at=min=>new Date(now-min*60000).toISOString();
const task=(agentName,currentState,min,extra={})=>({agentName,featureTitle:'F-'+agentName,currentState,reportedState:currentState==='unconfirmed'?'running':currentState,eventAt:at(min),summary:'S-'+agentName,...extra});
const runs=tasks=>({tasks,active:tasks.filter(t=>['running','blocked'].includes(t.currentState)),blockers:tasks.filter(t=>t.currentState==='blocked')});
const project=(id,status='Active')=>({id,name:id,status});

test('a fresh running report shows the reporting Agent as in development',()=>{
 const c=projectCard(project('A'),{runs:runs([task('Codex','running',1)]),now});
 assert.equal(c.state,'running');assert.equal(c.agent,'Codex');assert.equal(c.feature,'F-Codex');
});

test('blocked outranks running and expired heartbeats become "may have stopped", never running',()=>{
 assert.equal(projectCard(project('A'),{runs:runs([task('Codex','running',1),task('Hermes','blocked',2)]),now}).state,'blocked');
 const stale=projectCard(project('B'),{runs:runs([task('Claude Code','unconfirmed',30)]),now});
 assert.equal(stale.state,'stale');assert.equal(stale.agent,'Claude Code');
});

test('a copied handoff waits until that Agent reports after the copy time',()=>{
 const handoff={agent:'claude',goal:'Mobile sheet',at:at(10)};
 const waiting=projectCard(project('A'),{runs:runs([task('Codex','running',1)]),handoff,now});
 assert.equal(waiting.state,'awaiting');assert.equal(waiting.agent,'Claude Code');assert.equal(waiting.previousAgent,'Codex');
 // A report by the same Agent from before the copy does not count as pickup.
 assert.equal(projectCard(project('A'),{runs:runs([task('Claude Code','completed',60)]),handoff,now}).state,'awaiting');
 const picked=projectCard(project('A'),{runs:runs([task('Claude Code','running',2)]),handoff,now});
 assert.equal(picked.state,'running');assert.equal(picked.pending,null);
});

test('old handoff intents expire instead of waiting forever',()=>{
 const handoff={agent:'hermes',at:new Date(now-HANDOFF_TTL_MS-1000).toISOString()};
 assert.equal(projectCard(project('A','Paused'),{handoff,now}).state,'paused');
});

test('lifecycle decides cards without reports; attention groups come first',()=>{
 const m=towerModel({projects:[project('P','Paused'),project('I','Idea'),project('R'),project('D','Completed')],runsByProject:{R:runs([task('Hermes','running',1)])},now});
 assert.deepEqual(m.cards.map(c=>[c.id,c.state]),[['I','decide'],['R','running'],['P','paused'],['D','done']]);
 assert.deepEqual(m.attention.map(c=>c.id),['I']);assert.equal(m.counts.running,1);assert.equal(m.total,4);
});

test('unknown versions and agents stay unknown',()=>{
 const c=projectCard({id:'X',name:'X',status:'Active',version:'Unknown',lastAgent:'Unknown'},{now});
 assert.equal(c.version,null);assert.equal(c.lastAgent,null);assert.equal(c.state,'idle');
 assert.equal(agentKey('claude-code'),'claude');assert.equal(agentKey('GPT Codex'),'codex');assert.equal(agentKey('Gemini'),'other');assert.equal(agentKey(null),null);
});

test('handoff text names the receiving Agent and goal before the verified instruction',()=>{
 const text=handoffInstruction({project:'NexAeon',agent:'Hermes',goal:'Add watch layout',instruction:'VERIFIED'});
 assert.match(text,/Handoff → Hermes/);assert.match(text,/agentName 請填 "Hermes"/);assert.match(text,/Add watch layout/);assert.match(text,/v0\.4 · /);assert.ok(text.endsWith('VERIFIED'));
});

test('handoff storage survives bad data and removal',()=>{
 const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}};
 assert.deepEqual(readHandoffs(storage),{});writeHandoff('A',{agent:'codex',at:at(1)},storage);assert.equal(readHandoffs(storage).A.agent,'codex');
 writeHandoff('A',null,storage);assert.deepEqual(readHandoffs(storage),{});
 data['mc.tower.handoffs.v1']='{broken';assert.deepEqual(readHandoffs(storage),{});
 assert.deepEqual(readHandoffs({getItem(){throw Error('blocked');}}),{});
});

test('all three locales carry every tower label',()=>{
 const keys=Object.keys(towerWords('zh-TW'));for(const l of ['en','ko'])assert.deepEqual(Object.keys(towerWords(l)).sort(),[...keys].sort());
 assert.equal(relativeTime(at(3),towerWords('en'),now),'3 min ago');assert.equal(relativeTime(null,towerWords('ko'),now),'기록 없음');
});

test('stage version is read from the reported feature title',()=>{
 assert.equal(versionOf('v0.4 · Mobile sheet'),'0.4');assert.equal(versionOf('V1.2.3-beta Fix'),'1.2.3-beta');assert.equal(versionOf('Mobile sheet'),null);
 assert.equal(projectCard({id:'A',name:'A',status:'Active',version:'Unknown'},{runs:runs([task('Codex','running',1,{featureTitle:'v0.5 · Tower'})]),now}).version,'0.5');
});

test('a one-sentence idea becomes a valid private draft with neutral defaults',async()=>{
 const {quickIdeaDraft}=await import('../src/onboarding/quick-idea.mjs');
 const random={getRandomValues:a=>a.fill(171)};
 const d=quickIdeaDraft('  幫新生配對宿舍室友的小工具\n第二行細節  ',{now:new Date(now),random});
 assert.equal(d.draftId,'draft_abababababababab');assert.equal(d.project.projectId,'IDEA_ABABABABABABABAB');assert.equal(d.project.name,'幫新生配對宿舍室友的小工具');
 assert.equal(d.project.idea,'幫新生配對宿舍室友的小工具\n第二行細節');assert.equal(d.revision,1);assert.equal(d.project.environment,'CODE_ONLY');
 assert.throws(()=>quickIdeaDraft('   ',{random}),/DRAFT_REQUIRED/);
 assert.throws(()=>quickIdeaDraft('token ghp_'+'a'.repeat(30),{random}),/DRAFT_TEXT_INVALID/);
});

test('idea drafts become "your call" cards marked as drafts',()=>{
 const m=towerModel({projects:[{id:'draft_1',name:'Idea',status:'Idea',summary:'One line',kind:'draft'}],now});
 assert.equal(m.cards[0].state,'decide');assert.equal(m.cards[0].kind,'draft');assert.equal(m.cards[0].summary,'One line');
});

test('shelved ideas leave the board but stay restorable; go-ahead ideas stand by for handoff',()=>{
 const m=towerModel({projects:[{id:'local_a',name:'A',status:'Idea',kind:'draft',decision:'shelved'},{id:'local_b',name:'B',status:'Active',kind:'draft',decision:'go'}],now});
 assert.deepEqual(m.shelved.map(c=>c.id),['local_a']);assert.deepEqual(m.cards.map(c=>[c.id,c.state,c.decision]),[['local_b','idle','go']]);assert.equal(m.total,1);
});

test('idea handoff text carries the idea and stops before deployment or paid services',async()=>{
 const {ideaInstruction}=await import('../public/control-tower.js');
 const text=ideaInstruction({name:'Dorm match',idea:'Match new students with roommates'});
 assert.match(text,/Dorm match/);assert.match(text,/Match new students/);assert.match(text,/HANDOFF\.md/);assert.match(text,/不要自行部署/);
});

test('a finished run asks for review until Joey decides on that exact run',()=>{
 const done=runs([task('Hermes','completed',30,{runId:'r1',result:{tests:[{name:'t',outcome:'PASS'}],nextSteps:'n'}})]);
 const c=projectCard(project('A'),{runs:done,now});
 assert.equal(c.state,'review');assert.equal(c.runId,'r1');assert.equal(c.result.tests.length,1);
 assert.equal(projectCard(project('A'),{runs:done,review:{runId:'r1',decision:'accepted'},now}).state,'idle');
 assert.equal(projectCard(project('A'),{runs:runs([task('Hermes','completed',5,{runId:'r2'})]),review:{runId:'r1',decision:'accepted'},now}).state,'review');
 assert.equal(projectCard(project('A','Paused'),{runs:done,now}).state,'paused');
 const m=towerModel({projects:[project('A')],runsByProject:{A:done},now});assert.deepEqual(m.attention.map(x=>x.state),['review']);
});

test('review decisions are stored per project and survive bad data',async()=>{
 const {readReviews,writeReview}=await import('../public/control-tower.js');
 const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}};
 writeReview('A',{runId:'r1',decision:'accepted'},storage);assert.equal(readReviews(storage).A.runId,'r1');
 data['mc.tower.reviews.v1']='nope';assert.deepEqual(readReviews(storage),{});
});
