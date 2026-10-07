// Prepared official SDK adapter. No SDK download, ambient IO, token logging or activation.
import {ownerAuthConfig} from '../../public/owner-auth-config.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function mfaFailure(action,error){
 const code=error?.code,known={mfa_totp_enroll_not_enabled:'MFA_ENROLL_DISABLED',mfa_factor_name_conflict:'MFA_FACTOR_CONFLICT',mfa_factor_limit_exceeded:'MFA_FACTOR_LIMIT',over_mfa_limit:'MFA_FACTOR_LIMIT',mfa_verification_failed:'MFA_VERIFY_REJECTED',mfa_factor_not_found:'MFA_FACTOR_CHANGED',mfa_factor_id_not_found:'MFA_FACTOR_CHANGED'};
 return Error(error?.status===429?'MFA_RATE_LIMITED':Object.hasOwn(known,code)?known[code]:action);
}
export function createSupabaseOwnerAuth({createClient,ownerSubject=null,authSetupVerified=false,verifyCurrentSession=null,stageOrigin=null}={}){
 if(!uuid.test(ownerSubject||'')||authSetupVerified!==true||typeof verifyCurrentSession!=='function'||stageOrigin!==ownerAuthConfig.stageOrigin){
  return Object.freeze({configured:false,status:'unconfigured',reason:'OWNER_SETUP_PENDING'});
 }
 if(typeof createClient!=='function')throw Error('OFFICIAL_SDK_REQUIRED');
 const client=createClient(ownerAuthConfig.origin,ownerAuthConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'mc-owner-session-v1'}});
 const auth=client.auth;if(!auth?.mfa)throw Error('OFFICIAL_SDK_REQUIRED');
 let generation=0,disposed=false,mutations=Promise.resolve();const listeners=new Set();
 const subscription=auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')generation++;for(const f of listeners)queueMicrotask(()=>f({type:event==='SIGNED_OUT'?'SIGNED_OUT':'SESSION_CHANGED'}));}).data.subscription;
 const safeFailure=()=>Object.freeze({status:'session_unconfirmed',authenticated:false});
 async function inspectSession(projectId,{requireMembership=true}={}){
  const g=generation;if(disposed)return Object.freeze({status:'signed_out',authenticated:false});
  try{
   // getUser goes to Auth server; cached getSession alone is never authorization.
   const u=await auth.getUser();if(g!==generation)return Object.freeze({status:'signed_out',authenticated:false});
   if(u.error||!u.data?.user)return Object.freeze({status:'signed_out',authenticated:false});
   if(u.data.user.id!==ownerSubject||u.data.user.is_anonymous===true){generation++;await auth.signOut({scope:'local'});return Object.freeze({status:'denied',authenticated:false});}
   const a=await auth.mfa.getAuthenticatorAssuranceLevel();if(a.error)return safeFailure();
   // The reviewed server bridge must check actual auth.sessions and immutable owner membership.
   const current=await verifyCurrentSession({projectId,ownerSubject});
   if(g!==generation)return Object.freeze({status:'signed_out',authenticated:false});
   if(!current||current.subject!==ownerSubject||current.role!=='OWNER'||current.sessionActive!==true||(requireMembership&&current.memberActive!==true)||current.projectId!==projectId||current.aal!==a.data?.currentLevel||!['aal1','aal2'].includes(current.aal)||!Number.isSafeInteger(current.expiresAt)||current.expiresAt<=Date.now()){
    generation++;await auth.signOut({scope:'local'});return Object.freeze({status:'denied',authenticated:false});
   }
   return Object.freeze({status:'authenticated',authenticated:true,subject:ownerSubject,role:'OWNER',aal:current.aal,expiresAt:current.expiresAt,sessionActive:true,memberActive:current.memberActive===true,verified:true,projects:Object.freeze([projectId]),qualification:'VERIFIED_PROVIDER_SESSION'});
  }catch{return safeFailure();}
 }
 function ensureOpen(){if(disposed)throw Error('ADAPTER_DISPOSED');}
 function mutate(action){ensureOpen();const g=generation;const job=mutations.then(async()=>{if(disposed||g!==generation)throw Error('SESSION_INVALIDATED');const result=await action();if(disposed||g!==generation){await auth.signOut({scope:'local'});throw Error('SESSION_INVALIDATED');}return result;});mutations=job.catch(()=>{});return job;}
 async function signIn({email,password}){ensureOpen();if(typeof email!=='string'||!email.includes('@')||typeof password!=='string'||!password)throw Error('OWNER_CREDENTIALS_REQUIRED');return mutate(async()=>{const r=await auth.signInWithPassword({email,password});if(r.error)throw Error('SIGNIN_FAILED');if(r.data?.user?.id!==ownerSubject){await auth.signOut({scope:'local'});throw Error('OWNER_DENIED');}return Object.freeze({status:'SESSION_RECHECK_REQUIRED'});});}
 async function clearRemote(){const job=mutations.then(async()=>{const r=await auth.signOut({scope:'local'});if(r.error)throw Error('SIGNOUT_UNCONFIRMED');return Object.freeze({status:'signed_out'});});mutations=job.catch(()=>{});return job;}
 async function signOut(){ensureOpen();generation++;for(const f of listeners)queueMicrotask(()=>f({type:'SIGNED_OUT'}));return clearRemote();}
 async function requireOwner(projectId){ensureOpen();const s=await inspectSession(projectId,{requireMembership:false});if(s.status!=='authenticated')throw Error('OWNER_CURRENT_SESSION_REQUIRED');}
 async function listTotp({projectId}={}){return mutate(async()=>{await requireOwner(projectId);let r;try{r=await auth.mfa.listFactors();}catch{throw Error('MFA_FACTORS_FAILED');}if(r.error)throw mfaFailure('MFA_FACTORS_FAILED',r.error);return Object.freeze((r.data?.all||[]).filter(f=>f.factor_type==='totp'&&['verified','unverified'].includes(f.status)).map(f=>Object.freeze({id:f.id,status:f.status,createdHere:f.friendly_name==='MC owner'})));});}
 async function cancelUnverifiedTotp({projectId,factorId,explicit=false}={}){if(!explicit||!uuid.test(factorId||''))throw Error('EXPLICIT_UNVERIFIED_FACTOR_REQUIRED');return mutate(async()=>{await requireOwner(projectId);const r=await auth.mfa.listFactors();if(r.error||!r.data?.all?.some(f=>f.id===factorId&&f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='MC owner'))throw Error('UNVERIFIED_FACTOR_CHANGED');let removed;try{removed=await auth.mfa.unenroll({factorId});}catch{throw Error('MFA_CANCEL_FAILED');}if(removed.error)throw mfaFailure('MFA_CANCEL_FAILED',removed.error);return Object.freeze({status:'UNVERIFIED_FACTOR_REMOVED'});});}
 async function enrollTotp({projectId}={}){return mutate(async()=>{await requireOwner(projectId);let r;try{r=await auth.mfa.enroll({factorType:'totp',friendlyName:'MC owner'});}catch{throw Error('MFA_ENROLL_FAILED');}if(r.error)throw mfaFailure('MFA_ENROLL_FAILED',r.error);return r.data;});}
 async function verifyTotp({projectId,factorId,code}){ensureOpen();if(!uuid.test(factorId||'')||typeof code!=='string'||!/^\d{6}$/.test(code))throw Error('MFA_FIELDS');return mutate(async()=>{await requireOwner(projectId);let r;try{r=await auth.mfa.challengeAndVerify({factorId,code});}catch{throw Error('MFA_VERIFY_FAILED');}if(r.error)throw mfaFailure('MFA_VERIFY_FAILED',r.error);return Object.freeze({status:'SESSION_RECHECK_REQUIRED'});});}
 return Object.freeze({configured:true,inspectSession,inspectOwnerSession:projectId=>inspectSession(projectId,{requireMembership:false}),signIn,signOut,listTotp,cancelUnverifiedTotp,enrollTotp,verifyTotp,subscribeInvalidation(fn){ensureOpen();listeners.add(fn);return()=>listeners.delete(fn);},dispose(){if(disposed)return mutations;disposed=true;generation++;listeners.clear();subscription.unsubscribe();auth.stopAutoRefresh();return clearRemote();}});
}
