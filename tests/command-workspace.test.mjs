import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceEvents,safeWorkspaceText,workspaceWords} from '../public/command-workspace.js';
import {readContext,contextHash} from '../public/proposal-navigation.js';
import {productionResponse} from '../api/index.mjs';
import {withRemoteHandoffWorkspace,withRegisteredWorkspaces} from '../public/command-workspace.js';
import {ownerAuthConfig} from '../public/owner-auth-config.js';
test('the fixed preview exposes an MC navigation entry without fabricating source progress or database scope',()=>{
 const original=[{project_id:'NEXAEON'}],preview=withRemoteHandoffWorkspace(original,{origin:ownerAuthConfig.stageOrigin});assert.equal(original.length,1);assert.equal(preview.length,2);assert.equal(preview[1].project_id,'MISSION_CONTROL');assert.deepEqual(workspaceEvents(preview[1]),[]);assert.equal(preview[1].sourceReadout,undefined);assert.deepEqual(withRemoteHandoffWorkspace(original,{origin:'https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app'}),original);assert.equal(withRemoteHandoffWorkspace(preview,{origin:ownerAuthConfig.stageOrigin}),preview);
});
test('workspace separates historical handoff, Git and recorded missions without inferring current agent',()=>{
 const m={phase:{stage:'Confirmed',lastDevelopmentAgent:'Historical actor',handoff:{reference:'/Users/private',fingerprint:'privatehash'}},operations:{repositoryEvent:{summary:'Commit',sha:'abc',author:'Not an agent'}},activity:[{stateSource:'local_mission_overlay',action:'Recorded task',status:'RUNNING',agent:'Attested actor'},{stateSource:'invented',action:'Fake'}]};
 const events=workspaceEvents(m,{readOnly:true});assert.equal(events.length,3);assert.equal(events[1].actor,null);assert.equal(events[0].source.reference,null);assert.equal(events[0].source.fingerprint,null);assert.equal(m.currentAgent,undefined);assert.equal(events[2].status,'RUNNING');assert.equal(events[2].actor,null);assert.equal(events[2].model,null);
 for(const value of ['/workspace/repo','/agent/log','Bearer secret','password=secret','/Users/private'])assert.equal(safeWorkspaceText(value),null);
});
test('console project/event URL survives reload and unknown module fails closed',()=>{const c={project:'WOOSONG_BUDDY',module:'console',item:'receipt'};assert.deepEqual(readContext(contextHash(c)),c);assert.equal(readContext('#joey?module=unsafe').module,'overview');});
test('curated latest receipts match all four verified remotes and expose unknown identities rather than historical actors',()=>{
 const manifests=productionResponse('GET',new URL('https://fixture/api/index?route=projects')).body;assert.equal(manifests.length,4);
 const shas={NEXAEON:'8271e1b',WOOSONG_BUDDY:'e41bd1b',NAMYOUNG_WEB3D:'92c17b8',JOEY_ASSET_SYSTEM:'77b6766'};
 for(const m of manifests){const r=m.sourceReadout;assert.ok(r.verifiedRemoteSha.startsWith(shas[m.project_id]));assert.equal(r.currentTask,null);assert.equal(r.currentAgent,null);assert.equal(r.lastConfirmedActor,null);assert.equal(r.runtimeConnected,false);assert.equal(r.provenance.kind,'sanitized_receipt_not_live');assert.equal(r.provenance.document,undefined);assert.equal(workspaceEvents(m,{readOnly:true})[0].id,'receipt');assert.doesNotMatch(JSON.stringify(r),/\/Users\/|libfile_|Sentinel_|password|token|[a-f0-9]{64}/);}
 assert.match(manifests.find(m=>m.project_id==='WOOSONG_BUDDY').sourceReadout.limits,/unverified/);
});
test('workspace copy has complete three-language keys',()=>{for(const locale of ['zh-TW','en','ko'])assert.deepEqual(Object.keys(workspaceWords(locale)),Object.keys(workspaceWords('en')));});

test('mission/source event IDs retain selection after reordered updates and new history insertion',()=>{
 const a={stateSource:'local_mission_overlay',missionId:'mission-a',action:'Task A',status:'RUNNING',recordedAt:'2026-10-06T01:00:00Z'},b={...a,missionId:'mission-b',action:'Task B'},handoff={stateSource:'canonical_handoff',action:'Formal result',recordedAt:'2026-10-05T01:00:00Z',completedAt:'2026-10-05T01:00:00Z',status:'SUCCESS'};
 const m={project_id:'NEXAEON',activity:[a,b,handoff]},before=workspaceEvents(m),id=before[0].id,sourceId=before[2].id;
 m.activity=[{...handoff,action:'Earlier inserted result',recordedAt:'2026-10-04T01:00:00Z'},b,handoff,{...a,status:'COMPLETED',recordedAt:'2026-10-07T01:00:00Z',completedAt:'2026-10-07T01:00:00Z'}];
 const after=workspaceEvents(m);assert.equal(after.find(e=>e.id===id).title,'Task A');assert.equal(after.find(e=>e.id===id).status,'COMPLETED');assert.equal(after.find(e=>e.id===sourceId).title,'Formal result');assert.deepEqual(readContext(contextHash({project:'NEXAEON',module:'console',item:id})).item,id);
});

