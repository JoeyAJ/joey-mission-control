import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {createGitHubHandoffRepositoryReader} from '../src/continuity/remote-handoff-server.mjs';
import {createRemoteHandoffReader} from '../src/continuity/remote-handoff-reader.mjs';
import {renderPrivateRemoteHandoff} from '../src/continuity/remote-handoff-view.mjs';
import {readRemoteHandoff} from '../src/canonical/remote-handoff-adapter.mjs';
import {projectEntryReadConfiguration} from '../src/continuity/project-entry-read-allowlist.mjs';
import {readProjectEntrySource} from '../src/continuity/project-entry-source-adapter.mjs';
const projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'],OWNER='11111111-1111-4111-8111-111111111111',KEY='SYNTHETIC_GITHUB_READ_ONLY_000000',A='a'.repeat(40),B='b'.repeat(40),clock=Date.parse('2026-10-09T16:00:00Z');
const hash=s=>createHash('sha256').update(s).digest('hex'),json=(body,status=200)=>new Response(JSON.stringify(body),{status});
function fixture(projectId='NEXAEON',track='BASELINE'){
 const config=projectEntryReadConfiguration(projectId,{track}),calls=[];let head=A,failHead=null,missing=false,badBlob=false,deniedContext=false,unsupported=false,huge=false,content='# Verified synthetic entry\nNo structured handoff header.\n## Historical context\nExecuted by: Historical Agent';
 const fetchImpl=async(url,options)=>{const u=new URL(url);calls.push({url:u.href,options});assert.equal(u.origin,'https://api.github.com');assert.equal(options.headers.Authorization,'Bearer '+KEY);assert.equal(options.redirect,'error');assert(!options.method||options.method==='GET');
  const prefix='/repos/'+config.repositoryId;assert(u.pathname.startsWith(prefix+'/'));
  if(u.pathname.includes('/git/ref/')){assert.equal(decodeURIComponent(u.pathname),prefix+'/git/ref/heads/'+config.ref);if(failHead)return json({privateDetail:'SYNTHETIC_PRIVATE_TOKEN_DETAIL'},failHead);return json({object:{type:'commit',sha:head}});}
  const path=decodeURIComponent(u.pathname.slice((prefix+'/contents/').length));assert([config.path,...config.contextPaths].includes(path));assert([A,B].includes(u.searchParams.get('ref')));
  if(path===config.path&&missing)return json({},404);if(path!==config.path&&deniedContext)return json({},403);const bytes=Buffer.from(path===config.path?content:'# Synthetic context');return json({type:unsupported?'symlink':'file',size:huge?65537:bytes.length,encoding:'base64',content:bytes.toString('base64'),sha:badBlob?'0'.repeat(40):createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});
 };
 const repositoryReader=createGitHubHandoffRepositoryReader({credential:KEY,fetchImpl,configuration:config});
 return{config,calls,repositoryReader,options:{projectId,track,reader:repositoryReader,now:()=>clock},head:v=>head=v,failure:v=>failHead=v,missing:v=>missing=v,badBlob:v=>badBlob=v,deniedContext:v=>deniedContext=v,unsupported:v=>unsupported=v,huge:v=>huge=v,content:v=>content=v};
}
function consumer(f){let time=clock,active=true,id=0;const timers=new Map();const actor=()=>({status:'authenticated',subject:OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:active,memberActive:active,projects:[f.config.projectId],expiresAt:clock+300000});
 const reader=createRemoteHandoffReader({enabled:true,ownerSubject:OWNER,configuration:f.config,inspectCurrentOwner:async()=>actor(),sourceRead:()=>readProjectEntrySource({...f.options,now:()=>time}),digestText:async s=>hash(s),now:()=>time,setTimer:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},clearTimer:n=>timers.delete(n)});
 return{reader,timers,active:v=>active=v,time:v=>time=v,tick:async()=>{const [id,t]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];timers.delete(id);time=t.at;t.fn();for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));}};
}
class Node{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.textContent='';}append(...values){this.children.push(...values);}all(){return [this.textContent,...this.children.map(x=>x.all())].join('\n');}}
const doc={createElement:tag=>new Node(tag)};
test('existing transport and scheduler are reusable but MC handoff validation rejects actual README entry',async()=>{
 const f=fixture();await assert.rejects(readRemoteHandoff({configuration:f.config,reader:f.repositoryReader}),/UNCONFIGURED/);assert.equal(f.calls.length,0);
 assert.equal((await readProjectEntrySource(f.options)).status,'FOUND');assert(f.calls.every(c=>!c.url.includes('HANDOFF.md')));
});
test('only four default main entries and separately selected University candidate are allowed',async()=>{
 for(const p of projects){const c=projectEntryReadConfiguration(p);assert.equal(c.ref,'main');assert.equal(c.path,'README.md');assert.equal(c.legacyPath,null);assert(c.contextPaths.length<=4);}
 const c=projectEntryReadConfiguration('JOEY_ASSET_SYSTEM',{track:'UNIVERSITY_CANDIDATE'});assert.equal(c.ref,'migration/university-v04-portable');assert.equal(c.path,'DEVELOPMENT.md');assert(c.contextPaths.includes('modules/education/university-lifecycle/docs/HANDOFF.md'));assert.equal(c.entryQualification,'SEPARATE_CANDIDATE_JOEY_ACCEPTANCE_PENDING');
 for(const [p,track]of [['HANGEUL','BASELINE'],['MISSION_CONTROL','BASELINE'],['__proto__','BASELINE'],['NEXAEON','UNIVERSITY_CANDIDATE'],['WOOSONG_BUDDY','feat/pet-look-v3']])assert.throws(()=>projectEntryReadConfiguration(p,{track}),/SCOPE_DENIED/);
 const f=fixture(),c2=projectEntryReadConfiguration('NEXAEON');c2.contextPaths.push('.env');assert(!projectEntryReadConfiguration('NEXAEON').contextPaths.includes('.env'));
 await assert.rejects(f.repositoryReader.resolveRevision({repositoryId:'JoeyAJ/woosongbuddy',ref:'main'}));await assert.rejects(f.repositoryReader.resolveRevision({repositoryId:f.config.repositoryId,ref:'feature/core-interactions'}));await assert.rejects(f.repositoryReader.readFile({repositoryId:f.config.repositoryId,commitSha:A,path:'.env',maxBytes:65536}));assert.equal(f.calls.length,0);
});
test('all four plain entries are successful verified file reads without inventing handoff fields or acceptance',async()=>{
 for(const p of projects){const f=fixture(p),o=await readProjectEntrySource(f.options);assert.equal(o.status,'FOUND');assert.equal(o.primaryEntryStatus,'FOUND');assert.equal(o.primaryEntryPath,'README.md');assert.equal(o.source.documentTimestamp,null);assert.equal(o.source.contentSha256,hash(o.document));assert.equal(o.progress.lastAgent,null);assert.equal(o.progress.nextAction,null);assert.equal(o.progress.metadataStatus,'SIGNATURE_NOT_RECORDED');assert.equal(o.sourceReadIsProductAcceptance,false);assert.equal(o.currentAgent,null);assert.equal(o.executionAuthorized,false);assert(o.contextDocuments.every(d=>d.status==='FOUND'&&d.resolvedCommitSha===A&&d.contentSha256));assert.equal(f.calls.length,2+f.config.contextPaths.length);assert(!JSON.stringify(o).includes(KEY));}
});
test('one resolved revision pins all reads; each refresh resolves latest HEAD and rereads bytes',async()=>{
 const f=fixture(),original=f.repositoryReader;let resolved=0;const reader={resolveRevision:async args=>{resolved++;const r=await original.resolveRevision(args);f.head(B);return r;},readFile:args=>original.readFile(args)};
 const first=await readProjectEntrySource({...f.options,reader});assert.equal(first.source.resolvedCommitSha,A);assert.equal(resolved,1);assert(f.calls.filter(c=>c.url.includes('/contents/')).every(c=>new URL(c.url).searchParams.get('ref')===A));
 f.content('# New synthetic entry');const second=await readProjectEntrySource({...f.options,now:()=>clock+30000});assert.equal(second.source.resolvedCommitSha,B);assert.notEqual(second.source.contentSha256,first.source.contentSha256);assert.notEqual(second.source.readAt,first.source.readAt);
});
test('header identity/signature/time is explicit and never borrowed from historical or context sections',async()=>{
 const f=fixture('WOOSONG_BUDDY');f.content('# Entry\nProject: WOOSONG_BUDDY\nTimestamp: 2026-10-09T15:59:00Z\nLast Developer: Cursor\nStatus: COMPLETED\n## Previous history\nExecuted by: Claude Code');const o=await readProjectEntrySource(f.options);assert.equal(o.progress.lastAgent,'Cursor');assert.equal(o.source.documentTimestamp,'2026-10-09T15:59:00Z');assert.equal(o.currentAgent,null);assert.equal(o.sourceReadIsProductAcceptance,false);
 f.content('# Entry\nProject: NEXAEON\nLast Developer: Other Agent');assert.equal((await readProjectEntrySource(f.options)).status,'CONFLICT');f.content('# Entry\nTimestamp: 2026-10-10T00:00:00Z');assert.equal((await readProjectEntrySource(f.options)).errorCategory,'ENTRY_METADATA_CONFLICT');
 f.content('# Entry\nLast Developer: \nTimestamp: \n```text\nLast Developer: Example Agent\nTimestamp: 2026-10-10T00:00:00Z\n```\n## Historical context\nLast Developer: Historical Agent');const unsigned=await readProjectEntrySource(f.options);assert.equal(unsigned.status,'FOUND');assert.equal(unsigned.progress.lastAgent,null);assert.equal(unsigned.source.documentTimestamp,null);
});
test('missing actual entry renders its path; failures are sanitized and invalid file bytes are withheld',async()=>{
 const f=fixture();f.missing(true);let o=await readProjectEntrySource(f.options);assert.equal(o.status,'MISSING');assert.equal(o.document,null);const text=renderPrivateRemoteHandoff({doc,view:{configured:true,status:'connected',observation:o,lastAttemptAt:clock}}).all();assert(text.includes('README.md · 來源文件不存在'));assert(!text.includes('HANDOFF.md · 來源文件不存在'));assert(text.includes('ENTRY_FILE_MISSING'));assert(text.includes('lastAttemptAt'));
 f.missing(false);for(const status of [401,403,500]){f.failure(status);o=await readProjectEntrySource(f.options);assert.equal(o.status,status===500?'UNAVAILABLE':'ACCESS_DENIED');assert.equal(o.document,null);assert(!JSON.stringify(o).includes('SYNTHETIC_PRIVATE_TOKEN_DETAIL'));}f.failure(null);f.badBlob(true);assert.equal((await readProjectEntrySource(f.options)).status,'UNAVAILABLE');f.badBlob(false);f.unsupported(true);assert.equal((await readProjectEntrySource(f.options)).status,'UNSUPPORTED_TYPE');f.unsupported(false);f.huge(true);assert.equal((await readProjectEntrySource(f.options)).status,'TOO_LARGE');f.huge(false);f.deniedContext(true);o=await readProjectEntrySource(f.options);assert.equal(o.status,'ACCESS_DENIED');assert.equal(o.document,null);assert.deepEqual(o.contextDocuments,[]);
});
test('reused 30-second scheduler advances four fixture sources, preserves stale data on outage and purges on revocation',async()=>{
 for(const p of projects){const f=fixture(p),c=consumer(f);await c.reader.startAutoSync();assert.equal(c.reader.snapshot().nextReadAt,clock+30000);f.head(B);f.content('# Revised synthetic entry');await c.tick();assert.equal(c.reader.snapshot().observation.source.resolvedCommitSha,B);f.failure(500);await c.tick();const failed=c.reader.snapshot();assert.equal(failed.status,'unavailable');assert.equal(failed.lastConfirmed.source.resolvedCommitSha,B);assert(renderPrivateRemoteHandoff({doc,view:failed,locale:'en'}).all().includes('Last confirmed source'));f.failure(null);await c.tick();assert.equal(c.reader.snapshot().status,'connected');c.active(false);const before=f.calls.length;await c.tick();assert.equal(f.calls.length,before);assert.equal(c.reader.snapshot().status,'denied');assert.equal(c.reader.snapshot().lastConfirmed,null);assert.equal(c.timers.size,0);c.reader.dispose();}
});
test('University candidate stays separate, cancellation/expiry/invalidation suppress late private data',async()=>{
 const f=fixture('JOEY_ASSET_SYSTEM','UNIVERSITY_CANDIDATE'),o=await readProjectEntrySource(f.options);assert.equal(o.source.requestedRef,'migration/university-v04-portable');assert.equal(o.entryQualification,'SEPARATE_CANDIDATE_JOEY_ACCEPTANCE_PENDING');assert.equal(projectEntryReadConfiguration('JOEY_ASSET_SYSTEM').ref,'main');const abort=new AbortController();abort.abort();await assert.rejects(readProjectEntrySource({...f.options,signal:abort.signal}),/CANCELLED/);
 const c=consumer(f);await c.reader.startAutoSync();c.time(clock+300000);assert.equal(c.reader.snapshot().observation,null);assert.equal(c.timers.size,0);c.reader.dispose();
 const g=fixture(),s=consumer(g),original=g.repositoryReader;let release;g.options.reader={resolveRevision:args=>new Promise(r=>release=async()=>r(await original.resolveRevision(args))),readFile:args=>original.readFile(args)};const pending=s.reader.refresh();for(let i=0;i<10&&!release;i++)await new Promise(r=>setImmediate(r));s.reader.invalidate();await release();await pending;assert.equal(s.reader.snapshot().observation,null);assert.equal(s.timers.size,0);s.reader.dispose();
});
test('source configuration remains server-only and adapter has no ambient credentials',async()=>{
 const built=await build({entryPoints:['public/app.js'],bundle:true,format:'esm',write:false,metafile:true});assert(!Object.keys(built.metafile.inputs).some(p=>/project-entry-(source-adapter|read-allowlist)/.test(p)));
 const api=await readFile(new URL('../api/index.mjs',import.meta.url),'utf8');assert(!api.includes('project-entry-source-adapter'));const adapter=await readFile(new URL('../src/continuity/project-entry-source-adapter.mjs',import.meta.url),'utf8');assert(!adapter.includes('process.env'));assert(!adapter.includes('globalThis.fetch'));
});

