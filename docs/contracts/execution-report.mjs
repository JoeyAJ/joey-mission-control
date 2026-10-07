// Isolated P2A contract. No IO, clock, token, observer, writer or application import.
const VERSION='mc.execution-report.v1';
const kinds=['started','progress','permission-needed','completed','failed','disconnected'];
const terminal=new Set(['completed','failed','disconnected']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const fail=code=>{throw Object.assign(new Error(code),{code});};
// Accept JSON data, not objects with executable serialization/accessor hooks.
function jsonData(value,seen=new Set(),depth=0){
 if(depth>12)fail('NON_JSON_DATA');
 if(value===null||typeof value==='boolean')return;
 if(typeof value==='string'){if(value.length>256)fail('NON_JSON_DATA');return;}
 if(typeof value==='number'){if(!Number.isFinite(value))fail('NON_JSON_DATA');return;}
 if(!value||typeof value!=='object'||seen.has(value))fail('NON_JSON_DATA');
 const array=Array.isArray(value),proto=Object.getPrototypeOf(value);
 if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)fail('NON_JSON_DATA');
 if(Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')||Object.getOwnPropertyDescriptor(Array.prototype,'toJSON'))fail('NON_JSON_DATA');
 const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
 if(names.length>1001)fail('NON_JSON_DATA');seen.add(value);
 for(const name of names){
  const d=descriptors[name];if(typeof name!=='string'||!('value'in d))fail('NON_JSON_DATA');
  if(array&&name==='length')continue;
  if(!d.enumerable||name==='toJSON'||(array&&!/^(0|[1-9]\d*)$/.test(name)))fail('NON_JSON_DATA');
  jsonData(d.value,seen,depth+1);
 }
 if(array&&names.length!==value.length+1)fail('NON_JSON_DATA');seen.delete(value);
}
const keys=(v,expected)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...expected].sort().join('|');
const canonical=v=>JSON.stringify(v,(_,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
const copy=v=>JSON.parse(JSON.stringify(v));
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function time(v){
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v))fail('INVALID_TIME');
 const n=Date.parse(v);if(!Number.isFinite(n)||new Date(n).toISOString()!==v.replace(/Z$/,v.includes('.')?'Z':'.000Z'))fail('INVALID_TIME');return n;
}
const reportKeys=['schemaVersion','eventId','projectId','missionId','baselineSha','sourceId','sourceRevision','bindingId','sessionId','sequence','expectedRevision','eventAt','issuedAt','expiresAt','kind','model','evidenceId'];
const contextKeys=['projectId','missionId','baselineSha','sourceId','sourceRevision','sessions','evidenceIds','maxAgeMs','maxValidityMs','maxEvents'];
function context(c){
 jsonData(c);
 if(!keys(c,contextKeys)||!['projectId','missionId','sourceId','sourceRevision'].every(k=>id(c[k]))||!sha(c.baselineSha))fail('INVALID_CONTEXT');
 for(const k of ['maxAgeMs','maxValidityMs','maxEvents'])if(!Number.isSafeInteger(c[k])||c[k]<1)fail('INVALID_CONTEXT');
 if(c.maxEvents>1000||c.maxAgeMs>86400000||c.maxValidityMs>86400000)fail('INVALID_CONTEXT');
 if(!Array.isArray(c.sessions)||!c.sessions.length||c.sessions.length>100||!Array.isArray(c.evidenceIds)||c.evidenceIds.length>1000||!c.evidenceIds.every(id)||new Set(c.evidenceIds).size!==c.evidenceIds.length)fail('INVALID_CONTEXT');
 const seen=new Set();for(const s of c.sessions){if(!keys(s,['bindingId','sessionId'])||!id(s.bindingId)||!id(s.sessionId)||seen.has(s.sessionId))fail('INVALID_CONTEXT');seen.add(s.sessionId);}
}
function report(r,c,now){
 if(!keys(r,reportKeys)||r.schemaVersion!==VERSION||!['eventId','projectId','missionId','sourceId','sourceRevision','bindingId','sessionId'].every(k=>id(r[k]))||!sha(r.baselineSha)||!kinds.includes(r.kind))fail('INVALID_REPORT');
 if(!Number.isSafeInteger(r.sequence)||r.sequence<1||!Number.isSafeInteger(r.expectedRevision)||r.expectedRevision<0)fail('INVALID_REPORT');
 // Models are optional bounded identifiers, never commands, paths or prose.
 if(r.model!==null&&!id(r.model))fail('INVALID_REPORT');
 if(r.evidenceId!==null&&(!id(r.evidenceId)||!c.evidenceIds.includes(r.evidenceId)))fail('UNKNOWN_EVIDENCE');
 for(const k of ['projectId','missionId','baselineSha','sourceId','sourceRevision'])if(r[k]!==c[k])fail('CONTEXT_MISMATCH');
 if(!c.sessions.some(s=>s.bindingId===r.bindingId&&s.sessionId===r.sessionId))fail('UNKNOWN_SESSION');
 const event=time(r.eventAt),issued=time(r.issuedAt),expiry=time(r.expiresAt);
 if(event>issued||issued>now||expiry<=issued||expiry-issued>c.maxValidityMs)fail('INVALID_TIME_WINDOW');
 if(now-event>c.maxAgeMs||now>=expiry)fail('STALE_REPORT');
}
function transition(history,r,now){
 const last=history.at(-1),previous=history.filter(e=>e.report.sessionId===r.sessionId).at(-1);
 if(previous&&r.sequence!==previous.report.sequence+1)fail('SEQUENCE_CONFLICT');
 if(!previous&&r.sequence!==1)fail('SEQUENCE_CONFLICT');
 if(previous&&(terminal.has(previous.report.kind)||r.kind==='started'))fail('SESSION_CLOSED');
 if(last&&time(r.eventAt)<time(last.report.eventAt))fail('TIME_REGRESSION');
 if(previous&&time(previous.report.expiresAt)<=now)fail('SESSION_EXPIRED');
 if(!previous){
  if(r.kind!=='started')fail('START_REQUIRED');
  if(last&&!terminal.has(last.report.kind)&&time(last.report.expiresAt)>now)fail('ACTIVE_SESSION_CONFLICT');
 }
 if(last&&previous&&last.report.sessionId!==r.sessionId)fail('SESSION_SUPERSEDED');
}
export function emptyReportState(){return freeze({schemaVersion:VERSION,revision:0,history:[]});}
// Restore is pure replay of acceptance receipts, retaining original times/expiry.
function state(s,c){
 jsonData(s);
 if(!keys(s,['schemaVersion','revision','history'])||s.schemaVersion!==VERSION||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.history)||s.history.length!==s.revision||s.history.length>c.maxEvents)fail('INVALID_STATE');
 const history=[],seen=new Set();let received=-Infinity;
 for(const e of s.history){
  if(!keys(e,['report','receivedAt'])||seen.has(e.report?.eventId))fail('INVALID_STATE');
  const now=time(e.receivedAt);if(now<received||e.report.expectedRevision!==history.length)fail('INVALID_STATE');
  report(e.report,c,now);transition(history,e.report,now);seen.add(e.report.eventId);history.push(e);received=now;
 }
}
export function restoreReportState(snapshot,c){context(c);state(snapshot,c);return freeze(copy(snapshot));}
export function reduceExecutionReport(previous,input,c,receivedAt){
 try{
  context(c);state(previous,c);const now=time(receivedAt);
  jsonData(input);
  // Structural/context validation at original acceptance time permits harmless
  // replay after expiry; it never renews validity or creates a new report.
  const duplicate=previous.history.find(e=>e.report.eventId===input?.eventId);
  if(duplicate){if(!keys(input,reportKeys)||canonical(input)!==canonical(duplicate.report))fail('EVENT_ID_CONFLICT');return {accepted:true,duplicate:true,state:freeze(copy(previous))};}
  report(input,c,now);
  if(previous.history.length&&now<time(previous.history.at(-1).receivedAt))fail('READ_TIME_REGRESSION');
  if(input.expectedRevision!==previous.revision)fail('REVISION_CONFLICT');
  if(previous.history.length>=c.maxEvents)fail('HISTORY_CAPACITY');
  transition(previous.history,input,now);
  return {accepted:true,duplicate:false,state:freeze({schemaVersion:VERSION,revision:previous.revision+1,history:[...copy(previous.history),{report:copy(input),receivedAt}]})};
 }catch(e){return {accepted:false,error:e.code||'INVALID_INPUT',state:previous};}
}
export function inspectExecutionReports(snapshot,c,readAt){
 context(c);state(snapshot,c);const now=time(readAt),last=snapshot.history.at(-1);
 if(last&&now<time(last.receivedAt))fail('READ_TIME_REGRESSION');
 return freeze({
  scope:'ISOLATED_REPORT_CONTRACT_NOT_CONNECTED',runtimeConnected:false,currentAgent:null,currentTask:null,
  revision:snapshot.revision,readAt,history:copy(snapshot.history),
  reported:last?{...copy(last.report),receivedAt:last.receivedAt,
   identityEvidence:'CALLER_DECLARED_IDENTITY_NOT_VERIFIED',
   validity:terminal.has(last.report.kind)?'CLOSED':now>=time(last.report.expiresAt)?'EXPIRED':'WITHIN_REPORTED_WINDOW',
   observation:'PRODUCER_ATTESTATION_NOT_PROCESS_OBSERVATION',ownerAcceptance:'NOT_INFERRED'}:null
 });
}
