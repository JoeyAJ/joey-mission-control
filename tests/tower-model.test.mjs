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
 assert.equal(c.version,null);assert.equal(c.lastAgent,null);assert.equal(c.state,'push');
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
 assert.deepEqual(m.shelved.map(c=>c.id),['local_a']);assert.deepEqual(m.cards.map(c=>[c.id,c.state,c.decision]),[['local_b','push','go']]);assert.equal(m.total,1);
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
 assert.equal(projectCard(project('A'),{runs:done,review:{runId:'r1',decision:'accepted'},now}).state,'push');
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

test('a reviewed run stays revisitable after approval or a change request',()=>{
 const done=runs([task('Hermes','completed',30,{runId:'r1'})]);
 const ok=projectCard(project('A'),{runs:done,review:{runId:'r1',decision:'accepted'},now});
 assert.equal(ok.state,'push');assert.equal(ok.reviewed.decision,'accepted');assert.equal(ok.reviewed.agent,'Hermes');
 const changes=projectCard(project('A'),{runs:done,review:{runId:'r1',decision:'changes'},handoff:{agent:'hermes',at:at(5)},now});
 assert.equal(changes.state,'awaiting');assert.equal(changes.reviewed.runId,'r1');
 assert.equal(projectCard(project('A'),{runs:done,now}).reviewed,null);
});

test('editing an idea draft bumps the revision and keeps its identity',async()=>{
 const {quickIdeaDraft,editedIdeaDraft}=await import('../src/onboarding/quick-idea.mjs');
 const d=quickIdeaDraft('測試',{now:new Date(now),random:{getRandomValues:a=>a.fill(1)}});
 const e=editedIdeaDraft(d,{name:'宿舍配對',idea:'幫新生找室友'},{now:new Date(now+60000)});
 assert.equal(e.draftId,d.draftId);assert.equal(e.revision,2);assert.equal(e.project.name,'宿舍配對');assert.equal(e.project.projectId,d.project.projectId);assert.equal(e.createdAt,d.createdAt);
 assert.throws(()=>editedIdeaDraft(d,{name:' ',idea:'x'}),/DRAFT_REQUIRED/);
});

test('review history keeps the newest decisions first for the detail page',async()=>{
 const {readReviews,writeReview}=await import('../public/control-tower.js');
 const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}};
 writeReview('A',{runId:'r1',decision:'changes',note:'fix',at:at(10)},storage);writeReview('A',{runId:'r1',decision:'accepted',at:at(1)},storage);
 const r=readReviews(storage).A;assert.equal(r.decision,'accepted');assert.deepEqual(r.log.map(x=>x.decision),['accepted','changes']);assert.equal(r.log[1].note,'fix');
});

test('registered projects wait for Joey to start development and get a repository-based handoff',async()=>{
 const {registeredInstruction}=await import('../public/control-tower.js');
 const c=projectCard({id:'AI_X',name:'AI X',status:'Idea',kind:'registered',repositoryId:'JoeyAJ/ai-x',ref:'main'},{now});
 assert.equal(c.state,'decide');assert.equal(c.kind,'registered');assert.equal(c.repositoryId,'JoeyAJ/ai-x');
 const text=registeredInstruction({name:'AI X',repositoryId:'JoeyAJ/ai-x'});
 assert.match(text,/JoeyAJ\/ai-x/);assert.match(text,/HANDOFF\.md/);assert.match(text,/Pending Development/);assert.match(text,/不要自行部署/);
});

test('catalog reads can use the read-only credential while writes still require the registry credential',async()=>{
 const {createRegistrationGitPort}=await import('../src/onboarding/project-registration-git.mjs');
 const calls=[];const fetchImpl=async(url,init)=>{calls.push([String(url),init.method||'GET',init.headers.Authorization]);return new Response('{}',{status:404});};
 const readOnly=createRegistrationGitPort({credential:undefined,readCredential:'r'.repeat(24),ownerSubject:'x',fetchImpl});
 assert.equal(readOnly.configured,false);assert.equal(readOnly.readConfigured,true);
 await assert.rejects(readOnly.readSnapshot({}));assert.equal(calls[0][1],'GET');assert.equal(calls[0][2],'Bearer '+'r'.repeat(24));
 const both=createRegistrationGitPort({credential:'w'.repeat(24),readCredential:'r'.repeat(24),ownerSubject:'x',fetchImpl});
 assert.equal(both.configured,true);calls.length=0;await assert.rejects(both.readSnapshot({}));assert.equal(calls[0][2],'Bearer '+'w'.repeat(24));
});

test('rejected or removed registered projects leave the board but stay restorable',()=>{
 const m=towerModel({projects:[{id:'R1',name:'R1',status:'Idea',kind:'registered',decision:'rejected'},{id:'R2',name:'R2',status:'Idea',kind:'registered',decision:'removed'},{id:'R3',name:'R3',status:'Idea',kind:'registered'}],now});
 assert.deepEqual(m.dismissed.map(c=>[c.id,c.decision]),[['R1','rejected'],['R2','removed']]);assert.deepEqual(m.cards.map(c=>c.id),['R3']);
});

test('handoffs for projects without an MC report connection skip reporter notes',()=>{
 const plain=handoffInstruction({project:'P',agent:'Codex',goal:'',instruction:'X',reporter:false});
 assert.doesNotMatch(plain,/agentName|featureTitle/);assert.match(handoffInstruction({project:'P',agent:'Codex',goal:'',instruction:'X'}),/featureTitle/);
});

