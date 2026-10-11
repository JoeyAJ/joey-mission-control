// Internal fixture workflow bindings. These declarations grant no live authority.
import {canonicalTaskJson,validateDevelopmentTask} from './development-task.mjs';
import {createTaskRequirements,taskRequirementsStatus} from './task-requirements.mjs';
import {validateTaskReviewRecord,sameTaskReviewBinding,validReviewOperationId,exactReviewKeys} from './task-review-contract.mjs';
import {validateReconciliationReply,RECONCILIATION_VERSION} from './task-reconciliation-contract.mjs';
import {parseRepositoryRun,MAX_REPORT_BYTES} from '../reporting/repository-run-contract.mjs';
import {browserContextDigest} from '../continuity/browser-context-digest.mjs';
import {deliveryPolicy} from '../reporting/delivery-evidence.mjs';
import {mcRemoteHandoffConfiguration} from '../canonical/remote-handoff-adapter.mjs';

export const FINALIZATION_VERSION='mc.task-finalization.v1';
export const FINALIZATION_ACTIONS=Object.freeze(['MERGE_PR','DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW']);
export const finalizationFailure=code=>Object.assign(Error(code),{code});
export const finalizationSame=(a,b)=>canonicalTaskJson(a)===canonicalTaskJson(b);
const exact=(v,keys)=>{try{exactReviewKeys(v,keys);}catch{throw finalizationFailure('FINALIZATION_INVALID');}};
export const finalizationSha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);

