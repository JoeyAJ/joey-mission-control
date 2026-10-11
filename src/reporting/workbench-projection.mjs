import {repositoryDeliveryStatus} from './delivery-evidence.mjs';
import {repositoryRunPresentation} from './repository-run-contract.mjs';
// Source/report conjunction only. No summary parsing, executable adapter or new data transport.
export function workbenchProjection({sourceView,reportView,projectId,track='BASELINE',now=Date.now()}={}){
 const s=sourceView?.observation,o=reportView?.observation;
 const valid=sourceView?.status==='connected'&&s?.status==='FOUND'&&s.projectId===projectId&&(s.track||'BASELINE')===track&&reportView?.status==='connected'&&['FOUND','NO_REPORTS'].includes(o?.status)&&o.projectId===projectId&&o.track===track&&s.source?.repositoryId===o.source?.repositoryId;
 if(!valid||o.runs.some(r=>r.report.projectId!==projectId||r.report.track!==track||r.report.repositoryId!==s.source.repositoryId))return{status:'unconfirmed',runs:[],events:[],signature:null};
 const runs=o.runs.map(row=>({presentation:repositoryRunPresentation(row.report,{now}),report:row.report,source:row.source}));
 const events=runs.flatMap(row=>row.report.events.map(event=>({key:JSON.stringify([projectId,track,row.report.runId,event.id,event.sequence]),runId:row.report.runId,agentName:row.report.agentName,featureTitle:row.report.featureTitle,event,source:row.source}))).sort((a,b)=>Date.parse(a.event.eventAt)-Date.parse(b.event.eventAt)||a.runId.localeCompare(b.runId)||a.event.sequence-b.event.sequence||a.key.localeCompare(b.key));
 return{status:runs.length?'confirmed':'empty',runs,events,signature:JSON.stringify(events.map(e=>[e.key,e.event]))};
}
export function createWorkbenchTransitions(){const scopes=new Map();return{observe(scope,events){const keys=new Set(events.map(e=>e.key)),previous=scopes.get(scope);scopes.set(scope,new Set([...(previous||[]),...keys]));return previous?events.filter(e=>!previous.has(e.key)).map(e=>e.key):[];},clear(){scopes.clear();}};}
// Derived from validated declarations; independent observations remain absent.
export const reportDeliveryStatus=repositoryDeliveryStatus;
