// Bounded server-to-server export. A completed Agent report is never product acceptance.
import {Buffer} from 'node:buffer';
import {timingSafeEqual} from 'node:crypto';
import {repositoryRunConfiguration,readRepositoryRuns} from './repository-run-source.mjs';
import {createGitHubRepositoryRunReader} from './repository-run-server.mjs';
import {appChecksConfigured,createAppChecksCredential} from './github-app-checks-credential.mjs';

export const IMPACT_PROJECTS=Object.freeze({NEXAEON:{name:'NexAeon',slug:'nexaeon-web',url:'https://nexaeon-web.vercel.app/'},MISSION_CONTROL:{name:'Mission Control',slug:'joey-mission-control',url:'https://joey-mission-control-one.vercel.app/'},WOOSONG_BUDDY:{name:'Woosong Buddy',slug:'woosong-buddy',url:'https://woosong-buddy-app.vercel.app/'},JOEY_ASSET_SYSTEM:{name:'Joey Asset Studio',slug:'joey-asset-studio',url:'https://joey-asset-studio.vercel.app/'},NAMYOUNG_WEB3D:{name:'Namyoung Web3D',slug:'namyoung-web3d',url:'https://namyoung-web3d.vercel.app/'}});
export function exportMilestone(projectId,observation,ci){
 const policy=IMPACT_PROJECTS[projectId];
 if(!policy||observation.status!=='FOUND'||ci?.qualification!=='GITHUB_ACTIONS_EXACT_COMMIT'||!ci.checks||!Number.isFinite(Date.parse(ci.checkedAt)))return null;
 const rows=observation.runs.filter(r=>r.report.projectId===projectId&&r.report.track==='BASELINE'&&r.report.events.at(-1)?.kind==='completed').sort((a,b)=>Date.parse(b.report.events.at(-1).eventAt)-Date.parse(a.report.events.at(-1).eventAt));
 const event=rows[0]?.report.events.at(-1),result=event?.result;
 if(!result||!result.tests.length||result.tests.some(t=>t.outcome!=='PASS')||ci.codeSha!==result.codeSha)return null;
 // No feature titles, summaries, filenames, repository identity, next steps, private evidence or activity.
 return {schemaVersion:'mc.impact.v1',projectId,name:policy.name,slug:policy.slug,url:policy.url,
  version:{codeSha:ci.codeSha,checkedAt:ci.checkedAt,checks:ci.checks,qualification:ci.qualification},
  productAccepted:false,academicClaims:false};
}
export function createImpactExportServer({environment=process.env,fetchImpl=globalThis.fetch,read=null,verify=null,now=Date.now}={}){
 const appCredential=createAppChecksCredential({environment,fetchImpl,now,repositories:Object.keys(IMPACT_PROJECTS).map(id=>repositoryRunConfiguration(id,{track:'BASELINE'}).repositoryId)});
 return {async handle(req,{project}={}){
  const headers={'Cache-Control':'private, no-store','CDN-Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
  const result=(status,body)=>({status,body,headers});
  if(req.method!=='GET')return result(405,{error:'READ_ONLY_ENDPOINT'});
  const secret=environment.NEXAEON_IMPACT_SYNC_SECRET;
  if(!secret||secret.length<32)return result(503,{error:'IMPACT_CONNECTION_NOT_CONFIGURED'});
  const a=Buffer.from(req.headers?.authorization||''),b=Buffer.from('Bearer '+secret);
  if(a.length!==b.length||!timingSafeEqual(a,b))return result(401,{error:'AUTH_REQUIRED'});
  if(project==null)return result(200,{schemaVersion:'mc.impact-catalog.v1',projects:Object.entries(IMPACT_PROJECTS).map(([projectId,policy])=>({projectId,...policy}))});
  if(!Object.hasOwn(IMPACT_PROJECTS,project||''))return result(404,{error:'IMPACT_PROJECT_NOT_ALLOWED'});
  try{
   const config=repositoryRunConfiguration(project,{track:'BASELINE'});
   const observation=read?await read(config):await readRepositoryRuns({configuration:config,reader:createGitHubRepositoryRunReader({credential:environment.MC_GITHUB_READ_TOKEN,fetchImpl,configuration:config,now}),now});
   if(observation.status!=='FOUND')return result(409,{error:'IMPACT_SOURCE_UNCONFIRMED'});
   const rows=observation.runs.filter(r=>r.report.events.at(-1)?.kind==='completed').sort((a,b)=>Date.parse(b.report.events.at(-1).eventAt)-Date.parse(a.report.events.at(-1).eventAt));
   const sha=rows[0]?.report.events.at(-1)?.result?.codeSha;
   if(!/^[a-f0-9]{40}$/.test(sha||''))return result(409,{error:'IMPACT_MILESTONE_UNAVAILABLE'});
   let ci;
   if(verify)ci=await verify(config,sha);
   else{
    const url=`https://api.github.com/repos/${config.repositoryId}/commits/${sha}/check-runs?per_page=100`;
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    const useApp=appChecksConfigured(environment);
    let credential=useApp?await appCredential.get(config.repositoryId):environment.MC_GITHUB_READ_TOKEN;
    const request=()=>fetchImpl(url,{headers:{...headers,Authorization:'Bearer '+credential},redirect:'error',signal:AbortSignal.timeout(10000)});
    let response=await request();
    // A revoked/expired token gets exactly one refresh. Permission failures never trigger retries or legacy fallback.
    if(useApp&&response.status===401){appCredential.invalidate(config.repositoryId,credential);credential=await appCredential.get(config.repositoryId);response=await request();}
    const limited=r=>r.status===429||r.headers?.get?.('x-ratelimit-remaining')==='0';
    if(!useApp&&!response.ok&&[401,403,404].includes(response.status)){
     // Contents-read credentials need not have Checks permission. A public-only fallback grants no private access.
     const metadata=await fetchImpl('https://api.github.com/repos/'+config.repositoryId,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
     const identity=metadata.ok?await metadata.json():null;
     if(!metadata.ok&&limited(metadata))return result(503,{error:'IMPACT_CI_RATE_LIMITED',upstreamStatus:metadata.status,phase:'public-metadata'});
     if(identity?.full_name===config.repositoryId&&identity.private===false&&identity.visibility==='public'&&identity.archived===false&&identity.disabled===false)
      response=await fetchImpl(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
    }
    if(!response.ok)return result(503,{error:limited(response)?'IMPACT_CI_RATE_LIMITED':[401,403,404].includes(response.status)?'IMPACT_CI_READ_ACCESS_REQUIRED':'IMPACT_CI_READ_UNAVAILABLE',upstreamStatus:response.status,phase:'checks'});
    const payload=await response.json();
    const checks=payload.check_runs?.filter(c=>c.app?.slug==='github-actions');
    // Fail closed for pagination, pending/failing checks and an empty CI result.
    if(!Array.isArray(checks)||!checks.length||payload.total_count>100||checks.some(c=>c.head_sha!==sha||c.status!=='completed'||c.conclusion!=='success'))return result(409,{error:'IMPACT_CI_NOT_VERIFIED'});
    ci={qualification:'GITHUB_ACTIONS_EXACT_COMMIT',codeSha:sha,checks:checks.length,checkedAt:new Date(now()).toISOString()};
   }
   const item=exportMilestone(project,observation,ci);
   return item?result(200,{item}):result(409,{error:'IMPACT_MILESTONE_UNAVAILABLE'});
  }catch(error){return result(503,error.appCredential?{error:error.code,phase:error.phase,...(error.upstreamStatus?{upstreamStatus:error.upstreamStatus}:{})}:{error:'IMPACT_SOURCE_UNAVAILABLE'});}
 }};
}
