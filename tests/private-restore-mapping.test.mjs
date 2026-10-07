// Synthetic mapping fixtures only; real private payloads never enter the suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {privateProjects,createPrivatePreview} from '../docs/contracts/consumer/private-preview.mjs';
import {readPrivateRestore} from '../docs/contracts/consumer/private-restore.mjs';
import {workspaceEvents} from '../public/command-workspace.js';
import {productionResponse} from '../api/index.mjs';
const fixture=()=>({views:[{projectId:'SYNTHETIC',projectView:{documentedPurpose:'Synthetic purpose',workState:'NO_ACTIVE_WORK'},phase:{stage:'Synthetic record',stageDate:'2026-01-01',stageVerificationStatus:'SYNTHETIC_UNVERIFIED'},lastConfirmed:{completion:'Synthetic completion',at:'2026-01-01',actor:null,model:null,actorMissingReason:'Unknown'},claimEvidence:{nextAction:{value:'Synthetic next'},blockerApproval:{value:null},stage:{sourceRefs:['synthetic-source']}},sourceRevision:'synthetic-v2',sourceTimestamp:'2026-01-02',readAt:'2026-01-04T00:00:00Z',extractedAt:'2026-01-03T00:00:00Z',baseline:{sha:'a'.repeat(40),branch:'synthetic'},ownerCanonicalState:{metadata:{revision:3}}}]});
test('private projection preserves historical public and current safe receipt layers without promoting state',()=>{
 const m={project_id:'SYNTHETIC',product:{name:'Synthetic name'},runtime:{currentAgent:'old'},sourceReadout:{verifiedRemoteSha:'b'.repeat(40)},canonicalState:{historical:true}},before=JSON.stringify(m),out=privateProjects([m],fixture())[0];assert.equal(JSON.stringify(m),before);assert.equal(out.sourceReadout.verifiedRemoteSha,'b'.repeat(40));assert.equal(out.privateSource.baseline.sha,'a'.repeat(40));assert.equal(out.privateSource.readAt,'2026-01-04T00:00:00Z');assert.equal(out.privateSource.extractedAt,'2026-01-03T00:00:00Z');assert.equal(out.canonicalState.metadata.revision,3);assert.equal(out.runtime.currentAgent,null);assert.equal(out.runtime.currentMission,null);
});
test('Workspace private event preserves qualification, direct source revision/timestamp and separate read/extract/event time',()=>{
 const m=privateProjects([{project_id:'SYNTHETIC',product:{name:'Synthetic'},runtime:{}}],fixture())[0],e=workspaceEvents(m,{readOnly:true,locale:'en'})[0];assert.equal(e.id,'private-source');assert.equal(e.status,'SYNTHETIC_UNVERIFIED');assert.equal(e.eventTime,'2026-01-01');assert.equal(e.sourceTimestamp,'2026-01-02');assert.equal(e.extractedAt,'2026-01-03T00:00:00Z');assert.equal(e.consumerReadAt,'2026-01-04T00:00:00Z');assert.equal(e.sourceRevision,'synthetic-v2');assert.equal(e.actor,null);
});
test('private preview rejects nonloopback, cross-origin and every nonGET before reading data',async()=>{
 const h=createPrivatePreview({root:'/synthetic-unavailable'});
 for(const req of [{method:'GET',headers:{host:'outside.invalid'}},{method:'GET',headers:{host:'127.0.0.1',origin:'https://outside.invalid'}},...['POST','PUT','PATCH','DELETE','HEAD'].map(method=>({method,headers:{host:'127.0.0.1'}}))]){let status;await h({...req,url:'/api/projects'},{writeHead:s=>status=s,end:()=>{}});assert.equal(status,403);}
});
test('private loader refuses product-tree roots and bad synthetic staging; public endpoints have no private projection',async()=>{
 await assert.rejects(readPrivateRestore({root:process.cwd(),readAt:'2026-01-04T00:00:00Z'}),/outside product/);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-synthetic-bad-restore-'));try{await assert.rejects(readPrivateRestore({root,readAt:'2026-01-04T00:00:00Z'}));}finally{await fs.rm(root,{recursive:true});}
 const list=productionResponse('GET',new URL('https://fixture/api/index?route=projects')).body;assert.ok(list.every(m=>!m.privateSource&&!m.privateReadonlyRestore));assert.doesNotMatch(JSON.stringify(list),/private_filtered_readonly_staging|private-filtered-source/);
 for(const route of ['private-restore','private-projects','docs/contracts/consumer/private-preview.mjs'])assert.equal(productionResponse('GET',new URL('https://fixture/api/index?route='+route)).status,404);
});

test('different claim statuses/references/event times and null reasons remain independent from stage evidence',()=>{const r=fixture(),v=r.views[0];v.claimEvidence.stage={value:'Synthetic stage',verificationStatus:'SYNTHETIC_VERIFIED',sourceRefs:['stage-ref'],missingReason:null};v.claimEvidence.lastConfirmedCompletion={value:'Synthetic unverified completion',verificationStatus:'SYNTHETIC_UNVERIFIED',sourceRefs:['completion-ref'],missingReason:null};v.claimEvidence.nextAction={value:null,verificationStatus:'SYNTHETIC_UNKNOWN',sourceRefs:[],missingReason:'Synthetic missing next'};v.claimSources={stage:{asOf:'2026-01-01'},lastConfirmedCompletion:{asOf:'2026-01-05'}};const m=privateProjects([{project_id:'SYNTHETIC',product:{name:'Synthetic'},runtime:{}}],r)[0],e=workspaceEvents(m,{readOnly:true,locale:'en'})[0];assert.equal(e.claims.stage.eventTime,'2026-01-01');assert.equal(e.claims.lastConfirmedCompletion.eventTime,'2026-01-05');assert.equal(e.claims.lastConfirmedCompletion.verificationStatus,'SYNTHETIC_UNVERIFIED');assert.deepEqual(e.claims.lastConfirmedCompletion.sourceRefs,['completion-ref']);assert.equal(e.claims.nextAction.missingReason,'Synthetic missing next');assert.equal(e.claims.nextAction.eventTime,null);});
