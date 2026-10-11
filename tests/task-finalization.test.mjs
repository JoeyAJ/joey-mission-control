import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {finalizationFixture,FA,FB,FC,FM} from './helpers/task-finalization-fixture.mjs';
import {createFinalizationProviderAdapter,createDeploymentTaskFinalization} from '../src/tasks/task-finalization-provider.mjs';
import {validateFinalizationConfiguration,validateFixtureExecutionGrant} from '../src/tasks/task-finalization-contract.mjs';
import {createTaskFinalizationWorkflow} from '../src/tasks/task-finalization-workflow.mjs';
import {browserContextDigest} from '../src/continuity/browser-context-digest.mjs';
import {productionResponse} from '../api/index.mjs';

test('fixture merge, exact verified merge Preview and served receipts execute with fresh evidence and never claim live acceptance',async()=>{
 const f=await finalizationFixture();let r=await f.engine.advance(f.intent);assert.equal(r.state,'MERGED_DEPLOYMENT_PENDING');assert.equal(f.state.merges,1);assert.equal(f.state.deploys,0);assert.deepEqual(r.receipt.merge.parents,[FA,FB]);
 r=await f.engine.advance(f.intent);assert.equal(r.state,'DEPLOYMENT_PENDING');assert.equal(f.state.deploys,1);assert.equal(r.receipt.deployment.codeSha,FM);assert.equal(r.receipt.deployment.target.environment,'preview');
 f.state.deployment.state='READY';r=await f.engine.advance(f.intent);assert.equal(r.state,'FIXTURE_FINALIZATION_VERIFIED');assert.equal(r.receipt.verification.codeSha,FM);assert.equal(r.executionAuthorized,false);assert.equal(r.productAccepted,false);
 const revision=r.receipt.revision;r=await f.restart().advance(f.intent);assert.equal(r.state,'FIXTURE_FINALIZATION_VERIFIED');assert.equal(r.receipt.revision,revision);assert.equal(f.state.merges,1);assert.equal(f.state.deploys,1);assert(f.state.reads>=10);
});
test('deployed composition and unconfigured adapter cannot read credentials, network, store or any supplied writer',async()=>{
 const f=await finalizationFixture();const deployment=createDeploymentTaskFinalization({environment:{MC_EXECUTE:'true'},provider:f.provider,store:f.store});
 assert.equal((await deployment.advance(f.intent)).state,'LIVE_EXECUTION_DISABLED');assert.equal((await deployment.preflight()).state,'LIVE_EXECUTION_DISABLED');
 const disabled=createFinalizationProviderAdapter({configuration:f.configuration});const engine=createTaskFinalizationWorkflow({...f.options,provider:disabled});assert.equal((await engine.advance(f.intent)).state,'LIVE_EXECUTION_DISABLED');assert.equal(f.state.ownerReads,0);assert.equal(f.state.reads,0);assert.equal(f.state.merges,0);assert.equal(f.state.deploys,0);assert.equal(f.records.size,0);
});
test('Owner approval is distinct from each action grant; merge authority never silently authorizes deployment',async()=>{
 const f=await finalizationFixture();f.state.actions.clear();assert.equal((await f.engine.advance(f.intent)).state,'MISSING_EXECUTION_AUTHORIZATION');assert.equal(f.state.merges,0);
 f.state.actions.add('MERGE_PR');assert.equal((await f.engine.advance(f.intent)).state,'MERGED_DEPLOYMENT_PENDING');assert.equal((await f.engine.advance(f.intent)).state,'MISSING_EXECUTION_AUTHORIZATION');assert.equal(f.state.deploys,0);
 f.state.actions.add('DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW');assert.equal((await f.engine.advance(f.intent)).state,'DEPLOYMENT_PENDING');assert.equal(f.state.deploys,1);
});
test('execution grant cannot be an acceptance record, another tuple/Owner/action, expired or fabricated live authority',async()=>{
 const f=await finalizationFixture(),good=await f.options.readAuthorization({intentDigest:f.intentDigest,action:'MERGE_PR'}),base={intentDigest:f.intentDigest,action:'MERGE_PR',ownerSubject:f.configuration.ownerSubject,now:f.state.clock};
 for(const patch of [{qualification:'OWNER_TASK_REVIEW_RECORDED'},{qualification:'OWNER_ACTION_EXECUTION_AUTHORIZATION'},{intentDigest:'f'.repeat(64)},{subject:'foreign'},{actions:['DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW']},{actions:['APPROVE']},{expiresAt:f.state.clock},{issuedAt:f.state.clock+1},{token:'forged'}])assert.throws(()=>validateFixtureExecutionGrant({...good,...patch},base));
});
test('task, source/work/report tuple and exact report bytes drift cannot retarget the reviewed intent',async()=>{
 for(const mutate of [f=>f.revise(),f=>f.state.canonicalHead=FC,f=>f.state.workHead=FA,f=>f.state.reportHead=FA,f=>f.state.reportContent=f.state.reportContent.replace('Fixture Agent test','Different tested claim')]){
  const f=await finalizationFixture();mutate(f);const r=await f.engine.advance(f.intent);assert.notEqual(r.state,'MERGED_DEPLOYMENT_PENDING');assert.equal(f.state.merges,0);assert.equal(f.state.deploys,0);assert.equal(r.receipt,null);
 }
});
test('Owner REQUEST_CHANGES/latest decision drift and PR draft/wrong target/ambiguous or empty CI all block effects',async()=>{
 for(const change of [v=>v.reviewRecord={...v.reviewRecord,sequence:2},v=>v.reviewSequence=2,v=>v.reconciliation.channels.pullRequests.items[0].draft=true,v=>v.reconciliation.channels.pullRequests.items[0].canonicalBase=false,v=>v.reconciliation.channels.pullRequests.items.push({...v.reconciliation.channels.pullRequests.items[0]}),v=>v.reconciliation.channels.checks={...v.reconciliation.channels.checks,state:'NONE',items:[]},v=>v.reconciliation.channels.actions.items[0].conclusion='failure',v=>v.reconciliation.channels.statuses.state='PERMISSION_UNCONFIRMED',v=>v.mergeable=null]){
  const f=await finalizationFixture();f.state.evidencePatch=change;const r=await f.engine.advance(f.intent);assert.equal(f.state.merges,0,r.state);assert.equal(f.state.deploys,0);assert.equal(r.receipt,null);
 }
 const f=await finalizationFixture();f.state.record.review.decision='REQUEST_CHANGES';f.state.record.decisionDigest=await browserContextDigest(f.state.record.review);assert.equal((await f.engine.advance(f.intent)).state,'OWNER_REVIEW_CHANGED');assert.equal(f.state.merges,0);
});
test('capability lease/conditional base safety and scope binding are required, never inferred from passing CI',async()=>{
 for(const key of ['conditionalMergeRefs','previewDeploy','completeOperationLookup','requiredChecksVerified']){const f=await finalizationFixture();f.state.capPatch={[key]:false};assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_CAPABILITY_UNCONFIRMED');assert.equal(f.state.merges,0);}
 const f=await finalizationFixture();f.state.capPatch={intentDigest:'a'.repeat(64)};assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_CAPABILITY_UNCONFIRMED');
 for(const patch of [{projectId:'WOOSONG_BUDDY'},{track:'UNIVERSITY_CANDIDATE'},{deployment:{...f.configuration.deployment,environment:'production'}},{deployment:{...f.configuration.deployment,fixedUrl:'https://attacker.invalid/'}}])assert.throws(()=>validateFinalizationConfiguration({...f.configuration,...patch}));
 const r=await f.engine.advance({...f.intent,deployment:{...f.intent.deployment,teamId:'another-team'}});assert.equal(r.state,'FINALIZATION_UNAVAILABLE');assert.equal(f.state.merges,0);
});
test('lost merge acknowledgement recovers from provider facts after restart without another merge',async()=>{
 const f=await finalizationFixture();f.state.mergeLoss=true;assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_OUTCOME_UNCONFIRMED');assert.equal(f.state.merges,1);assert.equal([...f.records.values()][0].merge,null);
 f.state.actions.delete('MERGE_PR');const r=await f.restart().advance(f.intent);assert.equal(r.state,'DEPLOYMENT_PENDING');assert.equal(f.state.merges,1);assert.equal(f.state.deploys,1);assert.equal(r.receipt.merge.mergeSha,FM);
});
test('lost deployment acknowledgement recovers exact operation/target/SHA and never blindly resubmits an invisible outcome',async()=>{
 const f=await finalizationFixture();await f.engine.advance(f.intent);f.state.deployLoss=true;assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_OUTCOME_UNCONFIRMED');assert.equal(f.state.deploys,1);
 f.state.hiddenDeployment=true;assert.equal((await f.restart().advance(f.intent)).state,'DEPLOYMENT_OUTCOME_UNCONFIRMED');assert.equal(f.state.deploys,1);
 f.state.hiddenDeployment=false;f.state.actions.clear();f.state.deployment.state='READY';assert.equal((await f.restart().advance(f.intent)).state,'FIXTURE_FINALIZATION_VERIFIED');assert.equal(f.state.deploys,1);
});
test('reserved merge attempt with no provider proof stays unconfirmed rather than executing again',async()=>{
 const f=await finalizationFixture();f.state.mergeHook=()=>{throw Error('Rejected before or during effect');};assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_OUTCOME_UNCONFIRMED');assert.equal(f.state.merges,0);f.state.mergeHook=null;assert.equal((await f.restart().advance(f.intent)).state,'MERGE_OUTCOME_UNCONFIRMED');assert.equal(f.state.merges,0);
});
test('READY metadata, blocked/failed served check and partial deployment remain distinct truthful stages',async()=>{
 const f=await finalizationFixture();await f.engine.advance(f.intent);await f.engine.advance(f.intent);assert.equal((await f.engine.advance(f.intent)).state,'DEPLOYMENT_PENDING');assert.equal([...f.records.values()][0].verification,null);
 f.state.deployment.state='READY';for(const [status,state]of [['BLOCKED','SERVED_VERIFICATION_BLOCKED'],['FAIL','SERVED_VERIFICATION_FAILED'],['PASS','FIXTURE_FINALIZATION_VERIFIED']]){f.state.servedStatus=status;const r=await f.engine.advance(f.intent);assert.equal(r.state,state);assert.equal(r.receipt.verification.codeSha,status==='PASS'?FM:null);assert.equal(r.productAccepted,false);}
 assert.equal(f.state.merges,1);assert.equal(f.state.deploys,1);
});
test('Owner/AAL2/member/expiry and pending switch/revocation refuse before or after awaits and release no private receipt',async()=>{
 for(const patch of [{subject:'foreign'},{aal:'aal1'},{memberActive:false},{sessionActive:false},{expiresAt:0}]){const f=await finalizationFixture();Object.assign(f.state.actor,patch);assert.equal((await f.engine.advance(f.intent)).state,'OWNER_DENIED');assert.equal(f.state.merges,0);}
 for(const change of [f=>f.state.current=false,f=>f.state.actor.sessionActive=false]){const f=await finalizationFixture();let release,onEnter;const entered=new Promise(r=>onEnter=r);f.state.readHook=()=>{const wait=new Promise(r=>release=r);onEnter(true);return wait;};const pending=f.engine.advance(f.intent);assert.equal(await Promise.race([entered,pending.then(()=>false)]),true);change(f);release();const r=await pending;assert(['OWNER_DENIED','FINALIZATION_INVALIDATED'].includes(r.state));assert.equal(r.receipt,null);assert.equal(f.state.merges,0);}
});
test('action revocation or source change during journal await is not hidden by a prior authorization',async()=>{
 for(const change of [f=>f.state.actions.clear(),f=>f.state.canonicalHead=FC]){const f=await finalizationFixture();f.state.casHook=()=>change(f);const r=await f.engine.advance(f.intent);assert.notEqual(r.state,'MERGED_DEPLOYMENT_PENDING');assert.equal(f.state.merges,0);assert.equal(f.state.deploys,0);}
});
test('concurrent workflow instances reserve by CAS and perform one merge only',async()=>{
 const f=await finalizationFixture(),other=f.restart();const rows=await Promise.all([f.engine.advance(f.intent),other.advance(f.intent)]);assert.equal(f.state.merges,1);assert.equal(f.state.deploys,0);assert(rows.some(x=>x.state==='MERGED_DEPLOYMENT_PENDING'));assert(rows.some(x=>x.state==='CHECKPOINT_CAS_CONFLICT'));
});
test('forged checkpoint or deployment/merge provider substitution refuses follow-on effects',async()=>{
 const f=await finalizationFixture();await f.engine.advance(f.intent);const cp=[...f.records.values()][0];f.records.set(f.intent.operationId,{...cp,intentDigest:'a'.repeat(64)});assert.equal((await f.restart().advance(f.intent)).state,'CHECKPOINT_CONFLICT');assert.equal(f.state.deploys,0);
 const g=await finalizationFixture();await g.engine.advance(g.intent);g.state.merge.parents=[FA,FC];assert.equal((await g.engine.advance(g.intent)).state,'MERGE_OBSERVATION_CONFLICT');assert.equal(g.state.deploys,0);
 const h=await finalizationFixture();await h.engine.advance(h.intent);await h.engine.advance(h.intent);h.state.deployment.codeSha=FB;assert.equal((await h.engine.advance(h.intent)).state,'DEPLOYMENT_OBSERVATION_CONFLICT');assert.equal(h.state.deploys,1);
});
test('unrelated preexisting provider merge cannot be adopted as execution authority',async()=>{
 const f=await finalizationFixture();f.state.canonicalHead=FM;f.state.merge={qualification:'ISOLATED_FIXTURE_MERGE_OBSERVATION',pullRequestNumber:7,headSha:FB,baseBeforeSha:FA,mergeSha:FM,parents:[FA,FB],canonicalHeadSha:FM};const r=await f.engine.advance(f.intent);assert.equal(r.state,'UNATTRIBUTED_MERGE_REQUIRES_EXPLICIT_ADOPTION');assert.equal(f.state.deploys,0);
});
test('checkpoint file survives a reconstructed engine after acknowledgement loss; no real network/repository/deployment write',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mc-finalization-fixture-')),file=path.join(dir,'private-checkpoint.json');let tail=Promise.resolve();
 const store={async load(){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}},async compareAndSwap(id,expected,next){const op=tail.then(async()=>{const current=await store.load();if((current?.revision||0)!==expected)return false;await fs.writeFile(file,JSON.stringify(next),{mode:0o600});return true;});tail=op.catch(()=>{});return op;}};
 try{const f=await finalizationFixture({store});f.state.mergeLoss=true;assert.equal((await f.engine.advance(f.intent)).state,'PROVIDER_OUTCOME_UNCONFIRMED');assert((await fs.stat(file)).isFile());const recovered=await f.restart().advance(f.intent);assert.equal(recovered.state,'DEPLOYMENT_PENDING');assert.equal(f.state.merges,1);assert.equal(f.state.deploys,1);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('explicit reviewed intent is captured before identity await; later input edits cannot retarget the effect',async()=>{
 const f=await finalizationFixture();let release;f.state.ownerHook=async()=>{if(f.state.ownerReads===1)await new Promise(r=>release=r);};
 const pending=f.engine.advance(f.intent);for(let i=0;i<30&&!release;i++)await new Promise(r=>setImmediate(r));assert(release);f.intent.pullRequestNumber=8;f.intent.deployment.teamId='another-team';f.intent.reviewRecord.review.comment='Changed after click';release();const result=await pending;assert.equal(result.state,'MERGED_DEPLOYMENT_PENDING');assert.equal(result.receipt.merge.pullRequestNumber,7);assert.equal(f.state.merges,1);assert.equal(result.executionAuthorized,false);
});
test('missing generation guard and lease expiry after an evidence await cannot release a writer',async()=>{
 const f=await finalizationFixture();const noGuard=createTaskFinalizationWorkflow({...f.options,stillCurrent:undefined});assert.equal((await noGuard.advance(f.intent)).state,'FINALIZATION_INVALIDATED');assert.equal(f.state.merges,0);
 const g=await finalizationFixture();g.state.capPatch={expiresAt:g.state.clock+5};g.state.readHook=()=>g.state.clock+=10;assert.equal((await g.engine.advance(g.intent)).state,'PROVIDER_CAPABILITY_UNCONFIRMED');assert.equal(g.state.merges,0);
});
test('Owner revocation after a provider effect returns no acknowledgement, then recovery observes facts without replay',async()=>{
 const f=await finalizationFixture();f.state.mergeHook=()=>f.state.actor.sessionActive=false;const r=await f.engine.advance(f.intent);assert.equal(r.state,'OWNER_DENIED');assert.equal(r.receipt,null);assert.equal(f.state.merges,1);assert.equal([...f.records.values()][0].merge,null);
 f.state.actor.sessionActive=true;f.state.mergeHook=null;f.state.actions.clear();assert.equal((await f.restart().advance(f.intent)).state,'MISSING_EXECUTION_AUTHORIZATION');assert.equal(f.state.merges,1);assert.equal([...f.records.values()][0].merge.mergeSha,FM);assert.equal(f.state.deploys,0);
});
test('drift after a confirmed merge blocks deployment; arbitrary provider diagnostics remain private',async()=>{
 const f=await finalizationFixture();await f.engine.advance(f.intent);f.revise();const r=await f.engine.advance(f.intent);assert.equal(r.state,'TASK_REVISION_CHANGED');assert.equal(f.state.deploys,0);
 const g=await finalizationFixture();g.state.readHook=()=>{throw Error('Bearer private-provider-details');};const denied=await g.engine.advance(g.intent);assert.equal(denied.state,'PROVIDER_OUTCOME_UNCONFIRMED');assert.equal(denied.receipt,null);assert(!JSON.stringify(denied).includes('private-provider'));assert.equal(g.state.merges,0);
});
test('new core has no deployed execution route and cannot expand existing source/candidate/production scope',async()=>{
 const f=await finalizationFixture();for(const patch of [{repositoryId:'Synthetic/unregistered'},{canonicalRef:'main'},{deployment:{...f.configuration.deployment,environment:'production'}}])assert.throws(()=>validateFinalizationConfiguration({...f.configuration,...patch}));
 for(const method of ['GET','POST','PUT','DELETE'])for(const route of ['/api/private/task-finalization','/api?route=private/task-finalization'])assert.equal(productionResponse(method,new URL('https://fixture.invalid'+route)).status,method==='GET'?404:403);
});
