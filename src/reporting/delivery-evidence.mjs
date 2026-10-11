import {supportsDeliveryVersion} from './file-activity.mjs';
// Bounded Agent declarations only. No provider/URL fetch or trusted attestation.
import {isStrictDateTime} from '../canonical/date-time.mjs';
export const REPORT_VERSION_V2='mc.repository-run.v2';
export const TASK_KINDS=Object.freeze(['FEATURE','BUGFIX','DOCUMENTATION','DELIVERY_FOLLOWUP']);
// This public synthetic package's reviewed source identity; never a project-wide waiver.
export const UNIVERSITY_STATIC_RUNTIME_SHA='d7338420868694ed9bcc36afed90757e660ec182';
export const UNIVERSITY_STATIC_DATA_POLICY='UNIVERSITY_STATIC_DEMO_NO_MIGRATION';
const sha=/^[a-f0-9]{40}$/;
// Public metadata only. A declared target grants no deployment or fetch authority.
// Fixed URLs: metadata/project-urls.v1.json; provider identity: private inventory receipt.
const policies={
 MISSION_CONTROL:{url:'https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app/',target:{provider:'vercel',project:'joey-mission-control',environment:'preview'},docsPolicy:'MC_DOCUMENTATION_ONLY',dataPolicy:'MC_NO_DATA_CHANGE'},
 NEXAEON:{url:'https://nexaeon-web.vercel.app/',target:{provider:'vercel',project:'nexaeon-web',environment:'production'},docsPolicy:null,dataPolicy:null},
 WOOSONG_BUDDY:{url:'https://woosong-buddy-app.vercel.app/',target:{provider:'vercel',project:'woosong-buddy-app',environment:'production'},docsPolicy:null,dataPolicy:null},
 NAMYOUNG_WEB3D:{url:'https://namyoung-web3d.vercel.app/',target:{provider:'vercel',project:'namyoung-web3d',environment:'production'},docsPolicy:null,dataPolicy:null}
};
export function deliveryPolicy(report,{codeSha=null}={}){if(report?.projectId==='JOEY_ASSET_SYSTEM'&&report.track==='UNIVERSITY_CANDIDATE')return{url:'https://joey-woosong-admissions-demo.vercel.app/',target:{provider:'vercel',project:'joey-woosong-admissions-demo',environment:'production'},docsPolicy:null,dataPolicy:report.taskKind==='DELIVERY_FOLLOWUP'&&codeSha===UNIVERSITY_STATIC_RUNTIME_SHA?UNIVERSITY_STATIC_DATA_POLICY:null};return report?.track==='BASELINE'&&Object.hasOwn(policies,report.projectId)?structuredClone(policies[report.projectId]):null;}
const fail=(code='RUN_REPORT_DELIVERY_INVALID')=>{throw Object.assign(Error(code),{code});};
function exact(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k)))fail();for(const d of Object.values(Object.getOwnPropertyDescriptors(v)))if(!('value'in d))fail();}
function text(v,max=500){if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v)||/Bearer\s|gh[pousr]_|github_pat_|\b(?:password|secret|token)\s*[:=]|PRIVATE KEY|^eyJ[A-Za-z0-9_-]+\.|MC_VERIFIED|INDEPENDENTLY_VERIFIED|https?:\/\/[^\s/]*@/i.test(v))fail();}
function time(v,eventAt){if(!isStrictDateTime(v)||Date.parse(v)>Date.parse(eventAt))fail('RUN_REPORT_DELIVERY_TIME_INVALID');}
function nullable(v,fn){if(v!==null)fn(v);}
function permittedUrl(url,policy){if(!policy||url!==policy.url)fail('RUN_REPORT_DELIVERY_URL_INVALID');let u;try{u=new URL(url);}catch{fail('RUN_REPORT_DELIVERY_URL_INVALID');}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)fail('RUN_REPORT_DELIVERY_URL_INVALID');}
function notRequired(v,policyId){exact(v,['policy','reason']);if(!policyId||v.policy!==policyId)fail('RUN_REPORT_DELIVERY_POLICY_INVALID');text(v.reason);}
export function emptyDeliveryEvidence(report,codeSha){if(!sha.test(codeSha))fail('RUN_REPORT_DELIVERY_SHA_CONFLICT');return{qualification:'AGENT_REPORTED',scope:{projectId:report.projectId,track:report.track,repositoryId:report.repositoryId,runId:report.runId,taskId:report.taskId,workRef:report.workRef,codeSha},deployment:{status:'NOT_RECORDED',target:null,id:null,deployedSha:null,url:null,observedAt:null,evidence:null,notRequired:null},verification:{status:'NOT_RECORDED',method:null,checkedAt:null,deploymentId:null,checkedSha:null,url:null,evidence:null,notRequired:null},handoff:{status:'NOT_RECORDED',path:null,commitSha:null,checkedAt:null,evidence:null},data:{status:'NOT_RECORDED',version:null,checkedAt:null,evidence:null,notRequired:null}};}
export function validateDeliveryEvidence(value,{report,event}={}){
 if(value===null)return null;
 exact(value,['qualification','scope','deployment','verification','handoff','data']);if(value.qualification!=='AGENT_REPORTED')fail();
 const b=value.scope;exact(b,['projectId','track','repositoryId','runId','taskId','workRef','codeSha']);for(const k of ['projectId','track','repositoryId','runId','taskId','workRef'])if(b[k]!==report[k])fail('RUN_REPORT_DELIVERY_SCOPE_INVALID');if(!sha.test(b.codeSha))fail();if(event.result&&b.codeSha!==event.result.codeSha)fail('RUN_REPORT_DELIVERY_SHA_CONFLICT');
 const policy=deliveryPolicy(report,{codeSha:b.codeSha}),d=value.deployment,v=value.verification,h=value.handoff,m=value.data;
 exact(d,['status','target','id','deployedSha','url','observedAt','evidence','notRequired']);if(!['NOT_RECORDED','PENDING','READY','FAILED','NOT_REQUIRED'].includes(d.status))fail();
 if(d.target!==null){exact(d.target,['provider','project','environment']);if(!policy||Object.keys(policy.target).some(k=>d.target[k]!==policy.target[k]))fail('RUN_REPORT_DELIVERY_POLICY_INVALID');}
 nullable(d.id,x=>{text(x,128);if(!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(x))fail();});nullable(d.deployedSha,x=>{if(x!==b.codeSha)fail('RUN_REPORT_DELIVERY_SHA_CONFLICT');});nullable(d.url,x=>permittedUrl(x,policy));nullable(d.observedAt,x=>time(x,event.eventAt));nullable(d.evidence,text);
 if(d.status==='NOT_RECORDED'){if(['target','id','deployedSha','url','observedAt','evidence','notRequired'].some(k=>d[k]!==null))fail();}
 else if(d.status==='NOT_REQUIRED'){if(report.taskKind!=='DOCUMENTATION')fail('RUN_REPORT_DELIVERY_POLICY_INVALID');notRequired(d.notRequired,policy?.docsPolicy);if(['target','id','deployedSha','url','observedAt','evidence'].some(k=>d[k]!==null))fail();}
 else{if(d.notRequired!==null||!d.target||!d.observedAt||!d.evidence)fail();if(d.status==='READY'&&(!d.id||!d.deployedSha||!d.url))fail();}
 exact(v,['status','method','checkedAt','deploymentId','checkedSha','url','evidence','notRequired']);if(!['NOT_RECORDED','PASS','FAIL','BLOCKED','NOT_REQUIRED'].includes(v.status))fail();
 nullable(v.method,x=>{if(!['HTTP_FUNCTIONAL_CHECK','BROWSER','OWNER_DEVICE','SYNTHETIC_FIXTURE'].includes(x))fail();});nullable(v.checkedAt,x=>time(x,event.eventAt));nullable(v.deploymentId,x=>{if(!d.id||x!==d.id)fail('RUN_REPORT_DELIVERY_SCOPE_INVALID');});nullable(v.checkedSha,x=>{if(x!==b.codeSha)fail('RUN_REPORT_DELIVERY_SHA_CONFLICT');});nullable(v.url,x=>{permittedUrl(x,policy);if(x!==d.url)fail('RUN_REPORT_DELIVERY_URL_INVALID');});nullable(v.evidence,text);
 if(v.status==='NOT_RECORDED'){if(['method','checkedAt','deploymentId','checkedSha','url','evidence','notRequired'].some(k=>v[k]!==null))fail();}
 else if(v.status==='NOT_REQUIRED'){if(d.status!=='NOT_REQUIRED'||report.taskKind!=='DOCUMENTATION')fail('RUN_REPORT_DELIVERY_POLICY_INVALID');notRequired(v.notRequired,policy?.docsPolicy);if(['method','checkedAt','deploymentId','checkedSha','url','evidence'].some(k=>v[k]!==null))fail();}
 else{if(v.notRequired!==null||d.status!=='READY'||!v.method||!v.checkedAt||!v.deploymentId||v.status==='PASS'&&!v.checkedSha||v.status==='BLOCKED'&&v.checkedSha!==null||!v.url||!v.evidence||Date.parse(v.checkedAt)<Date.parse(d.observedAt))fail();}
 exact(h,['status','path','commitSha','checkedAt','evidence']);if(!['NOT_RECORDED','CURRENT','STALE'].includes(h.status))fail();
 if(h.status==='NOT_RECORDED'){if(['path','commitSha','checkedAt','evidence'].some(k=>h[k]!==null))fail();}
 else{if(![report.baseline.handoffPath,...(report.baseline.contextPaths||[])].includes(h.path)||!sha.test(h.commitSha)||!h.checkedAt||!h.evidence)fail('RUN_REPORT_DELIVERY_SCOPE_INVALID');time(h.checkedAt,event.eventAt);text(h.evidence);if(event.result&&(h.path!==event.result.handoff.path||h.commitSha!==event.result.handoff.commitSha))fail('RUN_REPORT_DELIVERY_SCOPE_INVALID');}
 exact(m,['status','version','checkedAt','evidence','notRequired']);if(!['NOT_RECORDED','PENDING','APPLIED','FAILED','NOT_REQUIRED'].includes(m.status))fail();
 if(m.status==='NOT_RECORDED'){if(['version','checkedAt','evidence','notRequired'].some(k=>m[k]!==null))fail();}
 else if(m.status==='NOT_REQUIRED'){notRequired(m.notRequired,policy?.dataPolicy);if(policy.dataPolicy===UNIVERSITY_STATIC_DATA_POLICY&&d.status!=='READY')fail('RUN_REPORT_DELIVERY_POLICY_INVALID');if(!m.checkedAt||m.version!==null||m.evidence!==null)fail();time(m.checkedAt,event.eventAt);}
 else{if(m.notRequired!==null||!m.checkedAt||!m.evidence)fail();time(m.checkedAt,event.eventAt);text(m.evidence);nullable(m.version,x=>text(x,100));if(m.status==='APPLIED'&&!m.version)fail();}
 return structuredClone(value);
}
export function repositoryDeliveryStatus(p){
 const base={qualification:'AGENT_REPORTED',coding:p?.reportedState==='completed'?'REPORTED_COMPLETED':p?.reportedState==='failed'?'REPORTED_FAILED':'IN_PROGRESS_OR_UNCONFIRMED',tests:p?.result?.tests?.length&&p.result.tests.every(t=>t.outcome==='PASS')?'AGENT_REPORTED_PASS':'NOT_FULLY_REPORTED_PASS',deployment:'EVIDENCE_PENDING',fixedUrl:'VERIFICATION_PENDING',handoff:p?.result?.handoff?'REPORTED_POINTER_FRESH_READ_REQUIRED':'UNRECORDED',migration:'UNRECORDED_IN_V1_REPORT',delivery:'REPORTED_INCOMPLETE',independentVerification:'PENDING',joeyAcceptance:'PENDING',productAccepted:false};
 if(!supportsDeliveryVersion(p?.schemaVersion))return base;
 const e=p.delivery;if(!e)return{...base,migration:'NOT_RECORDED',missing:['deployment','verification','handoff','data']};
 const missing=[];if(!['READY','NOT_REQUIRED'].includes(e.deployment.status))missing.push('deployment');if(!['PASS','NOT_REQUIRED'].includes(e.verification.status)||e.verification.method==='SYNTHETIC_FIXTURE')missing.push('verification');if(e.handoff.status!=='CURRENT')missing.push('handoff');if(!['APPLIED','NOT_REQUIRED'].includes(e.data.status))missing.push('data');if(base.tests!=='AGENT_REPORTED_PASS')missing.push('tests');
 return{...base,deployment:e.deployment.status,fixedUrl:e.verification.status,handoff:e.handoff.status,migration:e.data.status,delivery:p.reportedState==='completed'&&!missing.length?'REPORTED_READY':'REPORTED_INCOMPLETE',missing,evidence:e,evidenceCurrentness:'DATED_REPORTED_OBSERVATION_NOT_CURRENT_ALIAS_PROOF'};
}