test('normal deployment factory dispatches only approved scopes and verifies current Owner before and after source IO',async()=>{
 const {createDeploymentRemoteHandoffServer}=await import('../src/continuity/remote-handoff-server.mjs');
 for(const project of projects){const f=fixture(project),policy={origin:'https://auth.synthetic.invalid',publishableKey:'SYNTHETIC_PUBLIC',stageOrigin:'https://preview.synthetic.invalid',ownerSubject:OWNER};let active=true,checks=0;
  const fetchImpl=async(url,options)=>{const u=new URL(url);if(u.origin===policy.origin){assert.equal(options.headers.Authorization,'Bearer '+KEY);if(u.pathname==='/auth/v1/user')return json({id:OWNER,is_anonymous:false});checks++;assert.deepEqual(JSON.parse(options.body),{project:'NEXAEON'});return json({subject:OWNER,role:'OWNER',projectId:'NEXAEON',sessionActive:active,memberActive:active,aal:'aal2',expiresAt:clock+60000});}throw Error('UNEXPECTED_AUTH_FIXTURE_SCOPE');};
  // Exercise the public factory with its existing server-side transport, rather
  // than calling the thin adapter directly. Synthetic provider only.
  const upstream=async(url,options)=>{if(new URL(url).origin===policy.origin)return fetchImpl(url,options);const u=new URL(url);assert.equal(options.headers.Authorization,'Bearer '+KEY);f.calls.push({url:u.href,options});if(u.pathname.includes('/git/ref/'))return json({object:{type:'commit',sha:A}});assert.equal(u.searchParams.get('ref'),A);const path=decodeURIComponent(u.pathname.split('/contents/')[1]);assert([f.config.path,...f.config.contextPaths].includes(path));const bytes=Buffer.from('# Factory synthetic entry');return json({type:'file',size:bytes.length,encoding:'base64',content:bytes.toString('base64'),sha:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')});};
  const server=createDeploymentRemoteHandoffServer({environment:{MC_GITHUB_READ_TOKEN:KEY},fetchImpl:upstream,policy,now:()=>clock}),req={method:'GET',headers:{authorization:'Bearer '+KEY,origin:policy.stageOrigin}};
  assert.equal((await server.handle(req,{project,action:'config'})).body.configuration.path,'README.md');assert.equal(f.calls.length,0);const result=await server.handle(req,{project});assert.equal(result.status,200);assert.equal(result.body.observation.status,'FOUND');assert.equal(result.body.observation.progress.lastAgent,null);assert.equal(checks,3);assert.equal(f.calls.length,2+f.config.contextPaths.length);assert(!JSON.stringify(result).includes(KEY));
  const before=f.calls.length;active=false;assert.equal((await server.handle(req,{project})).status,403);assert.equal(f.calls.length,before);for(const [p,track]of [['HANGEUL','BASELINE'],[project,'feature/unapproved'],['__proto__','BASELINE']])assert.equal((await server.handle(req,{project:p,track})).status,403);assert.equal(f.calls.length,before);
 }
});

test('private endpoint authorization denial purges a prior confirmed source and stops retries',async()=>{
 const f=fixture(),c=consumer(f);await c.reader.startAutoSync();assert(c.reader.snapshot().lastConfirmed);f.options.reader={resolveRevision:async()=>{const e=Error('PRIVATE_DENIAL');e.status=403;throw e;},readFile:()=>{}};
 // A transport 403 is distinct from a sanitized provider observation. It must
 // clear private content even if the independently checked identity is valid.
 const actor=async()=>({status:'authenticated',subject:OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,memberActive:true,projects:['NEXAEON'],expiresAt:clock+60000});let denied=false;
 const reader=createRemoteHandoffReader({enabled:true,ownerSubject:OWNER,configuration:f.config,inspectCurrentOwner:actor,sourceRead:async()=>{if(denied)throw Object.assign(Error('DENIED'),{status:403});return readProjectEntrySource({...f.options,reader:f.repositoryReader});},digestText:async s=>hash(s),now:()=>clock});await reader.startAutoSync();denied=true;await reader.refresh();assert.equal(reader.snapshot().status,'denied');assert.equal(reader.snapshot().lastConfirmed,null);assert.equal(reader.snapshot().automatic,false);reader.dispose();c.reader.dispose();
});
