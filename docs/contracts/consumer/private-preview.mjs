// Explicit loopback-only private read-only QA; not a production deployment entry.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createApp} from '../../../src/server.mjs';
import {productionResponse} from '../../../api/index.mjs';
import {securityHeaders} from '../../../src/api/routes.mjs';
import {createCandidateObserver} from '../candidate-observer.mjs';
import {readStageChanges} from './stage-changes.mjs';
import {readPrivateRestore} from './private-restore.mjs';
export function privateProjects(publicProjects,restored){return publicProjects.map(m=>{
 const v=restored.views.find(v=>v.projectId===m.project_id);
 return {...m,product:{...m.product,...v.projectView,name:m.product.name},canonicalState:v.ownerCanonicalState||m.canonicalState,
  privateSource:{claims:Object.fromEntries(Object.entries(v.claimEvidence).map(([key,claim])=>[key,{...structuredClone(claim),eventTime:v.claimSources?.[key]?.asOf??(key==='lastConfirmedCompletion'?v.lastConfirmed.at:null)}])),stage:v.phase.stage,completion:v.lastConfirmed.completion,eventTime:v.lastConfirmed.at,stageEventTime:v.phase.stageDate,
   purpose:v.projectView.documentedPurpose,nextAction:v.claimEvidence.nextAction.value,blockerApproval:v.claimEvidence.blockerApproval.value,
   verificationStatus:v.phase.stageVerificationStatus,sourceRevision:v.sourceRevision,sourceTimestamp:v.sourceTimestamp,
   extractedAt:v.extractedAt,readAt:v.readAt,baseline:v.baseline,sourceRefs:v.claimEvidence.stage.sourceRefs,
   actor:v.lastConfirmed.actor,model:v.lastConfirmed.model,identityReason:v.lastConfirmed.actorMissingReason},
  runtime:{...m.runtime,currentAgent:null,currentModel:null,currentMission:null},privateReadonlyRestore:true,privateRecordedMissions:(v.ownerCanonicalState?.missions||[]).map(mission=>({id:mission.id,title:mission.title,status:mission.status,sourceRefs:[...mission.sourceRefs],dependencies:[...mission.dependencies],createdAt:mission.createdAt,updatedAt:mission.updatedAt,ownerRevision:v.ownerCanonicalState.metadata.revision,actor:null,model:null}))};
});}
export function createPrivatePreview({root,observer=null,clock=()=>new Date().toISOString()}){
 const staticHandler=createApp({});
 return async(req,res)=>{
  const send=(status,body)=>{res.writeHead(status,{...securityHeaders,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  const host=req.headers.host||'',origin=req.headers.origin;
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)||origin&&origin!=='http://'+host)return send(403,{error:'Private loopback boundary required'});
  if(req.method!=='GET')return send(403,{error:'Private restore is read-only; writer cutover not applied'});
  const u=new URL(req.url,'http://127.0.0.1');
  if(!u.pathname.startsWith('/api/'))return staticHandler(req,res);
  try{
   const route=u.pathname.slice(5),url=new URL('https://fixture/api/index?route='+route);
   if(route==='stage-changes')return send(200,await readStageChanges({readAt:clock()}));
   if(route==='observer'&&observer)return send(200,await observer.inspect(clock()));
   if(route==='projects'){const {restored}=await readPrivateRestore({root,readAt:clock()});return send(200,privateProjects(productionResponse('GET',url).body,restored));}
   if(route==='health'){const base=productionResponse('GET',url).body;return send(200,{...base,mode:'private_readonly_restore',privateReadonlyRestore:true,candidateObserver:!!observer,localWriteSupport:false});}
   // Only already-safe public routes remain available; no private archive/path API.
   const result=productionResponse('GET',url);return send(result.status,result.body);
  }catch{return send(503,{error:'Private restore source unavailable or integrity invalid'});}
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=process.argv[2],port=Number(process.argv[3]||4354);
 await readPrivateRestore({root,readAt:new Date().toISOString()});
 const observer=process.argv[4]?await createCandidateObserver({root:process.argv[4],qualification:process.argv[5]||'UNVERIFIED_IMPORTED_JSONL'}):null;
 http.createServer(createPrivatePreview({root,observer})).listen(port,'127.0.0.1',()=>console.log('Private read-only QA listening on loopback'));
}
