import {createHash} from 'node:crypto';
import {createRepositoryRun,runReportPath} from '../../src/reporting/repository-run-contract.mjs';
import {repositoryRunConfiguration} from '../../src/reporting/repository-run-source.mjs';
import {createGitHubRepositoryRunReader,createRepositoryRunServer} from '../../src/reporting/repository-run-server.mjs';
export const CAPACITY_OWNER='11111111-1111-4111-8111-111111111111';
export function capacityFixture(count=21){
 const configuration=repositoryRunConfiguration('NEXAEON'),time=Date.now()-60000,sha='a'.repeat(40),cache=new Map(),files=new Map(),calls=[];
 let clock=Date.now(),head=sha,mode=null,reads=0,credential='SYNTHETIC_CAPACITY_CONTENTS_READ_000';
 const actor=()=>({subject:CAPACITY_OWNER,status:'authenticated',role:'OWNER',aal:'aal2',verified:true,sessionActive:true,memberActive:true,identityProject:'NEXAEON',projects:['NEXAEON'],expiresAt:clock+60000});
 const set=(path,report)=>{const content=JSON.stringify(report),bytes=Buffer.from(content),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');files.set(path,{report,content,bytes,blob});};
 for(let i=0;i<count;i++){const report=createRepositoryRun({scope:{...configuration.entry,baselineSha:sha,entryDigest:'c'.repeat(64)},runId:'capacity-'+String(i+1).padStart(2,'0'),taskId:'capacity-task-'+(i+1),agentName:'Synthetic Capacity Agent',featureTitle:'Synthetic capacity task '+(i+1),workRef:'feature/synthetic',eventId:'start',summary:'Synthetic startup',now:time+i});set(runReportPath(report.runId,i<20?1:2),report);}
 const response=(v,status=200)=>new Response(JSON.stringify(v),{status});
 const fetchImpl=async(url,options)=>{const u=new URL(url);calls.push({path:u.pathname,ref:u.searchParams.get('ref')});if(u.origin!=='https://api.github.com'||options.redirect!=='error'||options.headers.Authorization!=='Bearer '+credential)throw Error('SYNTHETIC_SCOPE_INVALID');
  if(u.pathname.endsWith('/git/ref/heads/mc/progress'))return mode==='ref-outage'?response({},500):mode==='denied'?response({},403):response({object:{type:'commit',sha:head}});
  if(u.searchParams.get('ref')!==head)throw Error('SYNTHETIC_PIN_INVALID');const path=decodeURIComponent(u.pathname.split('/contents/')[1]);
  if(path==='.mission-control/runs'||path==='.mission-control/runs-page-2'){if(path.endsWith('page-2')&&mode==='page-outage')return response({},500);if(path.endsWith('page-2')&&mode==='page-denied')return response({},403);const rows=[...files].filter(([p])=>p.startsWith(path+'/')).map(([p,v])=>({type:'file',name:p.split('/').at(-1),path:p,sha:v.blob,size:v.bytes.length}));return rows.length?response(rows):response({},404);}
  reads++;const value=files.get(path);if(!value)return response({},404);return response({type:'file',encoding:'base64',sha:value.blob,size:value.bytes.length,content:mode==='bad-blob'?'!':value.bytes.toString('base64')});
 };
 const reader=()=>createGitHubRepositoryRunReader({credential,configuration,fetchImpl,cache,now:()=>clock});
 const server=()=>createRepositoryRunServer({configuration,repositoryReader:reader(),verifyOwner:async()=>actor(),ownerSubject:CAPACITY_OWNER,now:()=>clock});
 const reply=async()=>{const r=await server().handle({method:'GET',headers:{authorization:'Bearer SYNTHETIC_CAPACITY_OWNER_000'}});if(r.status!==200)throw Error('SYNTHETIC_PRIVATE_DENIED');return r.body;};
 return {configuration,time,sha,cache,files,calls,set,reader,reply,actor,reads:()=>reads,now:()=>clock,advance:n=>clock+=n,head:v=>head=v,mode:v=>mode=v,credential:v=>credential=v};
}
