import test from 'node:test';
import assert from 'node:assert/strict';
import {buddyMaintenanceReceipt as receipt,approvedMaintenanceReceipts,resolvePreparedRejection} from '../src/reporting/repository-run-maintenance-server.mjs';
import {repositoryRunConfiguration,readRepositoryRuns} from '../src/reporting/repository-run-source.mjs';
import {repositoryReportFixture} from './helpers/repository-report-fixture.mjs';
import {createRepositoryRunReader,validateRepositoryRunReply} from '../src/reporting/repository-run-client.mjs';
import {joeyRunSummary} from '../src/reporting/joey-run-summary.mjs';
import {publicTowerSummary} from '../src/reporting/public-tower-runs.mjs';
import {projectCard} from '../public/tower-model.js';
const config=repositoryRunConfiguration('WOOSONG_BUDDY');
const successor=()=>({report:{runId:'codex-buddy-history-backfill-20261103',projectId:receipt.projectId,track:receipt.track,repositoryId:receipt.repositoryId,reportRef:receipt.reportRef,events:[{kind:'completed',result:{codeSha:'d70a7963febb669fd6205d10e2f7e0c3bf16c03a',handoff:{path:'README.md',commitSha:'d70a7963febb669fd6205d10e2f7e0c3bf16c03a'}}}]},source:{path:'.mission-control/runs/codex-buddy-history-backfill-20261103.json',providerBlobId:'1794459edc27524bc8815295bc795c6b8d1d9901'}});
const input=()=>({configuration:config,rejection:{runId:receipt.runId,path:receipt.path,providerBlobId:receipt.originalBlobId,errorCategory:receipt.rejectionReason},receipts:approvedMaintenanceReceipts,runs:[successor()]});
test('Buddy maintenance needs exact approved rejected blob and validated immutable backfill in the same scope',()=>{
 assert.deepEqual(resolvePreparedRejection(input()),receipt);
 for(const key of ['runId','path','providerBlobId','errorCategory']){const v=input();v.rejection[key]='changed';assert.equal(resolvePreparedRejection(v),null);}
 for(const key of ['projectId','track','repositoryId','reportRef']){const v=input();v.configuration={...config,[key]:'changed'};assert.equal(resolvePreparedRejection(v),null);}
 for(const rows of [[],[{...successor(),source:{...successor().source,providerBlobId:'a'.repeat(40)}}]])assert.equal(resolvePreparedRejection({...input(),runs:rows}),null);
 for(const key of ['runId','projectId','track','repositoryId','reportRef']){const v=input();v.runs[0].report[key]='changed';assert.equal(resolvePreparedRejection(v),null);}
 for(const key of ['path','providerBlobId']){const v=input();v.runs[0].source[key]='changed';assert.equal(resolvePreparedRejection(v),null);}
 for(const mutate of [r=>r.events[0].kind='failed',r=>r.events[0].result.codeSha='a'.repeat(40),r=>r.events[0].result.handoff.path='other.md',r=>r.events[0].result.handoff.commitSha='b'.repeat(40)]){const v=input();mutate(v.runs[0].report);assert.equal(resolvePreparedRejection(v),null);}
 assert.equal(resolvePreparedRejection({...input(),receipts:[]}),null);
 assert.equal(resolvePreparedRejection({...input(),receipts:[{...receipt,originalBlobId:'a'.repeat(40)}]}),null);
 assert.equal(resolvePreparedRejection({...input(),report:{events:[{kind:'completed'}]}}),null);
});
test('Buddy receipt survives client and continuation audit; tampering, policy withdrawal and Owner loss invalidate copy',async()=>{
 const f=repositoryReportFixture({projectId:'WOOSONG_BUDDY'});
 try{
  const started=f.run('start');assert.equal(started.exitCode,0,started.error);
  const done=f.run('append',{kind:'completed',expectedFileSha:started.output.fileSha,expectedSequence:1,result:{codeSha:f.packet.source.resolvedCommitSha,tests:[{name:'Synthetic reporting fixture',outcome:'PASS'}],nextSteps:'No product acceptance claimed',handoff:{path:'README.md',commitSha:f.packet.source.resolvedCommitSha}}});assert.equal(done.exitCode,0,done.error);
  const base=await readRepositoryRuns({configuration:f.config,reader:f.reader});
  // Synthetic server boundary; the exact server exclusion is independently tested above.
  base.resolvedRejections=[receipt];base.inventory.totalFiles++;base.inventory.pages[0].count++;
  const owner='11111111-1111-4111-8111-111111111111',actor={subject:owner,status:'authenticated',role:'OWNER',aal:'aal2',verified:true,sessionActive:true,memberActive:true,projects:['NEXAEON'],identityProject:'NEXAEON',expiresAt:Date.now()+120000};
  const reply={schemaVersion:1,observation:base,authorization:{qualification:'OWNER_REPOSITORY_RUN_READ_POLICY',subject:owner,identityProject:'NEXAEON',projectId:receipt.projectId,track:receipt.track,repositoryId:receipt.repositoryId,reportRef:'mc/progress',directory:'.mission-control/runs',directories:['.mission-control/runs','.mission-control/runs-page-2']},expiresAt:actor.expiresAt,privateReadOnly:true};
  assert.doesNotThrow(()=>validateRepositoryRunReply(reply,{projectId:receipt.projectId,ownerSubject:owner}));
  for(const key of ['receiptId','projectId','track','repositoryId','reportRef','runId','path','originalBlobId','rejectionReason','maintenanceReason','disposition','validation']){const bad=structuredClone(reply);bad.observation.resolvedRejections[0][key]='INVALID';assert.throws(()=>validateRepositoryRunReply(bad,{projectId:receipt.projectId,ownerSubject:owner}),key==='path'?/RUN_REPORT_PATH_INVALID/:/MAINTENANCE/);}
  let current=reply,authorized=true;
  const reader=createRepositoryRunReader({client:{read:async()=>current},inspectIdentity:async()=>authorized?actor:null,ownerSubject:owner,projectId:receipt.projectId,setTimer:()=>1,clearTimer:()=>{}});
  reader.update({enabled:true});await reader.refresh();const packet=await reader.prepareContinuation({expectedRepositoryId:receipt.repositoryId});assert(packet&&reader.continuationCurrent(packet));assert.deepEqual(packet.maintenanceAudit.resolvedRejections,[receipt]);assert(!packet.runs.some(r=>r.runId===receipt.runId));
  packet.maintenanceAudit.resolvedRejections[0].originalBlobId='a'.repeat(40);assert(!reader.continuationCurrent(packet));
  const fresh=await reader.prepareContinuation({expectedRepositoryId:receipt.repositoryId});assert(fresh);
  current=structuredClone(reply);current.observation.status='PARTIAL';current.observation.resolvedRejections=[];current.observation.rejectedRuns=[{qualification:'REJECTED_SHA_PINNED_REPORT_NOT_ACCEPTED',runId:receipt.runId,path:receipt.path,providerBlobId:receipt.originalBlobId,errorCategory:'RUN_REPORT_INVALID'}];
  await reader.refresh();assert(!reader.continuationCurrent(fresh));assert.equal(await reader.prepareContinuation({expectedRepositoryId:receipt.repositoryId}),null);
  const summary=publicTowerSummary(joeyRunSummary({view:{status:'connected',observation:base},projectId:receipt.projectId,sourceConfirmed:true}));const card=projectCard({id:receipt.projectId,name:'Buddy',joeyStatus:'paused',updatedAt:'2026-10-03'},{runs:summary});assert.equal(card.state,'paused');assert.equal(card.history.length,1);assert.equal(card.lastAgent,'Synthetic Fixture Agent');assert.equal(card.version,null);assert.notEqual(card.updatedAt,'2026-10-03');assert(!JSON.stringify(summary).includes(receipt.originalBlobId));assert(!JSON.stringify(summary).includes(receipt.path));
  authorized=false;assert.equal(await reader.prepareContinuation({expectedRepositoryId:receipt.repositoryId}),null);reader.dispose();
 }finally{f.dispose();}
});