test('receipt/phase labels compare actual source dates and never pin a new phase to Oct 3',async()=>{
 const {renderPhaseOverview}=await import('../public/joey-operations.js');const el=(tag,value,cls)=>({tag,textContent:value||'',className:cls||'',dataset:{},children:[],append(...nodes){this.children.push(...nodes);},addEventListener(){}});
 for(const [date,older]of [['2026-10-03',true],['2026-10-07T12:00:00Z',false],[null,false],['2026-10-06T12:00:00Z',false]]){
 const root=renderPhaseOverview({project_id:'NEXAEON',sourceReadout:{sourceDate:'2026-10-06',stage:'Receipt'},phase:{stage:'Actual stage',stageDate:date,handoff:{},latestResult:{},conflicts:[]},operations:{refresh:{status:'FAILED'}}},{el,locale:'en'});const text=JSON.stringify(root);assert.equal(text.includes('predates this receipt'),older);assert.doesNotMatch(text,/Oct 3|latest safe|Latest safe/);assert.match(text,/Actual stage/);if(date)assert.ok(text.includes(date));}
});

test('health separates baseline release from command candidate and fixed receipt reread limits',()=>{
 const health=productionResponse('GET',new URL('https://fixture/api/index?route=health')).body;assert.equal(health.commandWorkspace.candidateAcceptance,'PENDING_JOEY_ACCEPTANCE');assert.equal(health.commandWorkspace.runtimeBridge,'NOT_IMPLEMENTED');assert.equal(health.commandWorkspace.refreshVerifiesRemote,false);assert.equal(health.commandWorkspace.recordedSourcesAsOf,'2026-10-06');assert.notEqual(health.snapshotGeneratedAt,health.commandWorkspace.recordedSourcesAsOf);
});

test('dedicated workspace routes retain event and mobile panel without invalid panel states',async()=>{const {workspaceHash,readWorkspacePanel}=await import('../public/command-workspace.js');const c={project:'WOOSONG_BUDDY',item:'mission-known',panel:'context'};const hash=workspaceHash(c);assert.ok(hash.startsWith('#workspace?'));assert.equal(readContext(hash).project,c.project);assert.equal(readContext(hash).item,c.item);assert.equal(readWorkspacePanel(hash),'context');assert.equal(readWorkspacePanel('#workspace?panel=invalid'),'events');});

test('inspector pane URL retains context/changes/graph across history and rejects unknown modes',async()=>{const {workspaceHash,readWorkspaceInspector}=await import('../public/command-workspace.js');for(const inspectorTab of ['context','changes','graph']){const hash=workspaceHash({project:'WOOSONG_BUDDY',item:'receipt',panel:'context',inspectorTab});assert.equal(readWorkspaceInspector(hash),inspectorTab);assert.equal(readContext(hash).item,'receipt');}assert.equal(readWorkspaceInspector('#workspace?inspector=unknown'),'context');});
test('console session/timeline/changes labels exist in all locales and never claim connected execution',()=>{for(const locale of ['zh-TW','en','ko']){const w=workspaceWords(locale);for(const key of ['sessionsEmpty','workflow','changesTab'])assert.ok(w[key]);assert.notEqual(w.sessionsEmpty,'');}assert.match(workspaceWords('en').sessionsEmpty,/No execution session connected/);});

test('work context does not blend private claim qualifications/times with a public stage',async()=>{const {workspaceWorkSummary}=await import('../public/command-workspace.js');const result=workspaceWorkSummary({sourceReadout:{stage:'Public stage',nextAction:'Public next',sourceDate:'2026-01-03'},privateSource:{stage:'Private stage',claims:{stage:{verificationStatus:'SYNTHETIC_UNVERIFIED',eventTime:'2026-01-01'},nextAction:{value:null,verificationStatus:'SYNTHETIC_UNKNOWN',eventTime:null}}}});assert.equal(result.layer,'private');assert.equal(result.stage,'Private stage');assert.equal(result.stageQualification,'SYNTHETIC_UNVERIFIED');assert.equal(result.stageTime,'2026-01-01');assert.equal(result.next,null);assert.equal(result.nextQualification,'SYNTHETIC_UNKNOWN');assert.equal(result.nextTime,null);});

test('technical workspace lists approved registered projects only while selectable',()=>{
 const base=[{project_id:'NEXAEON'}];
 const rows=[{projectId:'AI_INTERACTIVE_EXPERIENCE_ENGINE',name:'AI Interactive Experience Engine',selectable:true},{projectId:'PENDING_PROJECT',name:'Pending',selectable:false},{projectId:'NEXAEON',name:'Duplicate',selectable:true}];
 const list=withRegisteredWorkspaces(base,rows);
 assert.equal(base.length,1);
 assert.deepEqual(list.map(m=>m.project_id),['NEXAEON','AI_INTERACTIVE_EXPERIENCE_ENGINE']);
 assert.equal(list[1].registeredProject,true);assert.equal(list[1].product.name,'AI Interactive Experience Engine');assert.deepEqual(list[1].activity,[]);
 assert.deepEqual(withRegisteredWorkspaces(base,[]),base);
});