export function validateFinalizationConfiguration(c){
 exact(c,['projectId','track','repositoryId','canonicalRef','ownerSubject','deployment','requiredChecks']);
 const policy=deliveryPolicy(c);
 // One useful supported target. Production/other projects require another reviewed scope.
 if(c.projectId!=='MISSION_CONTROL'||c.track!=='BASELINE'||!policy||c.repositoryId!==mcRemoteHandoffConfiguration.repositoryId||c.canonicalRef!==mcRemoteHandoffConfiguration.ref||typeof c.ownerSubject!=='string'||!c.ownerSubject||!Array.isArray(c.requiredChecks)||!c.requiredChecks.length||c.requiredChecks.length>20)throw finalizationFailure('FINALIZATION_SCOPE_DENIED');
 exact(c.deployment,['provider','project','projectId','teamId','repositoryId','environment','fixedUrl']);
 if(c.deployment.provider!=='vercel'||c.deployment.project!==policy.target.project||c.deployment.environment!=='preview'||c.deployment.fixedUrl!==policy.url||!identifier(c.deployment.projectId)||!identifier(c.deployment.teamId)||!Number.isSafeInteger(c.deployment.repositoryId)||c.deployment.repositoryId<1)throw finalizationFailure('FINALIZATION_TARGET_DENIED');
 for(const check of c.requiredChecks){exact(check,['channel','label']);if(!['checks','statuses','actions'].includes(check.channel)||typeof check.label!=='string'||!/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,99}$/.test(check.label))throw finalizationFailure('FINALIZATION_INVALID');}
 if(new Set(c.requiredChecks.map(x=>x.channel+':'+x.label)).size!==c.requiredChecks.length)throw finalizationFailure('FINALIZATION_INVALID');
 return structuredClone(c);
}
export async function validateFinalizationIntent(value,c){
 exact(value,['schemaVersion','operationId','reviewRecord','pullRequestNumber','mergeMethod','deployment']);
 exact(value.deployment,Object.keys(c.deployment));
 const record=validateTaskReviewRecord(value.reviewRecord),r=record.review;
 if(value.schemaVersion!==FINALIZATION_VERSION||!validReviewOperationId(value.operationId)||!Number.isSafeInteger(value.pullRequestNumber)||value.pullRequestNumber<1||value.mergeMethod!=='merge'||r.projectId!==c.projectId||r.track!==c.track||r.repositoryId!==c.repositoryId||r.canonicalRef!==c.canonicalRef||r.workRef===r.canonicalRef||!finalizationSame(value.deployment,c.deployment))throw finalizationFailure('FINALIZATION_INTENT_CONFLICT');
 const captured={...value,reviewRecord:record,deployment:structuredClone(value.deployment)};
 if(record.decisionDigest!==await browserContextDigest(r))throw finalizationFailure('FINALIZATION_REVIEW_DIGEST_CONFLICT');
 return captured;
}
export async function finalizationIntentDigest(intent){return browserContextDigest(intent);}
export function validateFixtureExecutionGrant(g,{intentDigest,action,ownerSubject,now}){
 if(!g)throw finalizationFailure('MISSING_EXECUTION_AUTHORIZATION');
 exact(g,['schemaVersion','qualification','authorizationId','subject','intentDigest','actions','issuedAt','expiresAt']);
 if(g.schemaVersion!==1||g.qualification!=='ISOLATED_FIXTURE_ACTION_AUTHORIZATION'||!validReviewOperationId(g.authorizationId)||g.subject!==ownerSubject||g.intentDigest!==intentDigest||!Array.isArray(g.actions)||!g.actions.length||g.actions.some(x=>!FINALIZATION_ACTIONS.includes(x))||new Set(g.actions).size!==g.actions.length||!g.actions.includes(action)||!Number.isSafeInteger(g.issuedAt)||!Number.isSafeInteger(g.expiresAt)||g.issuedAt>now||g.expiresAt<=now||g.expiresAt-g.issuedAt>60000)throw finalizationFailure('EXECUTION_AUTHORIZATION_INVALID');
 return structuredClone(g);
}
export function validateFixtureCapabilities(v,{intentDigest,now}){
 exact(v,['qualification','intentDigest','expiresAt','conditionalMergeRefs','previewDeploy','completeOperationLookup','requiredChecksVerified']);
 if(v.qualification!=='ISOLATED_FIXTURE_PROVIDER_CAPABILITIES'||v.intentDigest!==intentDigest||!Number.isSafeInteger(v.expiresAt)||v.expiresAt<=now||v.expiresAt>now+60000||['conditionalMergeRefs','previewDeploy','completeOperationLookup','requiredChecksVerified'].some(k=>v[k]!==true))throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');
 return structuredClone(v);
}
export function validateFixtureMerge(v,intent){
 exact(v,['qualification','pullRequestNumber','headSha','baseBeforeSha','mergeSha','parents','canonicalHeadSha']);
 const r=intent.reviewRecord.review;
 if(v.qualification!=='ISOLATED_FIXTURE_MERGE_OBSERVATION'||v.pullRequestNumber!==intent.pullRequestNumber||v.headSha!==r.codeSha||v.baseBeforeSha!==r.canonicalHeadSha||!finalizationSha(v.mergeSha)||v.canonicalHeadSha!==v.mergeSha||!finalizationSame(v.parents,[r.canonicalHeadSha,r.codeSha]))throw finalizationFailure('MERGE_OBSERVATION_CONFLICT');
 return structuredClone(v);
}
export function validateFixtureDeployment(v,intent,merge){
 exact(v,['qualification','id','operationId','target','codeSha','state']);
 if(v.qualification!=='ISOLATED_FIXTURE_DEPLOYMENT_OBSERVATION'||!identifier(v.id)||v.operationId!==intent.operationId||!finalizationSame(v.target,intent.deployment)||v.codeSha!==merge.mergeSha||!['QUEUED','BUILDING','READY','ERROR'].includes(v.state))throw finalizationFailure('DEPLOYMENT_OBSERVATION_CONFLICT');
 return structuredClone(v);
}
export function validateFixtureVerification(v,intent,deployment){
 exact(v,['qualification','status','deploymentId','codeSha','url']);
 if(v.qualification!=='ISOLATED_FIXTURE_SERVED_OBSERVATION'||!['PASS','FAIL','BLOCKED'].includes(v.status)||v.deploymentId!==deployment.id||v.url!==intent.deployment.fixedUrl||v.status==='PASS'&&v.codeSha!==deployment.codeSha||v.status!=='PASS'&&v.codeSha!==null)throw finalizationFailure('SERVED_VERIFICATION_CONFLICT');
 return structuredClone(v);
}
export async function validateFinalizationEvidence(v,intent,c,merge,now){
 exact(v,['qualification','task','cloudConfirmed','reviewRecord','reviewSequence','reconciliation','reportContent','reportBlobId','mergeable']);
 if(v.qualification!=='ISOLATED_FIXTURE_CURRENT_EVIDENCE'||v.cloudConfirmed!==true)throw finalizationFailure('CURRENT_CLOUD_TASK_REQUIRED');
 const t=validateDevelopmentTask(v.task),expected=intent.reviewRecord.review,requirements=await createTaskRequirements(t),record=validateTaskReviewRecord(v.reviewRecord);
 if(t.taskId!==expected.taskId||t.projectId!==expected.projectId||t.track!==expected.track||taskRequirementsStatus(expected.taskRequirements,requirements)!=='MATCH')throw finalizationFailure('TASK_REVISION_CHANGED');
 if(record.decisionDigest!==await browserContextDigest(record.review)||v.reviewSequence!==record.sequence||!finalizationSame(record,intent.reviewRecord))throw finalizationFailure('OWNER_REVIEW_CHANGED');
 if(record.review.decision!=='APPROVE')throw finalizationFailure('OWNER_ACCEPTANCE_REQUIRED');
 const request={schemaVersion:RECONCILIATION_VERSION,projectId:t.projectId,track:t.track,taskId:t.taskId,taskRevision:t.revision,taskRequirements:requirements,runId:expected.runId},ci=validateReconciliationReply(v.reconciliation,request,now),b=ci.binding;
 const current={...expected,taskRequirements:requirements,canonicalHeadSha:b.canonicalHeadSha,workRef:b.workRef,codeSha:b.codeSha,reportHeadSha:b.reportHeadSha,reportBlobId:b.reportBlobId,reportSequence:b.reportSequence};
 if(!sameTaskReviewBinding(current,{...expected,canonicalHeadSha:merge?merge.mergeSha:expected.canonicalHeadSha})||b.repositoryId!==expected.repositoryId||b.canonicalRef!==expected.canonicalRef||b.workHeadSha!==expected.codeSha||b.workHeadQualification!=='EXACT_REPORTED_COMMIT'||b.taskRevisionQualification!=='EXACT_TASK_REQUIREMENTS_MATCH')throw finalizationFailure('REVIEWED_TUPLE_CHANGED');
 if(typeof v.reportContent!=='string'||new TextEncoder().encode(v.reportContent).length>MAX_REPORT_BYTES)throw finalizationFailure('COMPLETED_REPORT_CHANGED');
 const raw=new TextEncoder().encode(v.reportContent),header=new TextEncoder().encode('blob '+raw.length+'\0'),bytes=new Uint8Array(header.length+raw.length);bytes.set(header);bytes.set(raw,header.length);
 const blob=[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const report=parseRepositoryRun(v.reportContent,{now}),last=report.events.at(-1);
 if(report.projectId!==expected.projectId||report.track!==expected.track||report.repositoryId!==expected.repositoryId||report.baseline.ref!==expected.canonicalRef||report.taskId!==expected.taskId||report.runId!==expected.runId||report.workRef!==expected.workRef||report.reportRef!==expected.reportRef||last.kind!=='completed'||last.sequence!==expected.reportSequence||last.result?.codeSha!==expected.codeSha||taskRequirementsStatus(report.taskRequirements,requirements)!=='MATCH'||v.reportBlobId!==expected.reportBlobId||blob!==expected.reportBlobId)throw finalizationFailure('COMPLETED_REPORT_CHANGED');
 if(!last.result.tests.length||last.result.tests.some(x=>x.outcome!=='PASS'))throw finalizationFailure('AGENT_TESTS_NOT_PASS');
 const matches=ci.channels.pullRequests.items.filter(x=>x.number===intent.pullRequestNumber);
 if(ci.channels.pullRequests.state!=='OBSERVED'||matches.length!==1)throw finalizationFailure('EXACT_PR_UNCONFIRMED');
 const pr=matches[0];
 if(!pr.exactHead||!pr.canonicalBase||!pr.reportedWorkRef||pr.headSha!==expected.codeSha||pr.draft||(merge?(!pr.merged||pr.state!=='closed'):(pr.merged||pr.state!=='open')))throw finalizationFailure('EXACT_PR_UNCONFIRMED');
 if(!merge&&v.mergeable!==true)throw finalizationFailure('MERGEABILITY_UNCONFIRMED');
 for(const required of c.requiredChecks){const channel=ci.channels[required.channel],rows=channel.items.filter(x=>x.label===required.label);if(channel.state!=='OBSERVED'||rows.length!==1||(required.channel==='statuses'?rows[0]?.status!=='success':rows[0]?.status!=='completed'||rows[0]?.conclusion!=='success'))throw finalizationFailure('REQUIRED_CI_NOT_PASS');}
 return {ownerAccepted:true,currentRequirements:requirements,expiresAt:ci.expiresAt};
}
export function emptyFinalizationCheckpoint(intent,intentDigest){return {schemaVersion:FINALIZATION_VERSION,operationId:intent.operationId,intentDigest,revision:0,mergeAttempted:false,deployAttempted:false,merge:null,deployment:null,verification:null};}
export function validateFinalizationCheckpoint(v,intent,intentDigest){
 exact(v,['schemaVersion','operationId','intentDigest','revision','mergeAttempted','deployAttempted','merge','deployment','verification']);
 if(v.schemaVersion!==FINALIZATION_VERSION||v.operationId!==intent.operationId||v.intentDigest!==intentDigest||!digest(v.intentDigest)||!Number.isSafeInteger(v.revision)||v.revision<0||v.revision>64||typeof v.mergeAttempted!=='boolean'||typeof v.deployAttempted!=='boolean'||v.deployAttempted&&!v.mergeAttempted||v.merge&&!v.mergeAttempted||v.deployment&&(!v.deployAttempted||!v.merge)||v.verification&&!v.deployment)throw finalizationFailure('CHECKPOINT_CONFLICT');
 if(v.merge)validateFixtureMerge(v.merge,intent);if(v.deployment)validateFixtureDeployment(v.deployment,intent,v.merge);if(v.verification)validateFixtureVerification(v.verification,intent,v.deployment);
 return structuredClone(v);
}
