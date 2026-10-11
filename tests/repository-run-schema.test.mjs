import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSchema,validate} from '../src/api/validation.mjs';
import {validateRepositoryRun} from '../src/reporting/repository-run-contract.mjs';
import {deliveryPolicy,emptyDeliveryEvidence} from '../src/reporting/delivery-evidence.mjs';
import {deliveryRun,deliveryCompleted,deliveryScope,deliveryAt} from './helpers/delivery-report-fixture.mjs';

const schema=await loadSchema('repository-run-report'),now=Date.parse(deliveryAt);
const contract=r=>{try{validateRepositoryRun(r,{now});return true;}catch{return false;}};
const v1=()=>{const r=deliveryCompleted();r.schemaVersion='mc.repository-run.v1';delete r.taskKind;for(const e of r.events)delete e.delivery;return r;};
const changed=(base,mutation)=>{const r=structuredClone(base);mutation(r);return r;};
export function schemaParityCorpus(){
 const good=deliveryCompleted(),old=v1(),rows=[{name:'historical v1',value:old,valid:true},{name:'v2 complete',value:good,valid:true},{name:'v2 unrecorded',value:deliveryRun(),valid:true}];
 const add=(name,value,valid=false)=>rows.push({name,value,valid});
 for(const base of [old,good]){
  for(const key of Object.keys(base))add('missing '+base.schemaVersion+' '+key,changed(base,r=>delete r[key]));
  for(const key of Object.keys(base.baseline).filter(k=>k!=='contextPaths'))add('missing baseline '+key,changed(base,r=>delete r.baseline[key]));
  for(const key of Object.keys(base.events[1]))add('missing event '+key,changed(base,r=>delete r.events[1][key]));
  for(const key of Object.keys(base.events[1].result))add('missing result '+key,changed(base,r=>delete r.events[1].result[key]));
  for(const [name,mutate] of [['unknown header',r=>r.trusted=true],['unknown event',r=>r.events[0].accepted=true],['unknown baseline',r=>r.baseline.owner='x'],['unknown result',r=>r.events[1].result.verified=true],['length bound',r=>r.featureTitle='x'.repeat(501)],['control text',r=>r.featureTitle='bad\ntext'],['case-insensitive secret',r=>r.agentName='TOKEN=example'],['unsafe path',r=>r.workRef='../main'],['array bound',r=>r.baseline.contextPaths=Array(5).fill('README.md')],['fraction sequence',r=>r.events[1].sequence=1.5],['sequence minimum',r=>r.events[0].sequence=0],['wrong result slot',r=>r.events[0].result=r.events[1].result],['missing completed result',r=>r.events[1].result=null],['impossible date',r=>r.events[0].eventAt='2026-02-30T00:00:00Z']])add(name,changed(base,mutate));
 }
 add('v1 taskKind rejected',changed(old,r=>r.taskKind='FEATURE'));add('v1 delivery rejected',changed(old,r=>r.events[0].delivery=null));
 const doc=changed(good,r=>{r.taskKind='DOCUMENTATION';const d=r.events[1].delivery;d.deployment={status:'NOT_REQUIRED',target:null,id:null,deployedSha:null,url:null,observedAt:null,evidence:null,notRequired:{policy:'MC_DOCUMENTATION_ONLY',reason:'Documentation changes only'}};d.verification={status:'NOT_REQUIRED',method:null,checkedAt:null,deploymentId:null,checkedSha:null,url:null,evidence:null,notRequired:{policy:'MC_DOCUMENTATION_ONLY',reason:'No application behavior changes'}};});add('explicit MC documentation N/A',doc,true);add('feature cannot waive deployment',changed(doc,r=>r.taskKind='FEATURE'));add('blank N/A reason',changed(doc,r=>r.events[1].delivery.deployment.notRequired.reason=' '));
 add('unknown version',changed(good,r=>r.schemaVersion='mc.repository-run.v3'));add('unknown task kind',changed(good,r=>r.taskKind='DEPLOY_ALL'));
 for(const key of Object.keys(good.events[1].delivery))add('missing delivery '+key,changed(good,r=>delete r.events[1].delivery[key]));
 for(const section of ['scope','deployment','verification','handoff','data']){
  const d=good.events[1].delivery[section];for(const key of Object.keys(d))add('missing '+section+' '+key,changed(good,r=>delete r.events[1].delivery[section][key]));
  add('unknown '+section,changed(good,r=>r.events[1].delivery[section].accepted=true));
 }
 for(const [name,mutate] of [['qualification',d=>d.qualification='MC_VERIFIED'],['credential',d=>d.handoff.evidence='bEaReR sample'],['trusted claim',d=>d.handoff.evidence='independently_verified'],['blank evidence',d=>d.deployment.evidence='   '],['evidence length',d=>d.data.notRequired.reason='x'.repeat(501)],['missing READY id',d=>d.deployment.id=null],['blocked served SHA',d=>d.verification.status='BLOCKED'],['target mismatch',d=>d.deployment.target.project='other'],['unknown URL',d=>d.deployment.url='https://unknown.invalid/'],['credential URL',d=>d.deployment.url='https://user:pass@nexaeon-web.vercel.app/'],['query URL',d=>d.deployment.url+='?token=a'],['N/A policy',d=>d.data.notRequired.policy='ANY_NO_CHANGE'],['not recorded stale fields',d=>d.deployment.status='NOT_RECORDED']])add(name,changed(good,r=>mutate(r.events[1].delivery)));
 for(const projectId of ['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D']){
  const r=changed(good,r=>{r.projectId=projectId;const d=r.events[1].delivery,p=deliveryPolicy(r);d.scope.projectId=projectId;d.deployment.target=p.target;d.deployment.url=d.verification.url=p.url;d.data={status:'NOT_RECORDED',version:null,checkedAt:null,evidence:null,notRequired:null};});
  add(projectId+' exact target',r,true);
  for(const other of ['MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D'].filter(p=>p!==projectId))add(projectId+' refuses '+other+' URL',changed(r,r=>r.events[1].delivery.deployment.url=r.events[1].delivery.verification.url=deliveryPolicy({projectId:other,track:'BASELINE'}).url));
  add(projectId+' MC target isolated',changed(r,r=>r.events[1].delivery.deployment.target=deliveryPolicy(good).target));
  add(projectId+' inherited N/A denied',changed(r,r=>r.events[1].delivery.data=good.events[1].delivery.data));
  add(projectId+' documentation cannot inherit MC waiver',changed(doc,r=>{r.projectId=projectId;r.events[1].delivery.scope.projectId=projectId;}));
 }
 for(const track of ['BASELINE','UNIVERSITY_CANDIDATE']){
  const r=deliveryRun({scope:{...deliveryScope,projectId:'JOEY_ASSET_SYSTEM',track}});r.events[0].delivery=emptyDeliveryEvidence(r,'b'.repeat(40));add('Asset '+track+' unrecorded',r,true);
  add('Asset '+track+' inherited URL denied',changed(r,r=>r.events[0].delivery.deployment={...good.events[1].delivery.deployment}));
 }
 return rows;
}
test('standalone strict v1/v2 structure and static target policies match code validator',()=>{
 for(const {name,value,valid} of schemaParityCorpus()){assert.equal(contract(value),valid,'contract '+name);assert.equal(validate(schema,value).valid,valid,'schema '+name);}
});
test('schema-only does not certify semantic equality, lifecycle, source binding or currentness',()=>{
 for(const mutate of [r=>r.events[1].delivery.scope.runId='other-run',r=>r.events[1].delivery.deployment.deployedSha='a'.repeat(40),r=>r.events[1].delivery.verification.deploymentId='dpl_other',r=>r.events[1].delivery.handoff.path='docs/unregistered.md',r=>r.events[1].delivery.deployment.observedAt='2026-10-11T00:00:00Z',r=>r.events[1].sequence=3]){
  const r=changed(deliveryCompleted(),mutate);assert.equal(validate(schema,r).valid,true);assert.equal(contract(r),false);
 }
});
test('metadata policies are cloned, baseline-only, fixed HTTPS and grant no N/A or executable capability',()=>{
 const projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D'];for(const projectId of projects){const p=deliveryPolicy({projectId,track:'BASELINE'});assert.equal(p.target.environment,'production');assert.equal(p.docsPolicy,null);assert.equal(p.dataPolicy,null);p.target.project='tampered';assert.notEqual(deliveryPolicy({projectId,track:'BASELINE'}).target.project,'tampered');assert.equal(deliveryPolicy({projectId,track:'UNIVERSITY_CANDIDATE'}),null);}
 assert.equal(deliveryPolicy({projectId:'JOEY_ASSET_SYSTEM',track:'BASELINE'}),null);assert.equal(deliveryPolicy({projectId:'JOEY_ASSET_SYSTEM',track:'UNIVERSITY_CANDIDATE'}),null);assert.equal(deliveryPolicy({projectId:'UNKNOWN',track:'BASELINE'}),null);
});
