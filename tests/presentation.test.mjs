import test from 'node:test';
import assert from 'node:assert/strict';
import {managementSummary,missingLabel,attentionItems,concise} from '../public/presentation.js';
import {REVIEWED_SUMMARIES} from '../public/source-summaries.js';
test('display summaries are exact-source translations and do not mutate project truth',()=>{
  const raw='Do not begin Phase 2 or extract/abstract reusable Core.';
  assert.match(managementSummary(raw,'zh-TW'),/尚未授權/);
  assert.equal(managementSummary('Do begin Phase 2 or extract/abstract reusable Core.','zh-TW'),'尚無已校對摘要；請展開來源查看');
  assert.ok(Object.hasOwn(REVIEWED_SUMMARIES,raw));assert.equal(raw,'Do not begin Phase 2 or extract/abstract reusable Core.');
  assert.ok(concise('x'.repeat(300)).length<=110);
});
test('each missing state has a distinct Traditional Chinese label',()=>{
  assert.deepEqual(['unknown','not_recorded','not_derived','source_unavailable'].map(missingReason=>missingLabel({missingReason},'zh-TW')),['未知','尚未記錄','尚未推導','來源無法取得']);
});
test('attention splits each issue, keeps sources, and leaves project/gates unchanged',()=>{
  const source={classification:'canonical',sourcePath:'/canonical/NEXT_ACTIONS.md',sourceSection:'Decisions Needed From Joey',fingerprint:'a'.repeat(64),verificationStatus:'documented'};
  const project={blocker:{value:'- Need access\n- Changes require Joey explicit approval',classification:'canonical',source},management:{approvals:[{value:'WHAT: Joey must authorize deployment | WHY: The release changes public access | STATUS: pending',classification:'canonical',source}],decisions:[{value:'WHAT: Choose school SSO or email OTP | WHY: Login needs an identity provider | STATUS: pending',classification:'canonical',source}]},conflicts:[],workspaceObservation:{observedAt:new Date().toISOString()},sourceFingerprints:[{path:'/source'}]};
  const before=JSON.stringify(project),items=attentionItems(project);
  assert.equal(items.filter(x=>x.type==='blocker').length,2);assert.equal(items.filter(x=>x.type==='approval').length,0);
  assert.equal(items.filter(x=>x.type==='decision').length,2);assert.equal(items[0].issue.source,source);assert.equal(JSON.stringify(project),before);
});
test('a changed source cannot reuse a previously reviewed summary',()=>{
  for(const raw of Object.keys(REVIEWED_SUMMARIES)){assert.notEqual(managementSummary(raw,'zh-TW'),'尚無已校對摘要；請展開來源查看');}
  assert.equal(managementSummary('Brand-new technical proposition.','zh-TW'),'尚無已校對摘要；請展開來源查看');
});

test('contradictory added lines invalidate reviewed summary and canonical conflict never acquires Git provenance',()=>{
 assert.equal(managementSummary('Do not begin Phase 2 or extract/abstract reusable Core.\nAuthorization changed: Phase 2 is approved.','zh-TW'),'尚無已校對摘要；請展開來源查看');
 const items=attentionItems({conflicts:[{kind:'handoff_conflict',message:'Malformed source'}],workspaceObservation:{source:{sourcePath:'/git'},observedAt:new Date().toISOString()},sourceFingerprints:[{}]});
 assert.equal(items[0].issue.source,null);assert.equal(items[0].issue.classification,'unknown');
});
