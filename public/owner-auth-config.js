// Approved public client identifier only. Never identity or private data authority.
export const ownerAuthConfig=Object.freeze({
 origin:'https://scmvedfqwlhkyvljymjj.supabase.co',
 publishableKey:'sb_publishable_K4V5zIiJQasjbKPtmsV6XA_oDtcCbrS',
 stageOrigin:'https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app',
 ownerSubject:null,authSetupVerified:false,sessionBridgeVerified:false
});
export function ownerAuthSetupStatus(config=ownerAuthConfig){
 if(config!==ownerAuthConfig)return Object.freeze({status:'unconfigured',reason:'UNTRUSTED_CONFIGURATION'});
 return Object.freeze({status:'unconfigured',reason:'OWNER_IDENTITY_AND_AUTH_SETUP_PENDING',publicClientConfigured:true,authenticated:false,runtimeConnected:false,executionAuthorized:false});
}
