import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {reconcileProject} from '../src/product/reconciliation.mjs';
import {blueprintProgress,validateBlueprint,emptyOwner} from '../src/product/model.mjs';
import {productView} from '../src/product/view.mjs';
import {buildProjection} from '../src/projection/projection-service.mjs';
import {runtimeState} from '../src/agent/runtime.mjs';
import {ProductService,validOwners} from '../src/product/service.mjs';
import {JsonStore} from '../src/storage/json-store.mjs';
const baseline=JSON.parse(await fs.readFile(new URL('../metadata/project-reconciliation.v03.json',import.meta.url)));
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url)));
const canonical='/Users/joeyaj/JOEY_CANONICAL_MEMORY';
const chain=id=>({id,storedHead:baseline.projects[id].baselineSha,localMaster:'/Users/joeyaj/Documents/Codex/Projects/'+baseline.projects[id].repository});
test('matched canonical sources reconstruct; changed registry/source evidence withdraws historical claims',async()=>{
 const state=await buildProjection(canonical);assert.equal(Object.keys(baseline.projects).length,4);
 for(const p of state.projects){const r=state.productDocuments[p.id].reconciliation;if(r.sourceState!=='MATCHED'){assert.ok(['SOURCE_UNAVAILABLE','SOURCE_CHANGED_OR_UNAVAILABLE'].includes(r.sourceState));assert.equal(r.result,'AWAITING_JOEY_CONFIRMATION');assert.deepEqual(r.evidence,[]);const withdrawn=productView(p,{document:state.productDocuments[p.id]});assert.equal(withdrawn.documentedPurpose,null);assert.deepEqual(withdrawn.blueprint.milestones,[]);continue;}assert.equal(r.sourceState,'MATCHED',p.id);assert.equal(r.result,'PARTIALLY_CONFIRMED');const v=productView(p,{document:state.productDocuments[p.id],runtime:runtimeState(p)});assert.equal(v.lifecycle,null);assert.equal(v.blueprintProgress,null);assert.equal(v.purpose.lastApprovedRevision,null);assert.equal(v.reconciliation.purposeEvidenceStatus,'DOCUMENTED_BUT_INCOMPLETE');assert.ok(v.blueprint.milestones.length>=3);assert.equal(validateBlueprint(v.blueprint,v.evidence),true);
 for(const m of v.blueprint.milestones){assert.ok(m.confidence);assert.ok(m.evidenceState);for(const f of m.features){assert.ok(f.evidenceRefs.length);for(const ref of f.evidenceRefs)assert.ok(v.evidence.find(e=>e.id===ref&&e.fingerprint));if(f.status==='COMPLETED'){assert.equal(p.id,'JOEY_ASSET_SYSTEM');assert.ok(f.evidenceRefs.some(ref=>v.evidence.find(e=>e.id===ref)?.verificationScope==='RECORDED_APPROVED_PHASE_PUBLICATION'));}}}
 }
});
test('source edits and registry baseline drift withdraw reconstructed claims without technical BLOCKED',async()=>{
 const id='NEXAEON',root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-history-'));try{
 for(const e of baseline.projects[id].evidence.filter(e=>e.sourceKind==='canonical')){const file=path.join(root,e.path);await fs.mkdir(path.dirname(file),{recursive:true});await fs.copyFile(path.join(canonical,e.path),file);}
 assert.equal((await reconcileProject(root,chain(id))).sourceState,'MATCHED');await fs.appendFile(path.join(root,'PROJECTS/NEXAEON/CURRENT_STATE.md'),'\nChanged history fixture\n');const r=await reconcileProject(root,chain(id));assert.equal(r.sourceState,'SOURCE_CHANGED_OR_UNAVAILABLE');assert.deepEqual(r.evidence,[]);
 const p=snapshot.projects.find(v=>v.id===id),v=productView(p,{document:{reconciliation:r}});assert.equal(v.blueprintProgress,null);assert.equal(v.blueprint.milestones.length,0);assert.equal(v.workState,'NO_ACTIVE_WORK');assert.equal(v.reconciliation.historicalState,'HISTORY_MISSING');
 assert.equal((await reconcileProject(root,{...chain(id),storedHead:'0'.repeat(40)})).result,'AWAITING_JOEY_CONFIRMATION');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('incomplete scope, draft weights and unconfirmed items never produce a percentage',()=>{
 const b={status:'RECORDED',scopeConfirmed:true,weightsConfirmed:true,milestones:[{status:'IN_PROGRESS',weight:1,features:[{status:'COMPLETED',weight:1},{status:'NOT_STARTED',weight:1}]}]};assert.equal(blueprintProgress(b),50);
 for(const modified of [{...b,scopeConfirmed:false},{...b,weightsConfirmed:false},{...b,status:'PARTIALLY_CONFIRMED'},{...b,milestones:[{...b.milestones[0],status:'AWAITING_JOEY_CONFIRMATION'}]},{...b,milestones:[{...b.milestones[0],features:[{status:'AWAITING_JOEY_CONFIRMATION',weight:1}]}]}])assert.equal(blueprintProgress(modified),null);
});
test('a verified implementation document cannot serve as product acceptance',()=>{const r=structuredClone(baseline.projects.JOEY_ASSET_SYSTEM);const ev=r.evidence.map(e=>({...e,verificationScope:'SOURCE_CONTENT_ONLY'}));assert.throws(()=>validateBlueprint(r.blueprint,ev),/verified evidence/);});
test('metadata synchronization conflicts remain separate from technical workspace conflicts',()=>{
 const p=structuredClone(snapshot.projects[0]);p.blocker={value:'None',source:{}};p.management={};p.conflicts=[{kind:'git_observation_error',message:'Source unavailable'}];assert.equal(runtimeState(p).missionStatus,'Awaiting sync');p.conflicts=[{kind:'handoff_conflict',message:'Missing record fields'}];assert.equal(runtimeState(p).missionStatus,'Awaiting sync');p.conflicts=[{kind:'commit_conflict',message:'Actual baseline mismatch'}];assert.equal(runtimeState(p).missionStatus,'Blocked');
});
test('Joey blueprint corrections override historical order and weights, retaining prior proposals',async()=>{
 const id='NEXAEON',root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-history-owner-'));try{const service=new ProductService(new JsonStore(root,'owner.json',validOwners));const r=await reconcileProject(canonical,chain(id));const b=structuredClone(r.blueprint);b.milestones.pop();b.milestones.reverse();b.milestones[0].weight=3;
 const proposal=await service.proposal(id,{type:'BLUEPRINT',reason:'fixture scope correction',value:{blueprint:b,evidence:r.evidence}});const owner=await service.decide(id,{actor:'joey',confirmation:id,explicitDecision:'JOEY_APPROVES',expectedRevision:0,proposalId:proposal.id});const p=snapshot.projects.find(v=>v.id===id);const v=productView(p,{owner,document:{reconciliation:r}});assert.equal(v.blueprint.status,'RECORDED');assert.equal(v.blueprint.milestones[0].weight,3);assert.equal(v.blueprint.milestones.length,3);assert.equal(v.blueprintProgress,0);assert.equal(v.ownerDecisions.length,1);assert.equal(owner.proposals[0].status,'APPROVED');assert.equal(r.blueprint.milestones.length,4);assert.equal(owner.lifecycle,null);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('unstarted capability choice is not a blocked product; active engineering blockers retain priority',async()=>{const p=snapshot.projects[0],r=await reconcileProject(canonical,chain(p.id));const runtime={missionStatus:'Blocked',stateSource:'canonical_projection',nextAction:'Engineering prerequisite'};const v=productView(p,{runtime,document:{reconciliation:r}});assert.equal(v.workState,'AWAITING_JOEY_DECISION');assert.equal(v.technicalNextAction,'Engineering prerequisite');assert.equal(productView(p,{runtime:{...runtime,stateSource:'local_mission_overlay'},document:{reconciliation:r}}).workState,'TECHNICAL_BLOCKER');});
