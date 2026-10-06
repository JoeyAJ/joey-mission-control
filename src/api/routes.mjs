import {commandWorkspaceHealth} from '../operations/command-readouts.mjs';
import {candidate} from '../candidate.mjs';
import {bootstrapReadiness} from '../product/model.mjs';
import {productView} from '../product/view.mjs';
import {manifest} from '../agent/control.mjs';
import {release} from '../release.mjs';
export const securityHeaders={'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'};

export function safeId(raw){let id;try{id=decodeURIComponent(raw);}catch{throw Object.assign(new Error('Bad identifier'),{status:400});}if(!/^[A-Za-z0-9_-]+$/.test(id))throw Object.assign(new Error('Bad identifier'),{status:400});return id;}
export async function readJson(req,limit=65536){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Object.assign(new Error('JSON content type required'),{status:415});let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('Body too large'),{status:413});chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('JSON object required'),{status:400});return body;}

export function createRouter(deps){return async(req,res,url)=>{
  const method=req.method,pathname=url.pathname;
  if(method==='GET'&&pathname==='/api/health')return{status:200,body:{ok:true,loopback:true,...release,...candidate,localWriteSupport:true,commandWorkspace:commandWorkspaceHealth}};
  if(method==='GET'&&pathname==='/api/asset-catalog'&&deps.getAssetCatalog)return{status:200,body:await deps.getAssetCatalog()};
  if(pathname==='/api/proposals'&&deps.proposals){await deps.ready;if(method==='GET')return{status:200,body:await deps.proposals.list()};if(method==='POST')return{status:201,body:await deps.proposals.create(await readJson(req))};}
  if(method==='GET'&&pathname==='/api/state')return{status:200,body:await deps.getState()};
  if(method==='GET'&&pathname==='/api/workspaces')return{status:200,body:await deps.getWorkspaces()};
  if(method==='GET'&&pathname==='/api/handoffs')return{status:200,body:await deps.getHandoffs()};
  if(method==='GET'&&pathname==='/api/inbox')return{status:200,body:await deps.getInbox()};
  async function normalized(){const state=await deps.getState(),ledger=deps.missions?await deps.missions.list():[],owners=deps.products?await deps.products.list():[];return Promise.all(state.projects.map(async p=>{const m=manifest(p,{handoff:state.handoffs?.byEntity?.[p.id],handoffs:[state.handoffs?.globalLatest,...(state.handoffs?.history||[])].filter(Boolean),history:ledger.filter(v=>v.project_id===p.id),generatedAt:state.generatedAt});if(deps.operationalView)m.operations=await deps.operationalView(p,m.runtime,state);m.product=productView(p,{owner:owners.find(o=>o.projectId===p.id),document:state.productDocuments?.[p.id],runtime:m.runtime});if(deps.projectStates)m.canonicalState=await deps.projectStates.getProject(m.product,owners.find(o=>o.projectId===p.id));if(deps.phaseView)m.phase=await deps.phaseView(p,m,state);if(deps.commandReadout)m.sourceReadout=deps.commandReadout(p.id);return m;}));}
  if(method==='GET'&&pathname==='/api/projects')return{status:200,body:await normalized()};
  if(method==='GET'&&pathname==='/api/missions')return{status:200,body:await deps.missions.list()};
  if(method==='POST'&&pathname==='/api/missions'){const input=await readJson(req);if(!await deps.getProject(input.project_id))throw Object.assign(new Error('Project not found'),{status:404});const owner=(await deps.products?.list()||[]).find(v=>v.projectId===input.project_id);if(owner&&(owner.lifecycle==='IDEA'||owner.decisions.some(v=>v.lifecycle==='IDEA'))&&!bootstrapReadiness(owner).ready)throw Object.assign(new Error('Formal development bootstrap incomplete'),{status:409});if(owner?.lifecycle==='IDEA')throw Object.assign(new Error('Formalize the idea before Mission #001'),{status:409});return{status:201,body:await deps.missions.create(input)};}
  let match;
  if((match=pathname.match(/^\/api\/projects\/([^/]+)\/project-state$/))){await deps.ready;const id=safeId(match[1]);if(!deps.projectStates||!await deps.getProject(id))throw Object.assign(new Error('Project state not found'),{status:404});if(method==='POST')return{status:200,body:await deps.projectStates.mutate(id,await readJson(req))};if(method==='GET'){const entry=(await normalized()).find(p=>p.project_id===id);return{status:200,body:entry.canonicalState};}}
  if(method==='POST'&&(match=pathname.match(/^\/api\/projects\/([^/]+)\/(owner-proposals|owner-decisions)$/))){await deps.ready;const id=safeId(match[1]);if(!await deps.getProject(id))throw Object.assign(new Error('Project not found'),{status:404});const input=await readJson(req);return{status:match[2]==='owner-proposals'?201:200,body:await (match[2]==='owner-proposals'?deps.products.proposal(id,input):deps.products.decide(id,input,{canonicalSeed:deps.projectStates?(await normalized()).find(p=>p.project_id===id)?.canonicalState:undefined}))};}
  if(method==='PATCH'&&(match=pathname.match(/^\/api\/missions\/([^/]+)$/)))return{status:200,body:await deps.missions.update(safeId(match[1]),await readJson(req))};
  if(method==='GET'&&(match=pathname.match(/^\/api\/projects\/([^/]+)\/(state|manifest|runtime|activity|product)$/))){const m=(await normalized()).find(p=>p.project_id===safeId(match[1]));if(!m)throw Object.assign(new Error('Project not found'),{status:404});return{status:200,body:match[2]==='runtime'?m.runtime:match[2]==='activity'?m.activity:match[2]==='product'?m.product:m};}

  if(method==='GET'&&(match=pathname.match(/^\/api\/projects\/([^/]+)\/continue$/))){
    const raw=url.searchParams.get('expectedContext')||'{}';
    if(raw.length>12000)throw Object.assign(new Error('Inspection context too large'),{status:413});
    let context;try{context=JSON.parse(raw);}catch{throw Object.assign(new Error('Invalid inspection context'),{status:400});}
    if(!context||typeof context!=='object'||Array.isArray(context))throw Object.assign(new Error('Inspection context object required'),{status:400});
    return{status:200,body:await deps.continueProject(safeId(match[1]),context)};
  }
  if(method==='PATCH'&&(match=pathname.match(/^\/api\/inbox\/([^/]+)$/))){
    const body=await readJson(req);
    if(Object.keys(body).some(key=>!['state','expectedState'].includes(key))||typeof body.state!=='string'||typeof body.expectedState!=='string')throw Object.assign(new Error('Inbox state and expectedState required; other fields forbidden'),{status:400});
    return{status:200,body:await deps.transitionInbox(safeId(match[1]),body.state,body.expectedState)};
  }
  if(method==='GET'&&(match=pathname.match(/^\/api\/projects\/(.+)$/))){const project=await deps.getProject(safeId(match[1]));if(!project)throw Object.assign(new Error('Project not found'),{status:404});return{status:200,body:project};}
  if(method==='POST'&&pathname==='/api/inbox')return{status:201,body:await deps.createInbox(await readJson(req))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/inbox\/([^/]+)\/interpret$/)))return{status:200,body:await deps.interpretInbox(safeId(match[1]))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/inbox\/([^/]+)\/confirm$/)))return{status:200,body:await deps.confirmInbox(safeId(match[1]),await readJson(req))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/workspaces\/([^/]+)\/recheck$/)))return{status:200,body:await deps.recheck(safeId(match[1]))};
  if(method==='POST'&&(match=pathname.match(/^\/api\/projects\/([^/]+)\/continue$/))){const body=await readJson(req);return{status:200,body:await deps.continueProject(safeId(match[1]),body.expectedContext||{})};}
  if(method==='POST'&&pathname==='/api/sessions')return{status:201,body:await deps.createSession(await readJson(req))};
  if(method==='PATCH'&&(match=pathname.match(/^\/api\/sessions\/([^/]+)$/)))return{status:200,body:await deps.updateSession(safeId(match[1]),await readJson(req))};
  return null;
};}
