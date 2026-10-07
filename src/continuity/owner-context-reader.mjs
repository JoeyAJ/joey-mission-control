// Inactive by default. Authorized private scope comes from the bounded Owner RPC.
// No client/session creation, credentials, persistence, ambient network or writes.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=/^[a-f0-9]{64}$/;
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
export function createOwnerContextReader({enabled=false,ownerSubject,inspectCurrentOwner,rpc,digest,now=Date.now}={}){
 const configured=enabled===true&&uuid.test(ownerSubject||'')&&typeof inspectCurrentOwner==='function'&&typeof rpc==='function'&&typeof digest==='function';
 let generation=0,sequence=0,disposed=false,status=configured?'idle':'unconfigured',privateValue=null;
 const clear=()=>{privateValue=null;};
 const view=()=>Object.freeze({status,configured:configured&&!disposed,privateContextLoaded:privateValue!==null,privateReadOnly:true,executionAuthorized:false,writerEnabled:false});
 async function read(projectId){
  clear();const g=generation,s=++sequence;
  if(!configured||disposed||!projects.has(projectId)){if(!disposed)status=configured?'denied':'unconfigured';throw Error('PRIVATE_READ_NOT_AUTHORIZED');}
  status='reading';
  const current=()=>{if(disposed||g!==generation||s!==sequence)throw Error('PRIVATE_READ_INVALIDATED');};
  const requireOwner=async()=>{
   const actor=await inspectCurrentOwner(projectId);current();
   if(actor?.status!=='authenticated'||actor.subject!==ownerSubject||actor.role!=='OWNER'||actor.aal!=='aal2'||actor.verified!==true||actor.sessionActive!==true||actor.memberActive!==true||!actor.projects?.includes(projectId)||!Number.isSafeInteger(actor.expiresAt)||actor.expiresAt<=now())throw Error('PRIVATE_READ_OWNER_AAL2_REQUIRED');
  };
  try{
   await requireOwner();
   const discovered=await rpc('mc_owner_context_scope',{project:projectId});current();
   const scope=discovered?.data;
   if(discovered?.error||!scope||Object.keys(scope).length!==2||scope.projectId!==projectId||!hash.test(scope.contextHash))throw Error('PRIVATE_READ_SCOPE_INVALID');
   const expected=scope.contextHash;
   await requireOwner();
   const reply=await rpc('mc_owner_read_context',{project:projectId,requested_hash:expected});current();
   const body=reply?.data;
   if(reply?.error||!body||body.projectId!==projectId||body.contextHash!==expected||!body.filteredClaims||typeof body.filteredClaims!=='object'||Array.isArray(body.filteredClaims))throw Error('PRIVATE_READ_NOT_CONFIRMED');
   const claims=structuredClone(body.filteredClaims);
   if(await digest(claims)!==expected)throw Error('PRIVATE_READ_INTEGRITY');current();
   // Recheck after transport/digest before exposing any value to the private viewer.
   await requireOwner();current();privateValue=claims;status='connected';
   return structuredClone(privateValue);
  }catch{if(!disposed&&g===generation&&s===sequence){clear();status='denied';}throw Error('PRIVATE_READ_NOT_CONFIRMED');}
 }
 return Object.freeze({view,read,invalidate(){generation++;sequence++;clear();status=disposed?'closed':configured?'idle':'unconfigured';},dispose(){disposed=true;generation++;sequence++;clear();status='closed';}});
}
