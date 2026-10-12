// Disposable SQL contract acceptance, never a Supabase/live connection. Requires
// an already available Docker daemon and postgres:16-alpine image; no pull here.
import {execFileSync} from 'node:child_process';import fs from 'node:fs';
const name='mc-dynamic-scope-qa-'+process.pid,run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',...options}),sql=path=>run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:fs.readFileSync(path,'utf8')});
run(['image','inspect','postgres:16-alpine']);
try{run(['run','-d','--name',name,'--network','none','--memory','256m','--cpus','1','-e','POSTGRES_PASSWORD=synthetic-local-validation','postgres:16-alpine']);
 let ready=false;for(let attempt=0;attempt<50;attempt++){try{if(!run(['logs',name]).includes('PostgreSQL init process complete; ready for start up.'))throw Error('INITIALIZING');run(['exec',name,'pg_isready'],{stdio:'pipe'});ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}if(!ready)throw Error('LOCAL_DATABASE_NOT_READY');
 sql('tests/fixtures/dynamic-project-scopes/postgres-setup.sql');sql('docs/contracts/sql/dynamic-project-scopes.pending.sql');sql('tests/fixtures/dynamic-project-scopes/postgres-acceptance.sql');sql('docs/contracts/sql/dynamic-project-scopes.rollback.sql');
 const result=run(['exec',name,'psql','-U','postgres','-Atc',"SELECT to_regclass('mc_private.explicit_project_scope_grants') IS NULL,provolatile FROM pg_proc WHERE oid='mc_private.validate_development_task(jsonb)'::regprocedure;"]);if(result.trim()!=='t|i')throw Error('ROLLBACK_NOT_EXACT');console.log('PASS isolated PostgreSQL apply, complete task/review validators, scope/ACL/revocation/expiry/Owner denial and exact rollback; session verifier is synthetic.');
}finally{run(['rm','-f',name]);}
