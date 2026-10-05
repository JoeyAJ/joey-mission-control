import fs from 'node:fs/promises';
import {securityHeaders,safeId} from '../src/api/routes.mjs';
import {release} from '../src/release.mjs';
import {composeContinue} from '../src/continue/continue-composer.mjs';
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url),'utf8'));
export function productionResponse(method,url){
 if(method!=='GET')return{status:403,body:{error:'Public production is read-only. Use authorized local Mission Control for writes.'}};
 const route=url.searchParams.get('route')||'';
 if(route==='health')return{status:200,body:{ok:true,...release,mode:'verified_release_snapshot',readOnly:true,snapshotGeneratedAt:snapshot.generatedAt}};
 if(route==='state')return{status:200,body:snapshot};
 if(route==='inbox')return{status:200,body:[]};
 if(route==='handoffs')return{status:200,body:snapshot.handoffs};
 if(route==='workspaces')return{status:200,body:snapshot.projects.map(p=>({id:p.id,name:p.name.value,...p.workspaceObservation,repository:p.where.repository.value,storedCommit:p.where.storedCommit.value,ai:p.lastAI.value,model:p.model.value,session:p.session}))};
 const match=route.match(/^projects\/([^/]+)(\/continue)?$/);
 if(match){const project=snapshot.projects.find(p=>p.id===safeId(match[1]));if(!project)return{status:404,body:{error:'Project not found'}};
  if(!match[2])return{status:200,body:project};
  return{status:200,body:composeContinue({project,handoff:snapshot.handoffs.byEntity[project.id],git:{error:'Public release snapshot cannot inspect live Mac repositories; perform continuation inspection on the authorized Local Master.'},currentFingerprints:project.sourceFingerprints})};
 }
 return{status:404,body:{error:'Not found'}};
}
export default function handler(req,res){
 try{const result=productionResponse(req.method,new URL(req.url,'https://mission-control.invalid'));res.writeHead(result.status,{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(result.body));}
 catch(error){res.writeHead(error.status||500,{...securityHeaders,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:error.status?error.message:'Production request failed'}));}
}
