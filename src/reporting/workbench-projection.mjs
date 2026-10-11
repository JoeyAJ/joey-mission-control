import {repositoryDeliveryStatus} from './delivery-evidence.mjs';
import {repositoryRunPresentation} from './repository-run-contract.mjs';
import {REPORT_VERSION_V3} from './file-activity.mjs';
// Source/report conjunction only. No summary parsing, executable adapter or new data transport.
export function workbenchProjection({sourceView,reportView,projectId,track='BASELINE',now=Date.now()}={}){
 const s=sourceView?.observation,o=reportView?.observation;
 const valid=sourceView?.status==='connected'&&s?.status==='FOUND'&&s.projectId===projectId&&(s.track||'BASELINE')===track&&reportView?.status==='connected'&&['FOUND','NO_REPORTS'].includes(o?.status)&&o.projectId===projectId&&o.track===track&&s.source?.repositoryId===o.source?.repositoryId;
 if(!valid||o.runs.some(r=>r.report.projectId!==projectId||r.report.track!==track||r.report.repositoryId!==s.source.repositoryId))return{status:'unconfirmed',runs:[],events:[],files:[],signature:null};
 const runs=o.runs.map(row=>({presentation:repositoryRunPresentation(row.report,{now}),report:row.report,source:row.source}));
 const events=runs.flatMap(row=>row.report.events.map(event=>({key:JSON.stringify([projectId,track,row.report.runId,event.id,event.sequence]),runId:row.report.runId,agentName:row.report.agentName,featureTitle:row.report.featureTitle,event,source:row.source}))).sort((a,b)=>Date.parse(a.event.eventAt)-Date.parse(b.event.eventAt)||a.runId.localeCompare(b.runId)||a.event.sequence-b.event.sequence||a.key.localeCompare(b.key));
 const files=runs.filter(row=>row.report.schemaVersion===REPORT_VERSION_V3).flatMap(({report})=>report.activityPaths.map(path=>{const history=events.filter(row=>row.runId===report.runId&&row.event.activity?.path===path),latest=history.at(-1);return{key:JSON.stringify([projectId,track,report.runId,path]),qualification:'AGENT_TASK_MANIFEST_METADATA_ONLY',runId:report.runId,path,history,latest:latest||null,freshness:!latest?'NOT_OBSERVED':now-Date.parse(latest.event.activity.observedAt)>300000?'DATED_OLDER_THAN_5_MINUTES':'DATED_WITHIN_5_MINUTES'};}));
 return{status:runs.length?'confirmed':'empty',runs,events,files,signature:JSON.stringify(events.map(e=>[e.key,e.event]))};
}
export function createWorkbenchTransitions(){const scopes=new Map();return{observe(scope,events){const keys=new Set(events.map(e=>e.key)),previous=scopes.get(scope);scopes.set(scope,new Set([...(previous||[]),...keys]));return previous?events.filter(e=>!previous.has(e.key)).map(e=>e.key):[];},clear(){scopes.clear();}};}
// Derived from validated declarations; independent observations remain absent.
export const reportDeliveryStatus=repositoryDeliveryStatus;
