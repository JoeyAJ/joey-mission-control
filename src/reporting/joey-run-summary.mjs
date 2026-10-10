import {repositoryRunPresentation} from './repository-run-contract.mjs';
// Only the currently verified scope contributes; historical/outage rows never imply live work.
export function joeyRunSummary({view,projectId,track='BASELINE',sourceConfirmed=false,now=Date.now()}={}){
 const empty={status:'unconfirmed',active:[],latestResult:null,blockers:[],expiresAt:null,decision:null};
 if(!sourceConfirmed||view?.status!=='connected'||!['FOUND','NO_REPORTS'].includes(view.observation?.status))return empty;
 const rows=view.observation.runs||[];
 if(rows.some(({report})=>report.projectId!==projectId||report.track!==track))return empty;
 const runs=rows.map(({report})=>repositoryRunPresentation(report,{now}));
 const active=runs.filter(p=>['running','blocked'].includes(p.currentState)).sort((a,b)=>a.runId.localeCompare(b.runId));
 const latestResult=runs.filter(p=>p.currentState==='completed'||p.currentState==='failed').sort((a,b)=>Date.parse(b.eventAt)-Date.parse(a.eventAt)||a.runId.localeCompare(b.runId))[0]||null;
 const expiry=active.map(p=>Date.parse(p.expiresAt)).filter(t=>t>now);
 return {status:runs.some(p=>p.currentState==='unconfirmed')?'stale':active.length?'active':latestResult?'reported':'missing',active,latestResult,blockers:active.filter(p=>p.currentState==='blocked'),expiresAt:expiry.length?Math.min(...expiry):null,decision:null};
}
