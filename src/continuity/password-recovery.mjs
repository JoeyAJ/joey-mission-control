// Separate callback adapter. No automatic email or password mutation.
// Caller supplies reviewed configuration; these client gates never replace provider auth.
export const passwordRecoveryPath='/owner-password-recovery.html';
const callbackPath=passwordRecoveryPath;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeView=(status,extra={})=>Object.freeze({status,privateAccessEnabled:false,executionAuthorized:false,...extra});
const safeErrors=new WeakSet();
const failure=code=>{const error=Error(code);safeErrors.add(error);return error;};
function policyValid(p){
 if(!p||typeof p!=='object'||Object.values(Object.getOwnPropertyDescriptors(p)).some(d=>d.get||d.set))return false;
 try{return p.recoveryEnabled===true&&p.urlConfigurationVerified===true&&new URL(p.stageOrigin).origin===p.stageOrigin&&new URL(p.stageOrigin).protocol==='https:'&&new URL(p.providerOrigin).origin===p.providerOrigin&&new URL(p.providerOrigin).protocol==='https:'&&/^sb_publishable_/.test(p.publishableKey)&&uuid.test(p.ownerSubject)&&/^[A-Za-z0-9_-]{1,80}$/.test(p.projectId);}catch{return false;}
}
const emailRequestValid=p=>p.emailSendingApproved===true&&typeof p.allowedEmail==='string'&&/^[^\s@]+@[^\s@]+$/.test(p.allowedEmail);
// Public recovery requests cannot prove email ownership before the link is used.
// Owner identity is verified separately by the callback before any password update.
export function createPasswordRecoveryRequest({policy,createClient,location=globalThis.location}={}){
 if(!policyValid(policy)||policy.emailSendingApproved!==true||location?.origin!==policy.stageOrigin||location?.pathname!==callbackPath||typeof createClient!=='function')return Object.freeze({configured:false,capabilities:Object.freeze({requestEmail:false}),dispose(){}});
 const config=Object.freeze({...policy}),auth=createClient(config.providerOrigin,config.publishableKey,{auth:{skipAutoInitialize:true,persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'mc-password-recovery-request-v1'}}).auth;
 let disposed=false,busy=false,status='link_required';
 const view=()=>safeView(disposed?'closed':status);
 return Object.freeze({configured:true,capabilities:Object.freeze({requestEmail:true}),view,
  async requestEmail({email,explicit=false}={}){
   if(disposed||busy||status!=='link_required'||explicit!==true||typeof email!=='string'||email.length>320||!/^([^\s@]+)@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw failure('EXPLICIT_RECOVERY_EMAIL_REQUIRED');
   busy=true;try{const response=await auth.resetPasswordForEmail(email.trim(),{redirectTo:config.stageOrigin+callbackPath});if(disposed)throw failure('RECOVERY_CLOSED');if(response.error){status='operation_unconfirmed';throw failure('RECOVERY_REQUEST_UNCONFIRMED');}status='request_completed';return view();}catch(error){if(!disposed)status='operation_unconfirmed';if(safeErrors.has(error))throw error;throw failure('RECOVERY_REQUEST_UNCONFIRMED');}finally{busy=false;}
  },dispose(){disposed=true;auth.stopAutoRefresh();}
 });
}
export function createPasswordRecovery({policy,createClient,verifyCurrentSession,location=globalThis.location,history=globalThis.history,now=Date.now}={}){
 const scrub=()=>{if(location?.pathname===callbackPath)try{history?.replaceState(null,'',location.origin+callbackPath);}catch{}};
 if(!policyValid(policy)||location?.origin!==policy.stageOrigin||location?.pathname!==callbackPath||typeof createClient!=='function'||typeof verifyCurrentSession!=='function'){
  scrub();return Object.freeze({configured:false,view:()=>safeView('unconfigured'),capabilities:Object.freeze({requestEmail:false,changePassword:false}),dispose(){}});
 }
 const config=Object.freeze({...policy}),client=createClient(config.providerOrigin,config.publishableKey,{auth:{skipAutoInitialize:true,persistSession:false,autoRefreshToken:false,detectSessionInUrl:true,flowType:'implicit',storageKey:'mc-password-recovery-isolated-v1'}}),auth=client.auth;
 let generation=0,disposed=false,recoverySeen=false,status='checking',mutations=Promise.resolve();const listeners=new Set();
 const view=()=>safeView(status),notify=()=>{const current=view();for(const listener of listeners)queueMicrotask(()=>{if(!disposed&&listeners.has(listener))listener(current);});};
 const subscription=auth.onAuthStateChange(event=>{
  if(disposed)return;
  if(event==='PASSWORD_RECOVERY'){generation++;recoverySeen=true;status='checking';notify();}
  if(event==='SIGNED_OUT'){generation++;recoverySeen=false;status='link_required';notify();}
 }).data.subscription;
 const setStatus=s=>{if(!disposed){status=s;notify();}return safeView(disposed?'closed':s);};
 async function inspect(){
  if(disposed)return safeView('closed');
  try{const initialized=await auth.initialize();scrub();if(initialized.error)return setStatus('invalid_link');if(!recoverySeen)return setStatus('link_required');
   const g=generation,u=await auth.getUser();if(disposed||g!==generation)return safeView('session_changed');
   if(u.error||u.data?.user?.id!==config.ownerSubject||u.data.user.is_anonymous===true)return setStatus('denied');
   const a=await auth.mfa.getAuthenticatorAssuranceLevel();if(a.error)return setStatus('session_unconfirmed');
   const current=await verifyCurrentSession({projectId:config.projectId});
   if(disposed||g!==generation)return safeView('session_changed');
   if(!current||current.subject!==config.ownerSubject||current.role!=='OWNER'||current.projectId!==config.projectId||current.sessionActive!==true||current.aal!==a.data?.currentLevel||!['aal1','aal2'].includes(current.aal)||!Number.isSafeInteger(current.expiresAt)||current.expiresAt<=now())return setStatus('denied');
   return setStatus(a.data.nextLevel==='aal2'&&a.data.currentLevel!=='aal2'?'mfa_required':'ready');
  }catch{scrub();return setStatus('session_unconfirmed');}
 }
 function mutate(action){if(disposed)return Promise.reject(failure('RECOVERY_CLOSED'));const g=generation,job=mutations.then(async()=>{if(disposed||g!==generation)throw failure('RECOVERY_SESSION_CHANGED');try{return await action(g);}catch(error){if(safeErrors.has(error))throw error;setStatus('operation_unconfirmed');throw failure('RECOVERY_OPERATION_UNCONFIRMED');}});mutations=job.catch(()=>{});return job;}
 async function requestEmail({email,explicit=false}={}){
  if(!emailRequestValid(config)||explicit!==true||typeof email!=='string'||email.trim().toLowerCase()!==config.allowedEmail.toLowerCase())throw failure('EXPLICIT_APPROVED_RECOVERY_REQUEST_REQUIRED');
  return mutate(async g=>{const r=await auth.resetPasswordForEmail(email.trim(),{redirectTo:config.stageOrigin+callbackPath});if(disposed||g!==generation)throw failure('RECOVERY_SESSION_CHANGED');if(r.error){setStatus('operation_unconfirmed');throw failure('RECOVERY_REQUEST_UNCONFIRMED');}return setStatus('request_completed');});
 }
 async function changePassword({password,confirmation,explicit=false}={}){
  if(config.passwordChangeApproved!==true||explicit!==true||typeof password!=='string'||!password||password.length>1024||password!==confirmation)throw failure('EXPLICIT_MATCHING_PASSWORD_REQUIRED');
  return mutate(async g=>{const current=await inspect();if(current.status!=='ready'||disposed||g!==generation)throw failure('VERIFIED_RECOVERY_SESSION_REQUIRED');
   const r=await auth.updateUser({password});if(r.error){recoverySeen=false;setStatus('update_unconfirmed');throw failure('PASSWORD_UPDATE_UNCONFIRMED');}
   if(disposed||g!==generation)throw failure('PASSWORD_UPDATE_REAUTH_REQUIRED');
   if(r.data?.user?.id!==config.ownerSubject)throw failure('PASSWORD_UPDATE_REAUTH_REQUIRED');
   recoverySeen=false;generation++;
   let cleared=false;try{const out=await auth.signOut({scope:'local'});cleared=!out.error;}catch{}
   setStatus('updated_reauthenticate');return safeView('updated_reauthenticate',{localClearVerified:cleared});
  });
 }
 async function verifyAuthenticator({code,explicit=false}={}){
  if(explicit!==true||typeof code!=='string'||!/^\d{6}$/.test(code))throw failure('EXPLICIT_AUTHENTICATOR_CODE_REQUIRED');
  return mutate(async g=>{if((await inspect()).status!=='mfa_required'||disposed||g!==generation)throw failure('VERIFIED_RECOVERY_SESSION_REQUIRED');
   const factors=await auth.mfa.listFactors();const factor=factors.data?.totp?.find(f=>f.status==='verified');
   if(factors.error||!factor||disposed||g!==generation)throw failure('VERIFIED_AUTHENTICATOR_REQUIRED');
   const r=await auth.mfa.challengeAndVerify({factorId:factor.id,code});if(r.error)throw failure('AUTHENTICATOR_UNCONFIRMED');
   if(disposed||g!==generation)throw failure('RECOVERY_SESSION_CHANGED');return inspect();
  });
 }
 return Object.freeze({configured:true,view,inspect,requestEmail,changePassword,verifyAuthenticator,
  capabilities:Object.freeze({requestEmail:emailRequestValid(config),changePassword:config.passwordChangeApproved===true}),
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  dispose(){if(disposed)return;disposed=true;generation++;recoverySeen=false;status='closed';listeners.clear();subscription.unsubscribe();auth.stopAutoRefresh();scrub();}});
}
