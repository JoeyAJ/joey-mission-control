// Disposable native schema tests. Initializer is superuser only to build the
// recorded baseline; all apply/rollback calls use non-superuser postgres with
// ADMIN membership but SET/INHERIT false at rest. Live auth helpers are synthetic.
import {execFileSync,spawn} from 'node:child_process';import fs from 'node:fs';
import './prepare-dynamic-scope-postgres-fixture.mjs';
const name='mc-dynamic-scope-qa-'+process.pid,run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',...options});
const sql=(file,user='postgres',db='mc_scope',prefix='')=>run(['exec','-i',name,'psql','-U',user,'-d',db,'-v','ON_ERROR_STOP=1'],{input:prefix+fs.readFileSync(file,'utf8')});
const command=(text,user='supabase_admin')=>run(['exec',name,'psql','-U',user,'-d','mc_scope','-At','-v','ON_ERROR_STOP=1','-c',text]);
run(['image','inspect','postgres:17.11-alpine']);
try{run(['run','-d','--name',name,'--network','none','--memory','256m','--cpus','1','-e','POSTGRES_USER=supabase_admin','-e','POSTGRES_PASSWORD=synthetic-local-validation','postgres:17.11-alpine']);
 let ready=false;for(let n=0;n<50;n++){try{if(!run(['logs',name]).includes('PostgreSQL init process complete; ready for start up.'))throw Error('INITIALIZING');run(['exec',name,'pg_isready','-U','supabase_admin']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}if(!ready)throw Error('LOCAL_DATABASE_NOT_READY');
 sql('/tmp/mc-scope-pg-roles.sql','supabase_admin','supabase_admin');sql('/tmp/mc-scope-pg-baseline.sql','supabase_admin');command('GRANT mc_continuity_executor TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET FALSE;','postgres');
 const restored="SELECT rolsuper,pg_has_role('postgres','mc_continuity_executor','SET'),pg_has_role('postgres','mc_continuity_executor','USAGE'),has_schema_privilege('mc_continuity_executor','mc_private','CREATE'),has_schema_privilege('mc_continuity_executor','public','CREATE') FROM pg_roles WHERE rolname='postgres';";
 if(command(restored,'postgres').trim()!=='f|f|f|f|f')throw Error('INITIAL_RESTRICTED_PROTOCOL');
 // Finite drift probes against the exact live two-row fingerprint. Each is
 // fixture-only, must fail before any backup/grant object can be created.
 const expectDrift=()=>{let refused=false;try{sql('docs/contracts/sql/dynamic-project-scopes.pending.sql');}catch(e){if(String(e.stderr).includes('EXACT_TWO_MEMBERSHIP_ROWS_REQUIRED'))refused=true;else throw e;}if(!refused||command("SELECT to_regclass('mc_private.project_scope_validator_backup') IS NULL;").trim()!=='t')throw Error('MEMBERSHIP_DRIFT_NOT_FAIL_CLOSED');};
 command('REVOKE mc_continuity_executor FROM postgres GRANTED BY postgres;');expectDrift();command('GRANT mc_continuity_executor TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET FALSE;','postgres');
 command('GRANT mc_continuity_executor TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET TRUE;');expectDrift();command('GRANT mc_continuity_executor TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET FALSE;');
 command('GRANT mc_continuity_executor TO postgres WITH ADMIN FALSE,INHERIT TRUE,SET FALSE;','postgres');expectDrift();command('GRANT mc_continuity_executor TO postgres WITH ADMIN FALSE,INHERIT FALSE,SET FALSE;','postgres');
 command('CREATE ROLE drift_member;GRANT mc_continuity_executor TO drift_member WITH ADMIN FALSE,INHERIT FALSE,SET FALSE;');expectDrift();command('REVOKE mc_continuity_executor FROM drift_member;DROP ROLE drift_member;');
 sql('docs/contracts/sql/dynamic-project-scopes.pending.sql');sql('docs/contracts/sql/dynamic-project-runtime-authorization.pending.sql');
 sql('tests/fixtures/dynamic-project-scopes/native-grant-admin.sql');sql('tests/fixtures/dynamic-project-scopes/native-initial.sql','supabase_admin');
 command("UPDATE mc_private.explicit_project_scope_grants SET grant_document=jsonb_set(grant_document,'{revoked}','true') WHERE project_id='AUTHORIZED_FIXTURE';",'postgres');
 sql('tests/fixtures/dynamic-project-scopes/native-revocation-capacity.sql','supabase_admin');
 // Existing Owner advisory lock forces the real write RPC to wait past expiry.
 const holder=spawn('docker',['exec',name,'psql','-U','supabase_admin','-d','mc_scope','-At','-c',"SELECT pg_advisory_lock(hashtextextended('mc.development_tasks:11111111-1111-4111-8111-111111111111',0));SELECT pg_sleep(1.8);"],{stdio:['ignore','pipe','pipe']});const done=new Promise((resolve,reject)=>holder.on('exit',c=>c===0?resolve():reject(Error('LOCK_HOLDER_FAILED'))));
 for(let n=0;n<15;n++){if(command("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND granted);").trim()==='t')break;await new Promise(r=>setTimeout(r,50));}
 const expiry=Number(command("UPDATE mc_private.explicit_project_scope_grants SET grant_document=jsonb_set(grant_document,'{expiresAt}',to_jsonb(floor(extract(epoch FROM clock_timestamp())*1000)::bigint+600)) WHERE project_id='AUTHORIZED_SECOND' RETURNING grant_document->>'expiresAt';",'postgres').split('\n')[0]);
 const input=fs.readFileSync('tests/fixtures/dynamic-project-scopes/native-lock-expiry.sql','utf8').replace('DECLARE denied boolean:=false;','DECLARE denied boolean:=false;started timestamptz:=clock_timestamp();').replace('BEGIN BEGIN PERFORM',"BEGIN IF floor(extract(epoch FROM started)*1000)>="+expiry+" THEN RAISE EXCEPTION 'WRITER_STARTED_AFTER_EXPIRY';END IF;BEGIN PERFORM").replace('IF NOT denied THEN',"IF extract(epoch FROM clock_timestamp()-started)<0.6 THEN RAISE EXCEPTION 'LOCK_WAIT_NOT_OBSERVED';END IF;IF NOT denied THEN");run(['exec','-i',name,'psql','-U','supabase_admin','-d','mc_scope','-v','ON_ERROR_STOP=1'],{input});await done;
 let refused=false;try{sql('docs/contracts/sql/dynamic-project-scopes.rollback.sql','postgres','mc_scope',"SET mc_test.owner_active='true';\n");}catch(e){if(String(e.stderr).includes('DYNAMIC_HISTORY_REQUIRES_RECOVERY_PLAN'))refused=true;else throw e;}if(!refused)throw Error('DYNAMIC_HISTORY_NOT_PROTECTED');
 // Fixture-only reset; the rollback scripts never delete any task/review rows.
 command('DELETE FROM mc_private.task_review_decisions;DELETE FROM mc_private.development_tasks;');
 sql('docs/contracts/sql/dynamic-project-runtime-authorization.rollback.sql');sql('docs/contracts/sql/dynamic-project-scopes.rollback.sql','postgres','mc_scope',"SET mc_test.owner_active='true';\n");
 if(command(restored,'postgres').trim()!=='f|f|f|f|f')throw Error('FINAL_RESTRICTED_PROTOCOL');
 if(command("SELECT provolatile FROM pg_proc WHERE oid='mc_private.validate_development_task(jsonb)'::regprocedure;").trim()!=='i')throw Error('IMMUTABLE_NOT_RESTORED');
 console.log('PASS exact live PostgreSQL17.11 roles/two memberships plus four drift refusals; restricted non-superuser apply/rollback; direct native multi-project lists, revoked reads, structural CHECK, physical global capacity, CAS and grant expiry during lock wait. No live SQL.');
}finally{run(['rm','-f',name]);}
