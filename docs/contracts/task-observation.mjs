// Provider-neutral snapshot reducer. No connector, tool stream or current agent claim.
const fields=['threadId','turnId','status','safeErrorCategory','observedAt','source','mode','live'].sort().join('|');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const statuses=['inProgress','completed','failed','interrupted'];
const maxAge=300000;
function valid(r){
 if(!r||Object.getPrototypeOf(r)!==Object.prototype||Object.keys(r).sort().join('|')!==fields)throw Error('INVALID_OBSERVATION');
 if(Object.values(Object.getOwnPropertyDescriptors(r)).some(d=>!('value'in d)))throw Error('INVALID_OBSERVATION');
 if(!uuid(r.threadId)||!uuid(r.turnId)||!statuses.includes(r.status)||![null,'UNSPECIFIED_FAILURE','SOURCE_UNAVAILABLE'].includes(r.safeErrorCategory)||r.source!=='cloud_threads.read'||r.mode!=='snapshot'||r.live!==false||typeof r.observedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?Z$/.test(r.observedAt)||!Number.isFinite(Date.parse(r.observedAt)))throw Error('INVALID_OBSERVATION');
 const canonical=new Date(Date.parse(r.observedAt)).toISOString();if(canonical!==r.observedAt.replace(/Z$/,r.observedAt.length===17?':00.000Z':r.observedAt.includes('.')?'Z':'.000Z'))throw Error('INVALID_OBSERVATION');
 return Object.fromEntries(fields.split('|').map(k=>[k,r[k]]));
}
export function reduceTaskObservation(history,receipt){
 if(!Array.isArray(history)||history.length>100)throw Error('INVALID_HISTORY');history=history.map(valid);const next=valid(receipt);
 const old=history.find(r=>r.threadId===next.threadId&&r.turnId===next.turnId&&r.observedAt===next.observedAt);
 if(old){if(JSON.stringify(old)!==JSON.stringify(next))throw Error('OBSERVATION_CONFLICT');return {duplicate:true,history:structuredClone(history)};}
 if(history.length===100)throw Error('OBSERVATION_CAPACITY');if(history.length&&Date.parse(next.observedAt)<Date.parse(history.at(-1).observedAt))throw Error('TIME_REGRESSION');
 return {duplicate:false,history:[...structuredClone(history),next]};
}
export function inspectTaskObservations(history,readAt){
 // Replay validates duplicates/order; rereading never changes observedAt/freshness.
 let restored=[];for(const r of history){const next=reduceTaskObservation(restored,r);if(next.duplicate)throw Error('INVALID_HISTORY');restored=next.history;}
 const now=Date.parse(readAt);if(!Number.isFinite(now))throw Error('INVALID_READ_TIME');const last=restored.at(-1)||null;
 const validity=!last?'NOT_OBSERVED':now<Date.parse(last.observedAt)?'UNKNOWN_FUTURE_OBSERVATION':now-Date.parse(last.observedAt)>=maxAge?'STALE':'RECENT';
 return {sourceQualification:'PARENT_SUPPLIED_PLATFORM_OBSERVATION',transport:'OWNER_PROVIDED_RECEIPT_NOT_APP_CONNECTOR',mode:'snapshot',live:false,runtimeConnected:false,currentAgent:null,currentModel:null,latestObserved:last,expiresAt:last?new Date(Date.parse(last.observedAt)+maxAge).toISOString():null,observedStatus:validity==='RECENT'?last.status:'unknown',validity,readAt,history:restored,capabilities:{toolEvents:false,sourceCode:false,diff:false,automaticHook:false}};
}
