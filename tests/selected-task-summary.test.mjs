import test from 'node:test';import assert from 'node:assert/strict';
import {selectedTaskBrief} from '../src/reporting/selected-task-summary.mjs';
import {repositoryRunPresentation} from '../src/reporting/repository-run-contract.mjs';
import {deliveryCompleted} from './helpers/delivery-report-fixture.mjs';
test('brief binds one selected task and keeps v2/v3 delivery qualification rather than treating completion as acceptance',()=>{
 for(const version of ['mc.repository-run.v2','mc.repository-run.v3']){const r=deliveryCompleted();r.schemaVersion=version;if(version.endsWith('v3')){r.activityMode='EXPLICIT_FILE_METADATA';r.activityPaths=['HANDOFF.md'];for(const e of r.events)e.activity=null;}
 const p=repositoryRunPresentation(r),input={presentation:p,projectId:r.projectId,track:r.track,sourceConfirmed:true},b=selectedTaskBrief(input);assert.equal(b.runId,r.runId);assert.equal(b.title,r.featureTitle);assert.equal(b.next,r.events.at(-1).result.nextSteps);assert.equal(b.delivery.delivery,'REPORTED_READY');assert.equal(b.delivery.joeyAcceptance,'PENDING');assert.equal(b.delivery.independentVerification,'PENDING');
 r.events.at(-1).delivery.verification.status='BLOCKED';r.events.at(-1).delivery.verification.checkedSha=null;const blocked=selectedTaskBrief({...input,presentation:repositoryRunPresentation(r)});assert.equal(blocked.delivery.delivery,'REPORTED_INCOMPLETE');assert.equal(blocked.delivery.fixedUrl,'BLOCKED');assert(blocked.delivery.missing.includes('verification'));
 }
});
test('unconfirmed or mismatched scope withdraws brief and historical next steps stay tied to their run',()=>{
 const r=deliveryCompleted(),p=repositoryRunPresentation(r),f={presentation:p,projectId:r.projectId,track:r.track,sourceConfirmed:true};assert.equal(selectedTaskBrief({...f,sourceConfirmed:false}),null);assert.equal(selectedTaskBrief({...f,projectId:'WOOSONG_BUDDY'}),null);assert.equal(selectedTaskBrief({...f,track:'UNIVERSITY_CANDIDATE'}),null);assert.equal(selectedTaskBrief({...f,presentation:null}),null);
 const old=selectedTaskBrief(f),other={...p,runId:'other',featureTitle:'Different task',result:{...p.result,nextSteps:'Different next step'}};assert.notEqual(selectedTaskBrief({...f,presentation:other}).title,old.title);assert.notEqual(selectedTaskBrief({...f,presentation:other}).next,old.next);
 const stale=selectedTaskBrief({...f,presentation:{...p,currentState:'unconfirmed',reportedState:'running',result:null}});assert.equal(stale.state,'unconfirmed');assert.equal(stale.next,null);
});
