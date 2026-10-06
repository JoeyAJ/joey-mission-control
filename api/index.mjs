import {productView} from '../src/product/view.mjs';
import {manifest} from '../src/agent/control.mjs';
import fs from 'node:fs/promises';
import {securityHeaders,safeId} from '../src/api/routes.mjs';
import {release} from '../src/release.mjs';
import {composeContinue} from '../src/continue/continue-composer.mjs';
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url),'utf8'));
const projectStates=JSON.parse(await fs.readFile(new URL('../deployment/project-state.v03b.json',import.meta.url),'utf8'));
const projectManifest=p=>{const m=manifest(p,{handoff:snapshot.handoffs.byEntity[p.id],handoffs:[snapshot.handoffs.globalLatest,...snapshot.handoffs.history].filter(Boolean),generatedAt:snapshot.generatedAt,publicRead:true});m.product=productView(p,{publicRead:true});m.canonicalState=projectStates.projects.find(s=>s.id===p.id);m.product.documentedPurpose=m.canonicalState?.missionStatement||m.product.documentedPurpose;return m;};
export function productionResponse(method,url){
 if(method!=='GET')return{status:403,body:{error:'Public production is read-only. Use authorized local Mission Control for writes.'}};
 const route=url.searchParams.get('route')||'';
 if(route==='health')return{status:200,body:{ok:true,...release,mode:'verified_release_snapshot',readOnly:true,snapshotGeneratedAt:snapshot.generatedAt}};
 if(route==='state')return{status:200,body:snapshot};
 if(route==='projects')return{status:200,body:snapshot.projects.map(p=>projectManifest(p))};
 const canonical=route.match(/^projects\/([^/]+)\/project-state$/);if(canonical){const state=projectStates.projects.find(s=>s.id===safeId(canonical[1]));return state?{status:200,body:state}:{status:404,body:{error:'Project not found'}};}
 const normalized=route.match(/^projects\/([^/]+)\/(state|manifest|runtime|activity|product)$/);
 if(normalized){const p=snapshot.projects.find(p=>p.id===safeId(normalized[1]));return p?{status:200,body:normalized[2]==='runtime'?projectManifest(p).runtime:normalized[2]==='activity'?projectManifest(p).activity:normalized[2]==='product'?projectManifest(p).product:projectManifest(p)}:{status:404,body:{error:'Project not found'}};}
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
