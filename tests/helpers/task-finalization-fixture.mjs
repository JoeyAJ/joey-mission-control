import {createHash} from 'node:crypto';
import {createDevelopmentTask,reviseDevelopmentTask} from '../../src/tasks/development-task.mjs';
import {createTaskRequirements} from '../../src/tasks/task-requirements.mjs';
import {TASK_REVIEW_VERSION} from '../../src/tasks/task-review-contract.mjs';
import {browserContextDigest} from '../../src/continuity/browser-context-digest.mjs';
import {createRepositoryRun,appendRepositoryRunEvent} from '../../src/reporting/repository-run-contract.mjs';
import {repositoryRunConfiguration} from '../../src/reporting/repository-run-source.mjs';
import {RECONCILIATION_VERSION} from '../../src/tasks/task-reconciliation-contract.mjs';
import {deliveryPolicy} from '../../src/reporting/delivery-evidence.mjs';
import {FINALIZATION_VERSION,finalizationIntentDigest} from '../../src/tasks/task-finalization-contract.mjs';
import {createFinalizationProviderAdapter} from '../../src/tasks/task-finalization-provider.mjs';
import {createTaskFinalizationWorkflow} from '../../src/tasks/task-finalization-workflow.mjs';

export const FINALIZATION_FIXTURE_NOW=Date.parse('2026-10-11T17:00:00Z'),FA='a'.repeat(40),FB='b'.repeat(40),FC='c'.repeat(40),FM='d'.repeat(40);
export async function finalizationFixture({store:providedStore=null}={}){
 const source=repositoryRunConfiguration('MISSION_CONTROL'),ownerSubject='synthetic-owner';
 const configuration={projectId:source.projectId,track:source.track,repositoryId:source.repositoryId,canonicalRef:source.entry.ref,ownerSubject,deployment:{provider:'vercel',project:'joey-mission-control',projectId:'prj_fixture_mc',teamId:'team_fixture',repositoryId:1404959099,environment:'preview',fixedUrl:deliveryPolicy(source).url},requiredChecks:[{channel:'checks',label:'unit'},{channel:'statuses',label:'preview'},{channel:'actions',label:'CI'}]};
 let task=createDevelopmentTask({projectId:source.projectId,track:source.track},{feature:'Synthetic authorized feature',acceptance:'Exact matching feature',constraints:'Fixture provider only'},{taskId:'task_'+'1'.repeat(24),now:FINALIZATION_FIXTURE_NOW});
 const requirements=await createTaskRequirements(task);
 let report=createRepositoryRun({schemaVersion:'mc.repository-run.v2',taskKind:'FEATURE',taskRequirements:requirements,scope:{...source.entry,baselineSha:FA,entryDigest:'e'.repeat(64)},runId:'synthetic-finalization-run',taskId:task.taskId,featureTitle:'Synthetic requested feature',agentName:'Synthetic fixture Agent',workRef:'feature/finalization-fixture',eventId:'start',summary:'Synthetic actual fixture start',now:FINALIZATION_FIXTURE_NOW-2000});
 report=appendRepositoryRunEvent(report,{id:'done',sequence:2,eventAt:new Date(FINALIZATION_FIXTURE_NOW-1000).toISOString(),kind:'completed',summary:'Synthetic fixture complete',result:{codeSha:FB,tests:[{name:'Fixture Agent test',outcome:'PASS'}],nextSteps:'Owner acceptance separate',handoff:{path:source.entry.path,commitSha:FB}},delivery:null},{expectedSequence:1,scope:source.entry,now:FINALIZATION_FIXTURE_NOW}).report;
 const reportContent=JSON.stringify(report,null,2)+'\n',blob=createHash('sha1').update('blob '+Buffer.byteLength(reportContent)+'\0').update(reportContent).digest('hex');
 const review={schemaVersion:TASK_REVIEW_VERSION,projectId:source.projectId,track:source.track,taskId:task.taskId,taskRequirements:requirements,repositoryId:source.repositoryId,canonicalRef:source.entry.ref,canonicalHeadSha:FA,reportRef:'mc/progress',reportPath:'.mission-control/runs/'+report.runId+'.json',reportHeadSha:FC,reportBlobId:blob,reportSequence:2,runId:report.runId,workRef:report.workRef,codeSha:FB,decision:'APPROVE',comment:'Synthetic exact tuple accepted'};
 const record={sequence:1,operationId:'11111111-1111-4111-8111-111111111111',decisionDigest:await browserContextDigest(review),committedAt:new Date(FINALIZATION_FIXTURE_NOW-500).toISOString(),review};
 const intent={schemaVersion:FINALIZATION_VERSION,operationId:'22222222-2222-4222-8222-222222222222',reviewRecord:record,pullRequestNumber:7,mergeMethod:'merge',deployment:configuration.deployment},intentDigest=await finalizationIntentDigest(intent);
 const actor={subject:ownerSubject,status:'authenticated',role:'OWNER',aal:'aal2',verified:true,memberActive:true,sessionActive:true,projects:['NEXAEON'],expiresAt:FINALIZATION_FIXTURE_NOW+600000};
 const state={clock:FINALIZATION_FIXTURE_NOW,task,record:structuredClone(record),reportContent,blob,canonicalHead:FA,workHead:FB,reportHead:FC,merge:null,deployment:null,servedStatus:'PASS',actions:new Set(['MERGE_PR','DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW']),actor,current:true,capPatch:{},evidencePatch:null,readHook:null,ownerHook:null,authorizationHook:null,casHook:null,mergeHook:null,deployHook:null,lookupHook:null,mergeLoss:false,deployLoss:false,hiddenMerge:false,hiddenDeployment:false,merges:0,deploys:0,reads:0,ownerReads:0,authorizationReads:0};
 const records=new Map(),store=providedStore||{async load(id){return structuredClone(records.get(id)||null);},async compareAndSwap(id,expected,next){if(state.casHook)await state.casHook(next);const current=records.get(id);if((current?.revision||0)!==expected)return false;records.set(id,structuredClone(next));return true;}};
 const transport={qualification:'ISOLATED_FINALIZATION_FIXTURE',networkAccess:'NONE',
  async capabilities(){return {qualification:'ISOLATED_FIXTURE_PROVIDER_CAPABILITIES',intentDigest,expiresAt:state.clock+60000,conditionalMergeRefs:true,previewDeploy:true,completeOperationLookup:true,requiredChecksVerified:true,...state.capPatch};},
  async evidence(){
   state.reads++;if(state.readHook)await state.readHook();const t=state.task,binding=await createTaskRequirements(t);
   const request={schemaVersion:RECONCILIATION_VERSION,projectId:t.projectId,track:t.track,taskId:t.taskId,taskRevision:t.revision,taskRequirements:binding,runId:review.runId};
   const ci={schemaVersion:RECONCILIATION_VERSION,request,binding:{repositoryId:source.repositoryId,canonicalRef:source.entry.ref,canonicalHeadSha:state.canonicalHead,workRef:review.workRef,workHeadSha:state.workHead,codeSha:FB,reportHeadSha:state.reportHead,reportBlobId:state.blob,reportSequence:2,taskRequirements:requirements,taskRevisionQualification:binding.requestDigest===requirements.requestDigest&&binding.revision===requirements.revision?'EXACT_TASK_REQUIREMENTS_MATCH':'HISTORICAL_TASK_REQUIREMENTS_MISMATCH',workHeadQualification:state.workHead===FB?'EXACT_REPORTED_COMMIT':'WORK_HEAD_DIFFERS_FROM_REPORTED_COMMIT'},channels:{pullRequests:{state:'OBSERVED',items:[{number:7,state:state.merge?'closed':'open',draft:false,merged:Boolean(state.merge),headSha:FB,exactHead:true,canonicalBase:true,reportedWorkRef:true}],minimumReadPermission:'Pull requests'},checks:{state:'OBSERVED',items:[{id:8,label:'unit',status:'completed',conclusion:'success'}],minimumReadPermission:'Checks'},statuses:{state:'OBSERVED',items:[{id:'preview',label:'preview',status:'success',conclusion:null}],minimumReadPermission:'Commit statuses'},actions:{state:'OBSERVED',items:[{id:9,label:'CI',status:'completed',conclusion:'success'}],minimumReadPermission:'Actions'}},readAt:new Date(state.clock).toISOString(),expiresAt:state.clock+60000,qualification:'INDEPENDENT_GITHUB_METADATA_READ',privateReadOnly:true,executionAuthorized:false,productAccepted:false};
   const evidence={qualification:'ISOLATED_FIXTURE_CURRENT_EVIDENCE',task:t,cloudConfirmed:true,reviewRecord:state.record,reviewSequence:state.record.sequence,reconciliation:ci,reportContent:state.reportContent,reportBlobId:state.blob,mergeable:true};if(state.evidencePatch)state.evidencePatch(evidence);return structuredClone(evidence);
  },
  async findMerge(){if(state.lookupHook)await state.lookupHook('merge');return state.hiddenMerge?null:structuredClone(state.merge);},
  async merge({expectedHeadSha,expectedBaseSha,operationId}){
   if(state.mergeHook)await state.mergeHook();if(expectedHeadSha!==state.workHead||expectedBaseSha!==state.canonicalHead||operationId!==intent.operationId)throw Error('Fixture conditional ref conflict');
   state.merges++;state.canonicalHead=FM;state.merge={qualification:'ISOLATED_FIXTURE_MERGE_OBSERVATION',pullRequestNumber:7,headSha:FB,baseBeforeSha:FA,mergeSha:FM,parents:[FA,FB],canonicalHeadSha:FM};
   if(state.mergeLoss){state.mergeLoss=false;throw Error('PRIVATE_PROVIDER_DIAGNOSTIC_NOT_RETURNED');}return structuredClone(state.merge);
  },
  async findDeployment(){if(state.lookupHook)await state.lookupHook('deployment');return state.hiddenDeployment?null:structuredClone(state.deployment);},
  async deployPreview({codeSha,target,operationId}){
   if(state.deployHook)await state.deployHook();if(codeSha!==FM||JSON.stringify(target)!==JSON.stringify(configuration.deployment)||operationId!==intent.operationId)throw Error('Fixture target conflict');
   state.deploys++;state.deployment={qualification:'ISOLATED_FIXTURE_DEPLOYMENT_OBSERVATION',id:'dpl_fixture',operationId,target,codeSha,state:'BUILDING'};
   if(state.deployLoss){state.deployLoss=false;throw Error('PRIVATE_PROVIDER_DIAGNOSTIC_NOT_RETURNED');}return structuredClone(state.deployment);
  },
  async verifyServed(){return {qualification:'ISOLATED_FIXTURE_SERVED_OBSERVATION',status:state.servedStatus,deploymentId:'dpl_fixture',codeSha:state.servedStatus==='PASS'?FM:null,url:configuration.deployment.fixedUrl};}
 };
 const provider=createFinalizationProviderAdapter({configuration,fixtureTransport:transport}),options={configuration,provider,store,inspectOwner:async()=>{state.ownerReads++;if(state.ownerHook)await state.ownerHook();return structuredClone(state.actor);},readAuthorization:async({intentDigest:expected,action})=>{state.authorizationReads++;if(state.authorizationHook)await state.authorizationHook(action);if(!state.actions.has(action))return null;return {schemaVersion:1,qualification:'ISOLATED_FIXTURE_ACTION_AUTHORIZATION',authorizationId:'33333333-3333-4333-8333-333333333333',subject:ownerSubject,intentDigest:expected,actions:[...state.actions],issuedAt:state.clock,expiresAt:state.clock+60000};},stillCurrent:()=>state.current,now:()=>state.clock};
 return {configuration,intent,intentDigest,state,store,records,transport,provider,options,engine:createTaskFinalizationWorkflow(options),restart:()=>createTaskFinalizationWorkflow(options),revise(){state.task=reviseDevelopmentTask(state.task,{...state.task.request,acceptance:'New exact Owner revision'},{now:state.clock+1});}};
}
