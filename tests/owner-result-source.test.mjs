import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinatorResultStates} from '../src/continuity/owner-result-source.mjs';
function fixture(){
 const scope={projectId:'NEXAEON',epoch:'synthetic_epoch',baselineSha:'b'.repeat(40),contextHash:'c'.repeat(64)};
 const proposal={revision:1,operationId:'synthetic_proposal',digest:'d'.repeat(64),committedAt:100,content:{operation:{kind:'proposal',payload:{proposalId:'synthetic_feature',contextHash:scope.contextHash,acceptanceHash:'a'.repeat(64),expiresAt:1000}}}};
 const result={revision:2,operationId:'synthetic_result',digest:'e'.repeat(64),committedAt:200,content:{operation:{kind:'result',payload:{proposalId:'synthetic_feature',resultHash:'f'.repeat(64),evidenceHashes:['1'.repeat(64)],qualification:'SUBMITTER_ATTESTED'}}}};
 const page={...scope,writerQualification:'TOOL_MEDIATED_COORDINATOR_ATTESTATION',runtimeConnected:false,afterRevision:0,revision:2,receipts:[proposal,result]};
 const decisionPage={...scope,qualification:'VERIFIED_OWNER_AAL2_DECISION',runtimeConnected:false,executionAuthorized:false,afterRevision:0,revision:0,decisions:[]};
 const decision={revision:1,committedAt:300,content:{...scope,proposalId:'synthetic_feature',proposalOperationId:proposal.operationId,proposalDigest:proposal.digest,acceptanceHash:proposal.content.operation.payload.acceptanceHash,resultOperationId:result.operationId,resultDigest:result.digest,resultHash:result.content.operation.payload.resultHash,evidenceHashes:[...result.content.operation.payload.evidenceHashes],resultQualification:'SUBMITTER_ATTESTED',decision:'ACCEPT'}};
 return{page,decisionPage,decision};
}
const state=f=>coordinatorResultStates({...f,now:f.now??500}).byOperation.get('synthetic_result');
test('matching result becomes reviewable, with a local expiry boundary and no page mutation',()=>{
 const f=fixture(),before=structuredClone(f),projection=coordinatorResultStates({...f,now:500});
 assert.equal(projection.byOperation.get('synthetic_proposal'),'READY_TO_REVIEW');assert.equal(state(f),'READY_TO_REVIEW');assert.equal(projection.nextExpiry,1000);assert.deepEqual(f,before);
 assert.equal(state({...f,now:1000}),'EXPIRED');assert.equal(coordinatorResultStates({...f,now:1000}).nextExpiry,null);
});
test('proposal without a result stays awaiting return, then expires rather than implying completion',()=>{
 const f=fixture();f.page.receipts.pop();f.page.revision=1;
 assert.equal(coordinatorResultStates({...f,now:500}).byOperation.get('synthetic_proposal'),'AWAITING_RESULT');
 assert.equal(coordinatorResultStates({...f,now:1000}).byOperation.get('synthetic_proposal'),'EXPIRED');
});
test('only an exactly bound saved Owner decision survives proposal expiry',()=>{
 for(const outcome of ['ACCEPT','REJECT']){const f=fixture();f.decision.content.decision=outcome;f.decisionPage.decisions=[f.decision];f.decisionPage.revision=1;assert.equal(state({...f,now:2000}),'SAVED_'+outcome);}
 for(const key of ['projectId','epoch','baselineSha','contextHash','proposalId','proposalOperationId','proposalDigest','acceptanceHash','resultOperationId','resultDigest','resultHash','resultQualification']){
  const f=fixture();f.decision.content[key]='mismatch';f.decisionPage.decisions=[f.decision];f.decisionPage.revision=1;
  // A different proposal belongs to another record; it cannot mark this one accepted.
  assert.equal(state(f),key==='proposalId'?'READY_TO_REVIEW':'SOURCE_CONFLICT');
 }
 const f=fixture();f.decision.content.evidenceHashes=['2'.repeat(64)];f.decisionPage.decisions=[f.decision];f.decisionPage.revision=1;assert.equal(state(f),'SOURCE_CONFLICT');
});
test('orphan results, duplicate results or decisions and incorrect ordering never become reviewable',()=>{
 for(const mutate of [f=>{f.page.receipts.shift();f.page.afterRevision=1;},f=>{const r=structuredClone(f.page.receipts[1]);r.operationId='second';r.revision=3;f.page.receipts.push(r);f.page.revision=3;},f=>{f.page.receipts[1].committedAt=1000;},f=>{f.decisionPage.decisions=[f.decision,{...f.decision,revision:2}];f.decisionPage.revision=2;}]){const f=fixture();mutate(f);assert.notEqual(state(f),'READY_TO_REVIEW');}
});
test('bounded partial journal or decision pages cannot assert a pending review',()=>{
 for(const mutate of [f=>f.page.revision=3,f=>f.page.afterRevision=1,f=>f.decisionPage.revision=1,f=>f.decisionPage.afterRevision=1,f=>f.decisionPage=null]){const f=fixture();mutate(f);assert.equal(state(f),'SOURCE_INCOMPLETE');}
 const f=fixture();f.page.receipts=[];f.page.revision=0;assert.equal(coordinatorResultStates({...f,now:500}).byOperation.size,0);
});
test('scope drift, source qualification changes and late saved decisions fail closed',()=>{
 for(const mutate of [f=>f.decisionPage.contextHash='changed',f=>f.decisionPage.executionAuthorized=true,f=>f.page.runtimeConnected=true,f=>f.page.receipts[0].content.operation.payload.contextHash='changed',f=>{f.decision.committedAt=1000;f.decisionPage.decisions=[f.decision];f.decisionPage.revision=1;}]){const f=fixture();mutate(f);assert.equal(state(f),'SOURCE_CONFLICT');}
});
