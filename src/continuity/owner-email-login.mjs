// Default-template Magic Link only. No signup/password/MFA/security mutation or automatic email.
export const ownerEmailLoginPath='/owner-email-login.html';
const safe=status=>Object.freeze({status,privateAccessEnabled:false,executionAuthorized:false});
const fail=code=>Error(code),uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function emailLoginPolicyValid(policy,owner){try{return !!policy&&!!owner&&!Object.values(Object.getOwnPropertyDescriptors(policy)).some(d=>d.get||d.set)&&!Object.values(Object.getOwnPropertyDescriptors(owner)).some(d=>d.get||d.set)&&policy.callbackAllowlistVerified===true&&owner.authSetupVerified===true&&owner.sessionBridgeVerified===true&&uuid.test(owner.ownerSubject||'')&&/^sb_publishable_/.test(owner.publishableKey||'')&&new URL(owner.stageOrigin).protocol==='https:'&&new URL(owner.stageOrigin).origin===owner.stageOrigin&&new URL(owner.origin).protocol==='https:'&&new URL(owner.origin).origin===owner.origin;}catch{return false;}}
export function captureOwnerEmailLogin({location=globalThis.location,history=globalThis.history}={}){
 const fragment=location?.hash||'',query=location?.search||'';let scrubbed=false;
 try{history.replaceState(null,'',location.origin+location.pathname);scrubbed=true;}catch{}
 if(!scrubbed)return {status:'URL_SCRUB_FAILED',credentials:null};
 if(location?.pathname!==ownerEmailLoginPath||!fragment)return {status:'LINK_REQUIRED',credentials:null};
 const params=new URLSearchParams(fragment.slice(1)),allowed=new Set(['access_token','refresh_token','expires_in','expires_at','token_type','type']);
 if(query||[...params.keys()].some(k=>!allowed.has(k)||params.getAll(k).length!==1)||params.get('type')!=='magiclink'||params.get('token_type')!=='bearer')return {status:'INVALID_LINK',credentials:null};
 const access=params.get('access_token'),refresh=params.get('refresh_token'),valid=v=>typeof v==='string'&&v.length>0&&v.length<=8192&&/^[A-Za-z0-9._~-]+$/.test(v);
 return valid(access)&&valid(refresh)?{status:'CAPTURED',credentials:{access_token:access,refresh_token:refresh}}:{status:'INVALID_LINK',credentials:null};
}
export function createOwnerEmailLoginRequest({policy,owner,createClient,location=globalThis.location,now=Date.now}={}){
 const configured=emailLoginPolicyValid(policy,owner)&&policy.enabled===true&&policy.callbackDeploymentVerified===true&&policy.emailSendingApproved===true&&location?.origin===owner.stageOrigin&&typeof createClient==='function';
 if(configured){owner=Object.freeze({...owner});policy=Object.freeze({...policy});}
 let client=null,busy=false,closed=false,lastAttempt=null;
 return Object.freeze({configured,async request({email,explicit=false,stillCurrent}={}){
  if(!configured||closed)throw fail('EMAIL_LOGIN_NOT_READY');if(explicit!==true||typeof stillCurrent!=='function'||stillCurrent()!==true||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw fail('EXPLICIT_EMAIL_LOGIN_REQUIRED');
  if(busy||lastAttempt!==null&&now()-lastAttempt<60000)throw fail('EMAIL_LOGIN_RATE_LIMITED');const address=email.trim();busy=true;lastAttempt=now();
  try{client??=createClient(owner.origin,owner.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit',storageKey:'mc-owner-email-request-v1'}});if(closed||stillCurrent()!==true)throw fail('EMAIL_LOGIN_INVALIDATED');
   const result=await client.auth.signInWithOtp({email:address,options:{shouldCreateUser:false,emailRedirectTo:owner.stageOrigin+ownerEmailLoginPath}});if(closed||stillCurrent()!==true)throw fail('EMAIL_LOGIN_INVALIDATED');if(result.error||result.data?.user||result.data?.session)throw fail(result.error?.status===429?'EMAIL_LOGIN_RATE_LIMITED':'EMAIL_LOGIN_REQUEST_UNCONFIRMED');return safe('EMAIL_LINK_REQUESTED_NOT_AUTHENTICATED');
  }catch(error){throw fail(['EMAIL_LOGIN_RATE_LIMITED','EMAIL_LOGIN_INVALIDATED'].includes(error?.message)?error.message:'EMAIL_LOGIN_REQUEST_UNCONFIRMED');}finally{busy=false;}
 },dispose(){closed=true;client?.auth.stopAutoRefresh();}});
}
export function createOwnerEmailLoginCallback({policy,owner,createClient,location=globalThis.location,history=globalThis.history,now=Date.now,storage,sessionLock}={}){
 // Capture/scrub before constructing any SDK client or making any network request.
 const captured=captureOwnerEmailLogin({location,history});let credentials=captured.credentials,closed=false,busy=false,status=captured.status,isolated=null,checked=null;
 const configured=emailLoginPolicyValid(policy,owner)&&policy.enabled===true&&policy.callbackDeploymentVerified===true&&location?.origin===owner.stageOrigin&&location?.pathname===ownerEmailLoginPath&&typeof createClient==='function';
 if(configured){owner=Object.freeze({...owner});policy=Object.freeze({...policy});}
 if(!configured){if(credentials){credentials.access_token='';credentials.refresh_token='';}credentials=null;status='UNCONFIGURED';}
 const current=()=>{if(closed)throw fail('EMAIL_LOGIN_INVALIDATED');};
 async function inspect(client){current();const user=await client.auth.getUser();current();if(user.error||user.data?.user?.id!==owner.ownerSubject||user.data?.user?.is_anonymous===true)throw fail('OWNER_DENIED');const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();current();if(assurance.error)throw fail('SESSION_UNCONFIRMED');const r=await client.rpc('mc_owner_session',{project:'NEXAEON'});current();const v=r.data;if(r.error||!v||v.subject!==owner.ownerSubject||v.role!=='OWNER'||v.projectId!=='NEXAEON'||v.sessionActive!==true||v.memberActive!==true||!['aal1','aal2'].includes(v.aal)||v.aal!==assurance.data?.currentLevel||!Number.isSafeInteger(v.expiresAt)||v.expiresAt<=now())throw fail('OWNER_DENIED');return v;}
 return Object.freeze({configured,view:()=>safe(closed?'CLOSED':status),async complete(){
  if(!configured||closed||busy||!credentials)return safe(status);busy=true;const tokens={...credentials};credentials.access_token='';credentials.refresh_token='';credentials=null;status='CHECKING';
  try{
   // Read the custody revision before any awaits. All callbacks serialize their one commit.
   const custody=storage||globalThis.localStorage,key='mc-owner-session-v1',before=custody.getItem(key);
   if(before!==null&&typeof before!=='string')throw fail('SESSION_UNCONFIRMED');
   const commit=sessionLock||(operation=>{const locks=globalThis.navigator?.locks;if(typeof locks?.request!=='function')throw fail('SESSION_UNCONFIRMED');return locks.request('mc-owner-email-login-commit-v1',{mode:'exclusive'},operation);});
   isolated=createClient(owner.origin,owner.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit',storageKey:'mc-owner-email-callback-isolated-v1'}});const set=await isolated.auth.setSession(tokens);current();if(set.error)throw fail('INVALID_LINK');await inspect(isolated);current();
   // The second check is quarantined too: no shared writes, broadcast or revocation on failure.
   const firstSession=set.data?.session;if(!firstSession)throw fail('SESSION_UNCONFIRMED');
   checked=createClient(owner.origin,owner.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'mc-owner-email-callback-checked-v1'}});
   const accepted=await checked.auth.setSession({access_token:firstSession.access_token,refresh_token:firstSession.refresh_token});current();if(accepted.error)throw fail('SESSION_UNCONFIRMED');const verified=await inspect(checked);current();
   const session=accepted.data?.session,validToken=v=>typeof v==='string'&&v.length>0&&v.length<=8192&&/^[A-Za-z0-9._~-]+$/.test(v);
   if(!session||!validToken(session.access_token)||!validToken(session.refresh_token)||session.user?.id!==owner.ownerSubject||session.user?.is_anonymous===true||!Number.isSafeInteger(session.expires_at)||session.expires_at*1000<=now())throw fail('SESSION_UNCONFIRMED');
   const serialized=JSON.stringify(session);if(serialized.length>65536)throw fail('SESSION_UNCONFIRMED');
   await commit(()=>{current();if(custody.getItem(key)!==before||verified.expiresAt<=now()||session.expires_at*1000<=now())throw fail('EMAIL_LOGIN_INVALIDATED');
    // One synchronous write in existing SDK format/custody; there is no post-write await or cleanup.
    custody.setItem(key,serialized);status=verified.aal==='aal2'?'OWNER_SESSION_RECHECK_REQUIRED':'EXISTING_TOTP_REQUIRED';});return safe(status);
  }catch(error){status=['OWNER_DENIED','INVALID_LINK','EMAIL_LOGIN_INVALIDATED'].includes(error?.message)?error.message:'SESSION_UNCONFIRMED';return safe(status);
  }finally{tokens.access_token='';tokens.refresh_token='';busy=false;isolated?.auth.stopAutoRefresh();checked?.auth.stopAutoRefresh();}
 },dispose(){closed=true;if(credentials){credentials.access_token='';credentials.refresh_token='';credentials=null;}isolated?.auth.stopAutoRefresh();checked?.auth.stopAutoRefresh();}});
}
