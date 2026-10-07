// Approved public client identifier only. Never identity or private data authority.
export const ownerAuthConfig=Object.freeze({
 origin:'https://scmvedfqwlhkyvljymjj.supabase.co',
 publishableKey:'sb_publishable_K4V5zIiJQasjbKPtmsV6XA_oDtcCbrS',
 stageOrigin:'https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app',
 ownerSubject:'6f0ca2ae-83e0-4684-af12-0b37d08182db',authSetupVerified:true,sessionBridgeVerified:true,privateReadSetupVerified:true,coordinatorReadSetupVerified:true,ownerDecisionSetupVerified:false
});
export function ownerAuthSetupStatus(config=ownerAuthConfig){
 if(config!==ownerAuthConfig)return Object.freeze({status:'unconfigured',reason:'UNTRUSTED_CONFIGURATION'});
 const ownerIdentityEntryAvailable=config.authSetupVerified===true&&config.sessionBridgeVerified===true&&!!config.ownerSubject&&globalThis.location?.origin===config.stageOrigin;
 return Object.freeze({status:'unconfigured',reason:'PRIVATE_WORKFLOW_NOT_ACTIVATED',ownerIdentityEntryAvailable,closedAuthVerified:true,publicClientConfigured:true,authenticated:false,runtimeConnected:false,executionAuthorized:false});
}
