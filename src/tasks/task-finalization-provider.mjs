// Transport boundary: no credentials, fetch, API routes or live mutation composition.
import {finalizationFailure,finalizationSame,validateFinalizationConfiguration,validateFixtureMerge,validateFixtureDeployment,validateFixtureVerification} from './task-finalization-contract.mjs';
export function createFinalizationProviderAdapter({configuration,fixtureTransport=null}={}){
 const c=validateFinalizationConfiguration(configuration),fixtureOnly=fixtureTransport?.qualification==='ISOLATED_FINALIZATION_FIXTURE'&&fixtureTransport?.networkAccess==='NONE';
 const requireFixture=()=>{if(!fixtureOnly)throw finalizationFailure('LIVE_EXECUTION_DISABLED');};
 const invoke=async(method,args)=>{requireFixture();if(typeof fixtureTransport[method]!=='function')throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');try{return await fixtureTransport[method](structuredClone(args));}catch{throw finalizationFailure('PROVIDER_OUTCOME_UNCONFIRMED');}};
 const scope=intent=>{if(intent.reviewRecord.review.repositoryId!==c.repositoryId||intent.reviewRecord.review.canonicalRef!==c.canonicalRef||!finalizationSame(intent.deployment,c.deployment))throw finalizationFailure('FINALIZATION_SCOPE_DENIED');};
 return Object.freeze({fixtureOnly,
  capabilities:(intent,intentDigest)=>invoke('capabilities',{intent,intentDigest}),
  evidence:intent=>invoke('evidence',{intent}),
  async mergeObservation(intent){scope(intent);const v=await invoke('findMerge',{intent});if(v===null)return null;return validateFixtureMerge(v,intent);},
  async merge(intent){scope(intent);return validateFixtureMerge(await invoke('merge',{intent,expectedHeadSha:intent.reviewRecord.review.codeSha,expectedBaseSha:intent.reviewRecord.review.canonicalHeadSha,operationId:intent.operationId}),intent);},
  async deploymentObservation(intent,merge){scope(intent);const v=await invoke('findDeployment',{intent,merge});if(v===null)return null;return validateFixtureDeployment(v,intent,merge);},
  async deploy(intent,merge){scope(intent);return validateFixtureDeployment(await invoke('deployPreview',{intent,merge,operationId:intent.operationId,codeSha:merge.mergeSha,target:c.deployment}),intent,merge);},
  async verify(intent,deployment){scope(intent);return validateFixtureVerification(await invoke('verifyServed',{intent,deployment}),intent,deployment);}
 });
}
export function createDeploymentTaskFinalization(){
 // No environment toggle or supplied transport can activate a deployed writer.
 const unavailable=()=>({state:'LIVE_EXECUTION_DISABLED',missing:['EXACT_ACTION_AUTHORIZATION','VERIFIED_PROVIDER_CAPABILITIES','PRIVATE_DURABLE_CHECKPOINT_STORE'],executionAuthorized:false,productAccepted:false,receipt:null});
 return Object.freeze({preflight:async()=>unavailable(),advance:async()=>unavailable()});
}
