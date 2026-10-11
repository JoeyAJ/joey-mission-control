import {repositoryDeliveryStatus} from './delivery-evidence.mjs';
import {repositoryRunPresentation} from './repository-run-contract.mjs';
// Only the currently verified scope contributes; historical/outage rows never imply live work.
export function joeyRunSummary({view,projectId,track='BASELINE',repositoryId=null,sourceConfirmed=false,now=Date.now()}={}){
 const empty={status:'unconfirmed',active:[],latestResult:null,blockers:[],expiresAt:null,decision:null,tasks:[],events:[]};
 if(!sourceConfirmed||view?.status!=='connected'||!['FOUND','NO_REPORTS'].includes(view.observation?.status))return empty;
 const rows=view.observation.runs||[];
 if(rows.some(({report})=>report.projectId!==projectId||report.track!==track||repositoryId!==null&&report.repositoryId!==repositoryId))return empty;
 const runs=rows.map(({report})=>{const p=repositoryRunPresentation(report,{now});return {...p,deliveryReadiness:repositoryDeliveryStatus(p)};});
 const active=runs.filter(p=>['running','blocked'].includes(p.currentState)).sort((a,b)=>a.runId.localeCompare(b.runId));
 const latestResult=runs.filter(p=>p.currentState==='completed'||p.currentState==='failed').sort((a,b)=>Date.parse(b.eventAt)-Date.parse(a.eventAt)||a.runId.localeCompare(b.runId))[0]||null;
 const expiry=active.map(p=>Date.parse(p.expiresAt)).filter(t=>t>now);
 const tasks=[...runs].sort((a,b)=>Date.parse(b.eventAt)-Date.parse(a.eventAt)||a.runId.localeCompare(b.runId));
 const events=rows.flatMap(({report})=>report.events.map(e=>({runId:report.runId,sequence:e.sequence,kind:e.kind,eventAt:e.eventAt,summary:e.summary,activity:e.activity?{action:e.activity.action,path:e.activity.path,observedAt:e.activity.observedAt}:null})));
 return {status:runs.some(p=>p.currentState==='unconfirmed')?'stale':active.length?'active':latestResult?'reported':'missing',active,latestResult,blockers:active.filter(p=>p.currentState==='blocked'),expiresAt:expiry.length?Math.min(...expiry):null,decision:null,tasks,events};
}
