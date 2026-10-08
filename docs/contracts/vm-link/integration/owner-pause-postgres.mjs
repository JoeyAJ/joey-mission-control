// Actual local PostgreSQL, synthetic Auth metadata and ten synthetic workers.
// Does not contact Supabase, invoke a VM, or weaken the live safeupdate guard.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {OWNER} from '../src/protocol.mjs';
import {policyDigest,artifactDigest} from '../edge/artifact.generated.mjs';
const prefix=process.argv[2]||'/tmp/mc-pause-native';
const {default:pg}=await import(pathToFileURL(path.join(prefix,'node_modules/pg/lib/index.js')));
const bin=path.join(prefix,'node_modules/@embedded-postgres/linux-x64/native/bin'),root=await fs.mkdtemp('/tmp/mc-owner-pause-pg-');
await fs.chmod(root,0o700);const socket=path.join(root,'socket'),data=path.join(root,'data');await fs.mkdir(socket,{mode:0o700});
const clients=[],checks=[],sid=randomUUID();let started=false;
const native=(name,args)=>{const r=spawnSync(path.join(bin,name),args,{encoding:'utf8',timeout:15000});if(r.status!==0)throw Error('NATIVE_'+name+'_FAILED');return r.stdout;};
async function connect(user,role,claims){const c=new pg.Client({host:socket,port:55435,user,database:'postgres',password:'',ssl:false});await c.connect();clients.push(c);if(role)await c.query('SET ROLE '+role);if(claims)await c.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);return c;}
const request=()=>({requestId:randomUUID(),action:'pause',body:{explicit:true}});
const check=name=>checks.push({name,pass:true});
async function deny(p,message){const e=await p.then(()=>null,e=>e);assert(e);if(message)assert.equal(e.message,message);}
try{
 assert.match(native('postgres',['--version']),/17\.10/);native('initdb',['-D',data,'-U','fixture_bootstrap','--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C','--no-sync']);
 native('pg_ctl',['-D',data,'-l',path.join(root,'server.log'),'-w','-t','10','-o',`-k ${socket} -p 55435 -c listen_addresses='' -c jit=off -c statement_timeout=5000`,'start']);started=true;
 const bootstrap=await connect('fixture_bootstrap');await bootstrap.query('CREATE ROLE postgres LOGIN NOSUPERUSER CREATEROLE CREATEDB BYPASSRLS;ALTER DATABASE postgres OWNER TO postgres');const admin=await connect('postgres');
 const foundation=await fs.readFile('docs/contracts/sql/private-continuity.foundation.sql','utf8'),helpers=foundation.match(/CREATE FUNCTION mc_private\.(?:canonical_json|exact_keys)[\s\S]*?\$\$;/g);
 const authSource=await fs.readFile('docs/contracts/sql/private-continuity.owner-auth-helper-pending.sql','utf8'),helper=authSource.slice(authSource.indexOf('CREATE FUNCTION mc_private.owner_auth_verification()'),authSource.indexOf('REVOKE ALL ON FUNCTION mc_private.owner_auth_verification()'));
 await admin.query(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN;
 CREATE ROLE mc_continuity_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;GRANT mc_continuity_executor TO postgres WITH INHERIT FALSE;GRANT mc_continuity_executor TO postgres WITH SET FALSE;
 CREATE ROLE fixture_owner LOGIN;GRANT authenticated TO fixture_owner;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid,is_anonymous boolean,deleted_at timestamptz,email_confirmed_at timestamptz,banned_until timestamptz);CREATE TABLE auth.sessions(id uuid,user_id uuid,aal text,not_after timestamptz);CREATE TABLE auth.mfa_factors(user_id uuid,status text,factor_type text);
 CREATE SCHEMA mc_private;REVOKE ALL ON SCHEMA mc_private FROM PUBLIC;GRANT USAGE ON SCHEMA mc_private TO mc_continuity_executor;CREATE TABLE mc_private.members(subject uuid,project_id text,member_role text,active boolean);GRANT SELECT ON mc_private.members TO mc_continuity_executor;
 ${helpers.join('\n')}${helper}REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mc_private FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA mc_private TO mc_continuity_executor;`);
 await admin.query('INSERT INTO auth.users VALUES($1,false,null,now(),null)',[OWNER]);await admin.query('INSERT INTO auth.sessions VALUES($1,$2,$3,null)',[sid,OWNER,'aal2']);await admin.query("INSERT INTO auth.mfa_factors VALUES($1,'verified','totp')",[OWNER]);await admin.query("INSERT INTO mc_private.members VALUES($1,'NEXAEON','OWNER',true)",[OWNER]);
 const raw=await fs.readFile('docs/contracts/vm-link/sql/mc-vm-link-0.1.1.pending.sql','utf8');await admin.query(raw.replaceAll('@@POLICY_DIGEST@@',policyDigest).replaceAll('@@ARTIFACT_DIGEST@@',artifactDigest));
 const repair=await fs.readFile('docs/contracts/vm-link/deploy/owner-pause-safeupdate-repair.pending.sql','utf8');
 const snapshot=async()=> (await admin.query("SELECT proowner::text,proacl::text,proconfig,prosecdef FROM pg_proc WHERE oid='public.mc_vm_link_owner(jsonb)'::regprocedure")).rows[0];
 const before=await snapshot();await deny(admin.query(repair),'OWNER_PAUSE_REPAIR_OWNER_DENIED');await admin.query('ROLLBACK');assert.deepEqual(await snapshot(),before);check('missingExistingOwnerPermissionRefusesWithoutGrantOrWrite');
 // Test the coordinated transaction, including permission restoration.
 const coordinated=await fs.readFile('docs/contracts/vm-link/deploy/owner-pause-safeupdate-repair.reviewed.sql','utf8');
 await deny(admin.query(coordinated.replace('8ecebe115ce12d759431920b6237d834fdb641307a352ee092f2703e58bcfb93','f'.repeat(64))),'OWNER_PAUSE_REPAIR_POSTCONDITION');await admin.query('ROLLBACK');
 assert.equal((await admin.query("SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') AS hash FROM pg_proc WHERE oid='public.mc_vm_link_owner(jsonb)'::regprocedure")).rows[0].hash,'180d510bdb690a0027d247a6c321d831b3201c16945866019a17f9a20088bef8');
 assert.equal((await admin.query("SELECT pg_has_role('postgres','mc_continuity_executor','USAGE') AS elevated")).rows[0].elevated,false);assert.deepEqual(await snapshot(),before);check('postReplacementFailureRollsBackBodyAndTemporaryInheritance');
 await admin.query(coordinated);assert.deepEqual(await snapshot(),before);check('onePredicateReplacementPreservesOwnerAclSettingsAndDefiner');
 await deny(admin.query(coordinated),'OWNER_PAUSE_REPAIR_SOURCE_DRIFT');await admin.query('ROLLBACK');check('reapplicationRefusedAtomically');
 assert.equal((await admin.query("SELECT pg_has_role('postgres','mc_continuity_executor','USAGE') OR pg_has_role('postgres','mc_continuity_executor','SET') AS elevated")).rows[0].elevated,false);check('temporaryInheritanceRestoredBeforeCommitAndRepeatFailure');
 const claims={sub:OWNER,session_id:sid,aal:'aal2',role:'authenticated',iss:'https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
 const owner=await connect('fixture_owner','authenticated',claims),call=(req,c=owner)=>c.query('SELECT public.mc_vm_link_owner($1::jsonb) AS ack',[req]);
 async function seed(active=null){
  await admin.query('TRUNCATE mc_vm_link.events,mc_vm_link.receipts,mc_vm_link.jobs,mc_vm_link.workers');await admin.query('UPDATE mc_vm_link.configuration SET enabled=true WHERE singleton');
  for(let i=0;i<10;i++)await admin.query("INSERT INTO mc_vm_link.workers(worker_id,enabled,revoked,created_at,pairing_hash,pairing_until) VALUES($1,$2,$3,$4::bigint,repeat('a',64),$4::bigint+600000)",['synthetic_worker_'+i,i===9,i<8,Date.now()]);
  await admin.query("INSERT INTO mc_vm_link.jobs(job_id,attempt_id,worker_id,fence,approval_id,owner_subject,owner_session_id,approved_at,claim_before,claimed,spawn_intent,terminal,outcome) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,true,true,true,'COMPLETED')",['synthetic_completed','synthetic_attempt_1','synthetic_worker_9',randomUUID(),OWNER,sid,Date.now(),Date.now()+60000]);
  if(active!==null)await admin.query('INSERT INTO mc_vm_link.jobs(job_id,attempt_id,worker_id,fence,approval_id,owner_subject,owner_session_id,approved_at,claim_before,claimed,spawn_intent) VALUES($1,$2,$3,2,$4,$5,$6,$7,$8,$9,$9)',['synthetic_active','synthetic_attempt_2','synthetic_worker_9',randomUUID(),OWNER,sid,Date.now(),Date.now()+60000,active]);
 }
 await seed();const unchanged=(await admin.query("SELECT worker_id,xmin::text FROM mc_vm_link.workers WHERE revoked ORDER BY worker_id")).rows;
 const req=request();assert.deepEqual((await call(req)).rows[0].ack,{enabled:false});
 const status=(await admin.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE enabled OR NOT revoked)::int AS unrevoked FROM mc_vm_link.workers')).rows[0];assert.deepEqual(status,{total:10,unrevoked:0});
 assert.deepEqual((await admin.query("SELECT worker_id,xmin::text FROM mc_vm_link.workers WHERE worker_id<'synthetic_worker_8' ORDER BY worker_id")).rows,unchanged);
 assert.equal((await admin.query("SELECT outcome FROM mc_vm_link.jobs WHERE job_id='synthetic_completed'")).rows[0].outcome,'COMPLETED');check('tenWorkersRevokedCompletedHistoryRetainedAndEightNoopRowsUntouched');
 await call(req);assert.equal((await admin.query('SELECT count(*)::int AS n FROM mc_vm_link.receipts')).rows[0].n,1);check('exactRetryReturnsOriginalAckWithoutNewReceipt');
 for(const claimed of [true,false]){await seed(claimed);await call(request());const j=(await admin.query("SELECT terminal,cancel,outcome FROM mc_vm_link.jobs WHERE job_id='synthetic_active'")).rows[0];assert.deepEqual(j,{terminal:true,cancel:true,outcome:claimed?'UNKNOWN':'CANCELLED'});check(claimed?'claimedJobGetsUnknownWithoutFalseCompletion':'unclaimedJobCancelled');}
 await seed();await deny(call(request(),admin),'permission denied for function mc_vm_link_owner');await owner.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({...claims,aal:'aal1'})]);await deny(call(request()));assert.equal((await admin.query('SELECT enabled FROM mc_vm_link.configuration')).rows[0].enabled,true);check('administratorShortcutAndAal1DeniedNoPauseStateChange');
 assert.deepEqual(await snapshot(),before);await fs.writeFile('/tmp/mc-worker-summary-qa/pause-native-report.json',JSON.stringify({pass:true,actualNativePostgres:true,syntheticOnly:true,liveRequests:0,safeupdateExtensionNotLoaded:true,checks},null,2)+'\n');
 console.log(JSON.stringify({pass:true,checks:checks.length,syntheticOnly:true,liveRequests:0}));
}finally{for(const c of clients.reverse())await c.end().catch(()=>{});if(started)native('pg_ctl',['-D',data,'-w','-t','10','-m','fast','stop']);}
