import test from 'node:test';
import assert from 'node:assert/strict';
import {createDevelopmentTask} from '../src/tasks/development-task.mjs';
import {createTaskRequirements} from '../src/tasks/task-requirements.mjs';
import {TASK_REVIEW_VERSION} from '../src/tasks/task-review-contract.mjs';
import {taskReviewReworkInput} from '../src/tasks/task-review-rework.mjs';
import {browserContextDigest} from '../src/continuity/browser-context-digest.mjs';

const now=Date.parse('2026-10-12T16:00:00Z'),sha='a'.repeat(40);
async function fixture(overrides={}) {
 const task=createDevelopmentTask({projectId:'WOOSONG_BUDDY',track:'BASELINE'},{feature:'Original complete request\n保留原文',acceptance:'Original acceptance',constraints:'Existing constraints'},{taskId:'task_'+'1'.repeat(24),now});
 const review={schemaVersion:TASK_REVIEW_VERSION,projectId:task.projectId,track:task.track,taskId:task.taskId,taskRequirements:await createTaskRequirements(task),repositoryId:'JoeyAJ/woosongbuddy',canonicalRef:'main',canonicalHeadSha:sha,reportRef:'mc/progress',reportPath:'.mission-control/runs/rework-fixture.json',reportHeadSha:sha,reportBlobId:sha,reportSequence:2,runId:'rework-fixture',workRef:'feature/rework',codeSha:sha,decision:'REQUEST_CHANGES',comment:'請修正手機版驗收失敗\nKeep keyboard access',...overrides};
 return {task,record:{sequence:1,operationId:'11111111-1111-4111-8111-111111111111',committedAt:new Date(now).toISOString(),decisionDigest:await browserContextDigest(review),review}};
}
test('requested changes preserve the full original request and acceptance with dated review provenance',async()=>{
 const f=await fixture(),before=structuredClone(f),input=await taskReviewReworkInput(f);
 assert.equal(input.feature,f.task.request.feature);assert.equal(input.acceptance,f.task.request.acceptance);assert(input.constraints.startsWith(f.task.request.constraints+'\n\n'));assert(input.constraints.endsWith(f.record.review.comment));assert(input.constraints.includes(f.record.operationId));assert.deepEqual(f,before);
});
test('approval, empty opinions, wrong scope/revision and corrupt decision proof cannot produce a rework edit',async()=>{
 for(const patch of [{decision:'APPROVE'},{comment:''},{projectId:'NEXAEON'},{track:'UNIVERSITY_CANDIDATE'},{taskId:'task_'+'2'.repeat(24)}]){const f=await fixture(patch);await assert.rejects(taskReviewReworkInput(f));}
 const f=await fixture();f.task.revision++;await assert.rejects(taskReviewReworkInput(f),/CURRENT_REQUIREMENTS/);
 const corrupt=await fixture();corrupt.record.decisionDigest='b'.repeat(64);await assert.rejects(taskReviewReworkInput(corrupt),/REVIEW_DIGEST/);
});
test('a full constraints field refuses rework without truncating either original text or review',async()=>{
 const f=await fixture();f.task.request.constraints='x'.repeat(6000);f.record.review.taskRequirements=await createTaskRequirements(f.task);f.record.decisionDigest=await browserContextDigest(f.record.review);const before=structuredClone(f);
 await assert.rejects(taskReviewReworkInput(f),/CONSTRAINTS_CAPACITY/);assert.deepEqual(f,before);
});
