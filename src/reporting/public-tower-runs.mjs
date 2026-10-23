// Guest (signed-out) Control Tower: read-only live run summaries, server-side sanitized.
// Only display fields leave the server: no repository ids, refs, commit/blob hashes of report files,
// file paths, activity, delivery evidence, test details, tokens or Owner state.
import {repositoryRunConfiguration,readRepositoryRuns} from './repository-run-source.mjs';
import {createGitHubRepositoryRunReader} from './repository-run-server.mjs';
import {joeyRunSummary} from './joey-run-summary.mjs';
const REPO=/git@github\.com:[^\s"'`)]+|https?:\/\/github\.com\/[^\s"'`)]+/g;
const SECRET=/gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer\s+\S+/g;
const text=v=>typeof v==='string'?v.replace(REPO,'[repository withheld]').replace(SECRET,'[withheld]').slice(0,600):null;
const STATES=['running','blocked','completed','failed','unconfirmed'];
const task=t=>({runId:text(t.runId),agentName:text(t.agentName),featureTitle:text(t.featureTitle),currentState:STATES.includes(t.currentState)?t.currentState:'unconfirmed',reportedState:STATES.includes(t.reportedState)?t.reportedState:'unconfirmed',eventAt:text(t.eventAt),expiresAt:text(t.expiresAt),summary:text(t.summary)});
export function publicTowerSummary(summary){
 const tasks=(summary?.tasks||[]).map(task),active=tasks.filter(t=>['running','blocked'].includes(t.currentState));
 return {qualification:'PUBLIC_READ_ONLY_RUN_SUMMARY',status:['unconfirmed','stale','active','reported','missing'].includes(summary?.status)?summary.status:'unconfirmed',tasks,active,blockers:active.filter(t=>t.currentState==='blocked'),events:(summary?.events||[]).map(e=>({runId:text(e.runId),sequence:Number.isInteger(e.sequence)?e.sequence:null,kind:text(e.kind),eventAt:text(e.eventAt),summary:text(e.summary),activity:null}))};
}
const cache=new Map(),TTL=60000;
export function createPublicTowerRunServer({environment=process.env,fetchImpl=globalThis.fetch,now=Date.now,read=null}={}){
 return Object.freeze({async handle(req,{project}={}){
  const headers={'Cache-Control':'public, max-age=30'};
  if(req.method!=='GET')return {status:405,body:{error:'READ_ONLY_ENDPOINT'},headers};
  if(typeof project!=='string'||!/^[A-Z][A-Z0-9_]{1,63}$/.test(project))return {status:400,body:{error:'PROJECT_REQUIRED'},headers};
  let configuration;try{configuration=repositoryRunConfiguration(project,{track:'BASELINE'});}catch{return {status:404,body:{error:'PROJECT_NOT_PUBLIC'},headers};}
  const hit=cache.get(project);if(hit&&hit.at+TTL>now())return {status:200,body:hit.body,headers};
  try{const observation=read?await read(configuration):await readRepositoryRuns({configuration,reader:createGitHubRepositoryRunReader({credential:environment.MC_GITHUB_READ_TOKEN,fetchImpl,configuration,now}),now});
   const body={schemaVersion:1,projectId:project,readAt:new Date(now()).toISOString(),runs:publicTowerSummary(joeyRunSummary({view:{status:'connected',observation},projectId:project,sourceConfirmed:true,now:now()}))};
   cache.set(project,{at:now(),body});return {status:200,body,headers};
  }catch{return {status:503,body:{error:'PUBLIC_READ_UNAVAILABLE'},headers};}
 }});
}
