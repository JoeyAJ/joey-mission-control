// Fixture transport boundary only. No credentials, fetch, routes or live writer.
import {finalizationFailure,finalizationSame,validateFinalizationConfiguration,validateFinalizationIntent,finalizationIntentDigest,validateFixtureExecutionGrant,validateFixtureMerge,validateFixtureDeployment,validateFixtureVerification} from './task-finalization-contract.mjs';
const knownNotStarted=new WeakSet();
export const isKnownFinalizationEffectNotStarted=error=>knownNotStarted.has(error);
export function createFinalizationProviderAdapter({configuration,fixtureTransport=null,now=Date.now}={}){
 const c=validateFinalizationConfiguration(configuration),fixtureOnly=fixtureTransport?.qualification==='ISOLATED_FINALIZATION_FIXTURE'&&fixtureTransport?.networkAccess==='NONE';
 const requireFixture=()=>{if(!fixtureOnly)throw finalizationFailure('LIVE_EXECUTION_DISABLED');};
 const invoke=async(method,args)=>{requireFixture();if(typeof fixtureTransport[method]!=='function')throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');try{return await fixtureTransport[method](structuredClone(args));}catch{throw finalizationFailure('PROVIDER_OUTCOME_UNCONFIRMED');}};
 const prepare=async value=>{requireFixture();const intent=await validateFinalizationIntent(value,c),intentDigest=await finalizationIntentDigest(intent);return {intent,intentDigest};};
 async function ownMerge(value,intent,intentDigest){
  const merge=validateFixtureMerge(value,intent,intentDigest),own=await invoke('findOwnMerge',{operationId:intent.operationId,intentDigest});
  if(!own||!finalizationSame(merge,own))throw finalizationFailure('UNATTRIBUTED_MERGE_REQUIRES_EXPLICIT_ADOPTION');return merge;
 }
 async function effect(method,args,grant,intentDigest,action){
  requireFixture();const expected=structuredClone(args),offered=structuredClone(grant);let committed=false,boundaryCalled=false,gateFailure=null;
  if(typeof fixtureTransport[method]!=='function'||typeof fixtureTransport.authorizationAtEffect!=='function')throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');
  // Transport awaits finish first; all mutation happens in this synchronous callback.
  const commitEffect=(actual,commit)=>{
   try{
    if(boundaryCalled||typeof commit!=='function'||commit.constructor?.name==='AsyncFunction')throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');
    boundaryCalled=true;
    if(!finalizationSame(actual,expected))throw finalizationFailure('EXECUTION_AUTHORIZATION_INVALID');
    const authority=fixtureTransport.authorizationAtEffect({authorizationId:offered?.authorizationId,intentDigest,action});
    if(authority?.then)throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');
    const binding={intentDigest,action,ownerSubject:c.ownerSubject,now:now()};
    validateFixtureExecutionGrant(offered,binding);validateFixtureExecutionGrant(authority,binding);
    if(!finalizationSame(offered,authority))throw finalizationFailure('EXECUTION_AUTHORIZATION_INVALID');
   }catch(error){gateFailure=error;throw error;}
   committed=true;const result=commit();if(result?.then)throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');return result;
  };
  try{const result=await fixtureTransport[method](structuredClone(expected),commitEffect);if(!committed)throw finalizationFailure('PROVIDER_CAPABILITY_UNCONFIRMED');return result;}
  catch{if(gateFailure&&!committed){knownNotStarted.add(gateFailure);throw gateFailure;}throw finalizationFailure('PROVIDER_OUTCOME_UNCONFIRMED');}
 }
 return Object.freeze({fixtureOnly,
  capabilities:(intent,intentDigest)=>invoke('capabilities',{intent,intentDigest}),evidence:intent=>invoke('evidence',{intent}),
  async mergeObservation(value){const {intent,intentDigest}=await prepare(value),v=await invoke('findMerge',{intent});return v===null?null:ownMerge(v,intent,intentDigest);},
  async merge(value,grant){const offered=structuredClone(grant),{intent,intentDigest}=await prepare(value),args={intent,intentDigest,expectedHeadSha:intent.reviewRecord.review.codeSha,expectedBaseSha:intent.reviewRecord.review.canonicalHeadSha,operationId:intent.operationId};return ownMerge(await effect('merge',args,offered,intentDigest,'MERGE_PR'),intent,intentDigest);},
  async deploymentObservation(value,merge){const {intent}=await prepare(value);const v=await invoke('findDeployment',{intent,merge});return v===null?null:validateFixtureDeployment(v,intent,merge);},
  async deploy(value,merge,grant){const offered=structuredClone(grant),{intent,intentDigest}=await prepare(value);await ownMerge(merge,intent,intentDigest);const args={intent,intentDigest,merge,operationId:intent.operationId,codeSha:merge.mergeSha,target:c.deployment};return validateFixtureDeployment(await effect('deployPreview',args,offered,intentDigest,'DEPLOY_VERIFIED_MERGE_RESULT_PREVIEW'),intent,merge);},
  async verify(value,deployment){const {intent}=await prepare(value);return validateFixtureVerification(await invoke('verifyServed',{intent,deployment}),intent,deployment);}
 });
}
export function createDeploymentTaskFinalization(){
 const unavailable=()=>({state:'LIVE_EXECUTION_DISABLED',missing:['EXACT_ACTION_AUTHORIZATION','VERIFIED_PROVIDER_CAPABILITIES','PRIVATE_DURABLE_CHECKPOINT_STORE'],executionAuthorized:false,productAccepted:false,receipt:null});
 return Object.freeze({preflight:async()=>unavailable(),advance:async()=>unavailable()});
}
