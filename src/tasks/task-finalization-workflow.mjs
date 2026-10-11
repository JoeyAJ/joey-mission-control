// Recoverable one-effect-per-call fixture engine; not wired to any deployed endpoint.
import {validateFinalizationConfiguration,validateFinalizationIntent,finalizationIntentDigest,validateFixtureExecutionGrant,validateFixtureCapabilities,validateFinalizationEvidence,emptyFinalizationCheckpoint,validateFinalizationCheckpoint,finalizationFailure,finalizationSame} from './task-finalization-contract.mjs';

const publicState=(state,checkpoint=null)=>({state,qualification:'ISOLATED_FIXTURE_WORKFLOW_NOT_LIVE_ACCEPTANCE',executionAuthorized:false,productAccepted:false,receipt:checkpoint?structuredClone(checkpoint):null});
const visibleFailures=new Set(['MISSING_EXECUTION_AUTHORIZATION','EXECUTION_AUTHORIZATION_INVALID','PROVIDER_CAPABILITY_UNCONFIRMED','CURRENT_CLOUD_TASK_REQUIRED','TASK_REVISION_CHANGED','OWNER_REVIEW_CHANGED','OWNER_ACCEPTANCE_REQUIRED','REVIEWED_TUPLE_CHANGED','COMPLETED_REPORT_CHANGED','AGENT_TESTS_NOT_PASS','EXACT_PR_UNCONFIRMED','MERGEABILITY_UNCONFIRMED','REQUIRED_CI_NOT_PASS','MERGE_OBSERVATION_CONFLICT','DEPLOYMENT_OBSERVATION_CONFLICT','SERVED_VERIFICATION_CONFLICT','CHECKPOINT_CONFLICT','CHECKPOINT_CAS_CONFLICT','OWNER_DENIED','FINALIZATION_INVALIDATED','PROVIDER_OUTCOME_UNCONFIRMED']);
export function createTaskFinalizationWorkflow({configuration,provider,store,inspectOwner,readAuthorization,stillCurrent,now=Date.now}={}){
 const c=validateFinalizationConfiguration(configuration);let busy=false;
 async function owner(){if(typeof stillCurrent!=='function'||stillCurrent()!==true)throw finalizationFailure('FINALIZATION_INVALIDATED');const a=await inspectOwner();if(stillCurrent()!==true)throw finalizationFailure('FINALIZATION_INVALIDATED');if(a?.subject!==c.ownerSubject||a.status!=='authenticated'||a.role!=='OWNER'||a.aal!=='aal2'||a.verified!==true||a.memberActive!==true||a.sessionActive!==true||!a.projects?.includes('NEXAEON')||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=now())throw finalizationFailure('OWNER_DENIED');return a;}
 async function guarded(work){const before=await owner(),value=await work(),after=await owner();if(before.subject!==after.subject)throw finalizationFailure('OWNER_DENIED');return value;}
 return {async advance(input){
  if(provider?.fixtureOnly!==true)return publicState('LIVE_EXECUTION_DISABLED');
  if(busy)return publicState('WORKFLOW_BUSY');busy=true;let checkpoint=null;
  try{
   // Capture the supplied reviewed tuple synchronously before the first identity await.
   const captured=validateFinalizationIntent(input,c);captured.catch(()=>{});
   await owner();const intent=await guarded(()=>captured),intentDigest=await guarded(()=>finalizationIntentDigest(intent));
   const loaded=await guarded(()=>store.load(intent.operationId));checkpoint=loaded?validateFinalizationCheckpoint(loaded,intent,intentDigest):emptyFinalizationCheckpoint(intent,intentDigest);
   const save=async patch=>{const next=validateFinalizationCheckpoint({...checkpoint,...patch,revision:checkpoint.revision+1},intent,intentDigest),ok=await guarded(()=>store.compareAndSwap(intent.operationId,checkpoint.revision,next));if(ok!==true)throw finalizationFailure('CHECKPOINT_CAS_CONFLICT');checkpoint=next;};
   const preflight=async merge=>{const caps=await guarded(()=>provider.capabilities(intent,intentDigest));validateFixtureCapabilities(caps,{intentDigest,now:now()});const evidence=await guarded(()=>provider.evidence(intent)),valid=await guarded(()=>validateFinalizationEvidence(evidence,intent,c,merge,now()));validateFixtureCapabilities(caps,{intentDigest,now:now()});if(valid.expiresAt<=now())throw finalizationFailure('REVIEWED_TUPLE_CHANGED');return true;};
   const authorize=async action=>{const grant=await guarded(()=>readAuthorization({intentDigest,action}));validateFixtureExecutionGrant(grant,{intentDigest,action,ownerSubject:c.ownerSubject,now:now()});return grant;};

   // Recovery always reads provider facts. A durable attempted marker is never success.
   const merge=await guarded(()=>provider.mergeObservation(intent));
   await preflight(merge);
   if(checkpoint.merge&&!merge||checkpoint.merge&&merge&&!finalizationSame(checkpoint.merge,merge))throw finalizationFailure('MERGE_OBSERVATION_CONFLICT');
   if(!merge){
    if(checkpoint.mergeAttempted)return publicState('MERGE_OUTCOME_UNCONFIRMED',checkpoint);
    await authorize('MERGE_PR');await preflight(null);await save({mergeAttempted:true});
    await authorize('MERGE_PR');
    await preflight(null);await guarded(()=>provider.merge(intent));
    const observed=await guarded(()=>provider.mergeObservation(intent));if(!observed)return publicState('MERGE_OUTCOME_UNCONFIRMED',checkpoint);
    await preflight(observed);await save({merge:observed});return publicState('MERGED_DEPLOYMENT_PENDING',checkpoint);
   }
   if(!checkpoint.mergeAttempted)return publicState('UNRELATED_MERGE_REQUIRES_NEW_AUTHORIZATION');
   if(!checkpoint.merge)await save({merge});
   const deployment=await guarded(()=>provider.deploymentObservation(intent,merge));
   if(checkpoint.deployment&&!deployment)throw finalizationFailure('DEPLOYMENT_OBSERVATION_CONFLICT');
   if(checkpoint.deployment&&deployment&&(checkpoint.deployment.id!==deployment.id||checkpoint.deployment.codeSha!==deployment.codeSha))throw finalizationFailure('DEPLOYMENT_OBSERVATION_CONFLICT');
   if(!deployment){
    if(checkpoint.deployAttempted)return publicState('DEPLOYMENT_OUTCOME_UNCONFIRMED',checkpoint);
    await authorize('DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW');await preflight(merge);await save({deployAttempted:true});
    await authorize('DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW');
    await preflight(merge);await guarded(()=>provider.deploy(intent,merge));
    const observed=await guarded(()=>provider.deploymentObservation(intent,merge));if(!observed)return publicState('DEPLOYMENT_OUTCOME_UNCONFIRMED',checkpoint);
    await preflight(merge);await save({deployment:observed});return publicState(observed.state==='ERROR'?'DEPLOYMENT_FAILED':'DEPLOYMENT_PENDING',checkpoint);
   }
   if(!checkpoint.deployAttempted)return publicState('UNRELATED_DEPLOYMENT_REQUIRES_NEW_AUTHORIZATION');
   if(!finalizationSame(checkpoint.deployment,deployment))await save({deployment,verification:null});
   if(deployment.state==='ERROR')return publicState('DEPLOYMENT_FAILED',checkpoint);
   if(deployment.state!=='READY')return publicState('DEPLOYMENT_PENDING',checkpoint);
   const verification=await guarded(()=>provider.verify(intent,deployment));await preflight(merge);if(!finalizationSame(checkpoint.verification,verification))await save({verification});
   return publicState(verification.status==='PASS'?'FIXTURE_FINALIZATION_VERIFIED':verification.status==='FAIL'?'SERVED_VERIFICATION_FAILED':'SERVED_VERIFICATION_BLOCKED',checkpoint);
  }catch(e){return publicState(visibleFailures.has(e.code)?e.code:'FINALIZATION_UNAVAILABLE');}
  finally{busy=false;}
 }};
}
