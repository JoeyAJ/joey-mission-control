// Reconstruct only the recorded task/review schema in a disposable database.
// Helpers for live session verification are synthetic; function ownership/ACL,
// restricted membership, table RLS, public RPCs and physical count/CAS are real.
import fs from 'node:fs';
const root='docs/contracts/sql/',definition=(file,name)=>fs.readFileSync(root+file,'utf8').match(new RegExp('CREATE FUNCTION '+name.replaceAll('.','\\.')+'\\([\\s\\S]*?END \\$body\\$;'))[0];
let sql=`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE mc_continuity_executor NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT mc_continuity_executor TO postgres WITH ADMIN TRUE,INHERIT FALSE,SET FALSE;
CREATE DATABASE mc_scope OWNER postgres;\n`;
fs.writeFileSync('/tmp/mc-scope-pg-roles.sql',sql);
sql=`CREATE SCHEMA mc_private AUTHORIZATION postgres;GRANT USAGE ON SCHEMA mc_private TO mc_continuity_executor;
CREATE FUNCTION mc_private.exact_keys(d jsonb,keys text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$SELECT jsonb_typeof(d)='object' AND (SELECT count(*) FROM jsonb_object_keys(d))=cardinality(keys) AND d ?& keys$$;
ALTER FUNCTION mc_private.exact_keys(jsonb,text[]) OWNER TO mc_continuity_executor;
`;
const canonical=fs.readFileSync(root+'private-continuity.foundation.sql','utf8').match(/CREATE FUNCTION mc_private\.canonical_json\([\s\S]*?END; \$\$;/)[0];sql+=canonical+'\nALTER FUNCTION mc_private.canonical_json(jsonb) OWNER TO mc_continuity_executor;\n';
sql+=`CREATE FUNCTION mc_private.owner_auth_verification() RETURNS TABLE(subject uuid,aal text,session_id uuid,expires_at numeric) LANGUAGE sql VOLATILE AS $$SELECT '11111111-1111-4111-8111-111111111111'::uuid,'aal2','22222222-2222-4222-8222-222222222222'::uuid,extract(epoch FROM clock_timestamp())*1000+60000$$;
ALTER FUNCTION mc_private.owner_auth_verification() OWNER TO mc_continuity_executor;
CREATE FUNCTION mc_private.project_draft_actor() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN IF current_setting('mc_test.owner_active',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'OWNER_DENIED';END IF;RETURN '11111111-1111-4111-8111-111111111111'::uuid;END$$;
ALTER FUNCTION mc_private.project_draft_actor() OWNER TO mc_continuity_executor;
REVOKE ALL ON FUNCTION mc_private.exact_keys(jsonb,text[]),mc_private.canonical_json(jsonb),mc_private.owner_auth_verification(),mc_private.project_draft_actor() FROM PUBLIC,anon,authenticated,service_role;
`;
for(const [file,name,sig]of [['private-development-tasks.pending.sql','mc_private.validate_development_task','jsonb'],['task-review-decisions.pending.sql','mc_private.validate_task_review','jsonb']]){sql+=definition(file,name)+`\nALTER FUNCTION ${name}(${sig}) OWNER TO mc_continuity_executor;REVOKE ALL ON FUNCTION ${name}(${sig}) FROM PUBLIC,anon,authenticated,service_role;\n`;}
for(const [file,table]of [['private-development-tasks.pending.sql','development_tasks'],['task-review-decisions.pending.sql','task_review_decisions']]){const source=fs.readFileSync(root+file,'utf8');sql+=source.match(new RegExp('CREATE TABLE mc_private.'+table+'\\([\\s\\S]*?\\n\\);'))[0]+`\nALTER TABLE mc_private.${table} OWNER TO mc_continuity_executor;REVOKE ALL ON mc_private.${table} FROM PUBLIC,anon,authenticated,service_role;ALTER TABLE mc_private.${table} ENABLE ROW LEVEL SECURITY;ALTER TABLE mc_private.${table} FORCE ROW LEVEL SECURITY;\n`;}
sql+=`CREATE POLICY owner_tasks ON mc_private.development_tasks TO mc_continuity_executor USING(owner_subject=mc_private.project_draft_actor()) WITH CHECK(owner_subject=mc_private.project_draft_actor());
CREATE POLICY owner_task_review_read ON mc_private.task_review_decisions FOR SELECT TO mc_continuity_executor USING(owner_subject=mc_private.project_draft_actor());
CREATE POLICY owner_task_review_append ON mc_private.task_review_decisions FOR INSERT TO mc_continuity_executor WITH CHECK(owner_subject=mc_private.project_draft_actor());\n`;
for(const [file,name,sig]of [['private-development-tasks.pending.sql','public.mc_owner_development_task_list',''],['private-development-tasks.pending.sql','public.mc_owner_development_task_save','jsonb,bigint'],['task-review-decisions.pending.sql','public.mc_owner_task_review_list','text,bigint,integer'],['task-review-decisions.pending.sql','public.mc_owner_task_review_append','jsonb,uuid,bigint']])sql+=definition(file,name)+`\nALTER FUNCTION ${name}(${sig}) OWNER TO mc_continuity_executor;REVOKE ALL ON FUNCTION ${name}(${sig}) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION ${name}(${sig}) TO authenticated;\n`;
fs.writeFileSync('/tmp/mc-scope-pg-baseline.sql',sql);
