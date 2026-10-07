// Project-bound projection of an already authorized, integrity-checked read.
// No transport, Auth client, persistence, source fallback, or execution authority.
import {readonlyHandoff} from '../../docs/contracts/consumer/readonly-handoff.mjs';
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const keys=['purpose','stage','lastConfirmedCompletion','nextAction','blockerApproval','approvalSource','latestTrustedBaseline'];
const fail=()=>{throw Error('PRIVATE_CONTINUATION_INVALID');};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function text(v){if(v==null)return null;if(typeof v!=='string'||v.length>4096)fail();return v;}
function refs(v){if(v==null)return [];if(!Array.isArray(v)||v.length>64||v.some(x=>typeof x!=='string'||x.length>4096))fail();return [...v];}
export function ownerContextContinuation({context,projectId,readAt}={}){
 if(!projects.has(projectId)||!object(context)||context.projectId!==projectId||!object(context.claims)||typeof readAt!=='string'||!Number.isFinite(Date.parse(readAt)))fail();
 const claimEvidence={},claimSources={};
 for(const key of keys){
  const c=context.claims[key],p=context.claimProvenance?.[key];
  if(c==null)continue;if(!object(c)||!Object.hasOwn(c,'value'))fail();
  claimEvidence[key]={value:structuredClone(c.value),verificationStatus:text(c.verificationStatus)||'UNKNOWN',sourceRefs:refs(c.sourceRefs),missingReason:text(c.missingReason)};
  claimSources[key]={asOf:text(p?.eventTime)};
 }
 const historical=context.historicalOwner;let ownerCanonicalState=null;
 if(historical!=null){
  if(!object(historical)||!Array.isArray(historical.missions)||historical.missions.length>256)fail();
  const revision=historical.sourceOwnerRevision??null;if(revision!==null&&(!Number.isSafeInteger(revision)||revision<0))fail();
  ownerCanonicalState={metadata:{revision},missions:historical.missions.map(m=>{
   if(!object(m)||!text(m.id)||!text(m.title)||!text(m.status))fail();
   return {id:m.id,title:m.title,status:m.status,sourceRefs:refs(m.sourceRefs),dependencies:refs(m.dependencies),createdAt:text(m.createdAt),updatedAt:text(m.updatedAt)};
  })};
 }
 return readonlyHandoff({projectId,claimEvidence,claimSources,sourceRevision:text(context.sourceRevision),sourceTimestamp:text(context.sourceTimestamp),extractedAt:text(context.sourceSnapshot?.extractedAt),readAt,ownerCanonicalState});
}
