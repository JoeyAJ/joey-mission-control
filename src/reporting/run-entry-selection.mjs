import {workbenchProjection} from './workbench-projection.mjs';
const hash40=/^[a-f0-9]{40}$/,hash64=/^[a-f0-9]{64}$/;
// One navigation intent, retained only in memory. It grants no source/execution access.
export function createRunEntrySelection({sourceView,reportView,projectId,track='BASELINE',runId,ownerVerified=false,now=Date.now()}={}){
 if(!ownerVerified)return null;
 const projection=workbenchProjection({sourceView,reportView,projectId,track,now}),row=projection.runs.find(r=>r.report.runId===runId);
 if(!row||!hash40.test(row.source?.providerBlobId)||!hash64.test(row.source?.contentSha256))return null;
 let pending=Object.freeze({projectId,track,repositoryId:row.report.repositoryId,runId,providerBlobId:row.source.providerBlobId,contentSha256:row.source.contentSha256,sequence:row.report.events.at(-1).sequence,createdAt:now,expiresAt:now+30000});
 return Object.freeze({snapshot(){return pending;},cancel(){pending=null;},take({sourceView,reportView,projectId,track='BASELINE',ownerVerified=false,now=Date.now()}={}){
  const intent=pending;pending=null;if(!intent)return{status:'none',runId:null};
  const projection=workbenchProjection({sourceView,reportView,projectId,track,now}),row=projection.runs.find(r=>r.report.runId===intent.runId);
  const valid=ownerVerified&&now<intent.expiresAt&&projectId===intent.projectId&&track===intent.track&&row?.report.repositoryId===intent.repositoryId&&row.source.providerBlobId===intent.providerBlobId&&row.source.contentSha256===intent.contentSha256&&row.report.events.at(-1).sequence===intent.sequence&&Date.parse(sourceView?.observation?.source?.readAt)>=intent.createdAt&&Date.parse(row.source.readAt)>=intent.createdAt;
  return{status:valid?'applied':'rejected',runId:valid?intent.runId:null};
 }});
}