// Registered (catalog) projects: progress comes from PROJECTS/<ID>/CURRENT_STATE.md (version, current_agent, as_of).
const engine=(extra={})=>({id:'AI_INTERACTIVE_EXPERIENCE_ENGINE',name:'AI Interactive Experience Engine',kind:'registered',status:'Active',version:'v0.5',lastAgent:'Claude Code',asOf:'2026-10-15',updatedAt:'2026-10-15',...extra});
test('a registered project in development shows its catalog version and Agent',()=>{
 const c=projectCard(engine(),{now:Date.parse('2026-10-15T09:00:00Z')});
 assert.equal(c.state,'push');assert.equal(c.version,'v0.5');assert.equal(c.lastAgent,'Claude Code');assert.equal(c.updatedAt,'2026-10-15');assert.equal(c.lifecycle,'active');
 // Still-pending registrations keep the "your call" state with Start development.
 assert.equal(projectCard(engine({status:'Idea',version:null,lastAgent:null}),{now}).state,'decide');
});
test('a catalog record naming the receiving Agent on or after the copy settles a registered handoff',()=>{
 const now=Date.parse('2026-10-15T09:00:00Z'),handoff={agent:'claude',goal:'v0.5',at:'2026-10-14T23:30:00Z'};
 const picked=projectCard(engine(),{handoff,now});
 assert.equal(picked.pending,null);assert.notEqual(picked.state,'awaiting');assert.equal(picked.version,'v0.5');assert.equal(picked.lastAgent,'Claude Code');
 // A date-only as_of covers the whole day, so a same-day copy is answered too.
 assert.equal(projectCard(engine(),{handoff:{...handoff,at:'2026-10-15T08:00:00Z'},now}).pending,null);
 // Another Agent named, or a record older than the copy, keeps waiting.
 assert.equal(projectCard(engine(),{handoff:{...handoff,agent:'codex'},now}).state,'awaiting');
 assert.equal(projectCard(engine({asOf:'2026-10-13'}),{handoff,now}).state,'awaiting');
 // Catalog records only settle registered projects; published projects still need a live report.
 assert.equal(projectCard({...engine(),kind:'project'},{handoff,now}).state,'awaiting');
});
test('registered handoff text matches the stage and asks the Agent to keep the catalog record current',async()=>{
 const {registeredInstruction}=await import('../public/control-tower.js');
 const dev=registeredInstruction({name:'E',repositoryId:'JoeyAJ/e',projectId:'E_ID',version:'v0.5',lastAgent:'Claude Code',inDevelopment:true});
 assert.match(dev,/開發中，最新版本 v0\.5，上一位 Agent：Claude Code/);assert.doesNotMatch(dev,/Pending Development/);assert.match(dev,/PROJECTS\/E_ID\/CURRENT_STATE\.md/);assert.match(dev,/Sync progress/);
 assert.match(registeredInstruction({name:'E',repositoryId:'JoeyAJ/e'}),/Pending Development/);
});

// Joey's own statuses: Agent working = in development; keep pushing / paused / done are Joey's choice.
test('Joey decides keep pushing, paused or done; Agents only decide "in development"',()=>{
 const p=(extra={})=>({...project('A'),...extra});
 assert.equal(projectCard(p(),{now}).state,'push');// no Agent, not paused: stays on Joey's list
 assert.equal(projectCard(p({status:'Paused'}),{now}).state,'paused');
 assert.equal(projectCard(p({status:'Paused',joeyStatus:'push'}),{now}).state,'push');// e.g. Joey Asset System
 assert.equal(projectCard(p({joeyStatus:'done'}),{now}).state,'done');
 assert.equal(projectCard(p({joeyStatus:'bogus'}),{now}).state,'push');
 // A working Agent always shows as in development, whatever the label.
 assert.equal(projectCard(p({joeyStatus:'paused'}),{runs:runs([task('Codex','running',1)]),now}).state,'running');
 // Pausing a project that waits for review takes it out of "needs you" (e.g. Woosong Buddy).
 const done=runs([task('Hermes','completed',5,{runId:'r1'})]);
 assert.equal(projectCard(p(),{runs:done,now}).state,'review');
 assert.equal(projectCard(p({joeyStatus:'paused'}),{runs:done,now}).state,'paused');
 assert.equal(projectCard(p({joeyStatus:'paused'}),{runs:runs([task('Hermes','blocked',5)]),now}).state,'paused');
 const m=towerModel({projects:[p({id:'R'}),{...p({id:'K'}),joeyStatus:'push'},{...p({id:'P'}),joeyStatus:'paused'},{...p({id:'D'}),joeyStatus:'done'}],runsByProject:{R:runs([task('Codex','running',1)])},now});
 assert.deepEqual(m.groups.map(g=>[g.key,g.cards.map(c=>c.id)]),[['running',['R']],['push',['K']],['paused',['P']],['done',['D']]]);
});
test('review sheet offers hand off, keep pushing or pause; pause is logged without approving',async()=>{
 const {readReviews,writeReview}=await import('../public/control-tower.js');
 const data={};const st={getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}};
 writeReview('W',{runId:'r1',decision:'deferred',at:'2026-10-15T08:00:00Z'},st);
 assert.equal(readReviews(st).W.decision,'deferred');
 const c=projectCard({...project('W'),joeyStatus:'paused'},{runs:runs([task('Hermes','completed',5,{runId:'r1'})]),review:readReviews(st).W,now});
 assert.equal(c.state,'paused');assert.equal(c.reviewed.decision,'deferred');
 for(const l of ['zh-TW','ko','en']){const w=towerWords(l);for(const k of ['push','pushHint','statusLabel','groupRunning','groupPush','groupPaused','groupDone','approveHandoff','approvePush','pauseProject','decDeferred'])assert.ok(w[k],l+':'+k);}
});
