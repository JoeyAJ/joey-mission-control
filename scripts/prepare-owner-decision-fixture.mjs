// Generate an isolated rollback-only clone; never read Auth or real journal rows.
import fs from 'node:fs/promises';
const owner='11111111-1111-4111-8111-111111111111',projects=['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'],epoch='import_'+'a'.repeat(32),base='b'.repeat(40),pin='c'.repeat(64);
const template=await fs.readFile('docs/contracts/sql/coordinator-owner-decisions.pending.sql','utf8'),scope=JSON.stringify(projects.map(project_id=>({project_id,epoch,baseline_sha:base,context_hash:pin})));
function clone(name,delimiter){const start=template.indexOf('CREATE FUNCTION public.'+name),marker='END; $'+delimiter+'$;',tail=template.indexOf(marker,start),end=tail+marker.length;if(start<0||tail<0||end<start)throw Error('FIXTURE_FUNCTION_SOURCE');return template.slice(start,end).replaceAll('@@OWNER@@',owner).replaceAll('@@SCOPE@@',scope).replaceAll('mc_private.','pg_temp.').replaceAll('public.','pg_temp.').replaceAll("IF session_user='postgres' THEN","IF false /* isolated synthetic clone only; deployed guard untouched */ THEN");}
const local=process.argv.includes('--local');
const compactClone=`DO $clone$ DECLARE definition text; target text;
BEGIN FOREACH target IN ARRAY ARRAY['public.mc_owner_decide_coordinator_result(jsonb)','public.mc_owner_coordinator_decisions(text,bigint,integer)'] LOOP
 definition:=pg_catalog.pg_get_functiondef(target::regprocedure);
 definition:=replace(replace(definition,'mc_private.','pg_temp.'),'public.','pg_temp.');
 definition:=replace(definition,'6f0ca2ae-83e0-4684-af12-0b37d08182db','${owner}');
 definition:=regexp_replace(definition,'jsonb_to_recordset\\(''.*?''::jsonb\\)','jsonb_to_recordset(''${scope}''::jsonb)','g');
 definition:=replace(definition,'IF session_user=''postgres'' THEN','IF false /* isolated clone; deployed guard unchanged */ THEN');
 EXECUTE definition;
END LOOP; END $clone$;`;
const sql=`-- SYNTHETIC ONLY: pg_temp tables/functions, no JWT/Auth/session writes; ROLLBACK.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE heads(project_id text PRIMARY KEY,epoch text,baseline_sha text,revision bigint,writes_enabled boolean);
CREATE TEMP TABLE contexts(project_id text,context_hash text);
CREATE TEMP TABLE members(subject uuid,project_id text,member_role text,active boolean);
CREATE TEMP TABLE storage_budget(singleton boolean PRIMARY KEY,used_bytes bigint,event_count bigint);
CREATE TEMP TABLE coordinator_receipts(project_id text,epoch text,revision bigint,operation_id text,digest text,content jsonb);
CREATE TEMP TABLE coordinator_owner_decisions(project_id text,epoch text,revision bigint,operation_id text,digest text,owner_subject uuid,owner_session_id uuid,owner_aal text,committed_at bigint,content jsonb,charged_bytes bigint,PRIMARY KEY(project_id,epoch,revision),UNIQUE(project_id,epoch,operation_id));
CREATE UNIQUE INDEX fixture_owner_one_final ON coordinator_owner_decisions(project_id,epoch,(content->>'proposalId'));
ALTER TABLE coordinator_owner_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinator_owner_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY fixture_executor_read ON coordinator_owner_decisions FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY fixture_executor_append ON coordinator_owner_decisions FOR INSERT TO mc_continuity_executor WITH CHECK(true);
CREATE TEMP TABLE fixture_actor(subject uuid,aal text,expires_at bigint,session_active boolean);
CREATE TEMP TABLE fixture_requests(project text,request jsonb);
CREATE FUNCTION pg_temp.owner_auth_verification() RETURNS TABLE(subject uuid,session_id uuid,aal text,expires_at bigint) LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_temp.fixture_actor a WHERE a.session_active AND a.expires_at>floor(extract(epoch FROM clock_timestamp())*1000)::bigint) THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='SYNTHETIC_SESSION_DENIED'; END IF;
 RETURN QUERY SELECT a.subject,'22222222-2222-4222-8222-222222222222'::uuid,a.aal,a.expires_at FROM pg_temp.fixture_actor a; END $$;
CREATE FUNCTION pg_temp.mc_owner_context_scope(project text) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_temp.members m WHERE m.project_id=project AND m.active AND m.member_role='OWNER') THEN RAISE EXCEPTION 'SYNTHETIC_MEMBER_DENIED'; END IF;
 RETURN (SELECT jsonb_build_object('projectId',c.project_id,'contextHash',c.context_hash) FROM pg_temp.contexts c WHERE c.project_id=project); END $$;
CREATE FUNCTION pg_temp.exact_keys(v jsonb,k text[]) RETURNS boolean LANGUAGE sql AS $$ SELECT mc_private.exact_keys(v,k) $$;
CREATE FUNCTION pg_temp.canonical_json(v jsonb) RETURNS text LANGUAGE sql AS $$ SELECT mc_private.canonical_json(v) $$;
${local ? clone('mc_owner_decide_coordinator_result','decision')+'\n'+clone('mc_owner_coordinator_decisions','read') : compactClone}
DO $temp_grant$ BEGIN EXECUTE format('GRANT USAGE,CREATE ON SCHEMA %I TO mc_continuity_executor',(SELECT nspname FROM pg_namespace WHERE oid=pg_my_temp_schema()));END $temp_grant$;
GRANT SELECT,INSERT,UPDATE ON heads,contexts,members,storage_budget,fixture_actor,fixture_requests TO mc_continuity_executor;
GRANT SELECT,INSERT ON coordinator_receipts,coordinator_owner_decisions TO mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
ALTER FUNCTION pg_temp.mc_owner_decide_coordinator_result(jsonb) OWNER TO mc_continuity_executor;
ALTER FUNCTION pg_temp.mc_owner_coordinator_decisions(text,bigint,integer) OWNER TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
INSERT INTO fixture_actor VALUES('${owner}','aal2',floor(extract(epoch FROM clock_timestamp())*1000)::bigint+600000,true);
INSERT INTO storage_budget VALUES(true,9000,2);
DO $setup$ DECLARE project text; kind text; content jsonb; payload jsonb; operation jsonb; binding jsonb; pd text; rd text; expires bigint:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint+60000;
BEGIN FOREACH project IN ARRAY ARRAY['${projects.join("','")}'] LOOP
 INSERT INTO heads VALUES(project,'${epoch}','${base}',0,false);INSERT INTO contexts VALUES(project,'${pin}');INSERT INTO members VALUES('${owner}',project,'OWNER',true);
 FOREACH kind IN ARRAY ARRAY['proposal','result'] LOOP
 payload:=CASE WHEN kind='proposal' THEN jsonb_build_object('proposalId','synthetic_work_'||project,'contextHash','${pin}','acceptanceHash',repeat('d',64),'expiresAt',expires) ELSE jsonb_build_object('proposalId','synthetic_work_'||project,'resultHash',repeat('e',64),'evidenceHashes',jsonb_build_array(repeat('f',64)),'qualification','SUBMITTER_ATTESTED') END;
 operation:=jsonb_build_object('id','synthetic_'||kind||'_'||project,'epoch','${epoch}','projectId',project,'baselineSha','${base}','expectedRevision',CASE WHEN kind='proposal' THEN 0 ELSE 1 END,'kind',kind,'payload',payload);
 content:=jsonb_build_object('writerId','nexaeon-coordinator','approvalRef','MC_P3_SYNTHETIC','summary','Synthetic rollback fixture','operation',operation);
 INSERT INTO coordinator_receipts VALUES(project,'${epoch}',CASE WHEN kind='proposal' THEN 1 ELSE 2 END,'synthetic_'||kind||'_'||project,encode(sha256(convert_to(pg_temp.canonical_json(content),'UTF8')),'hex'),content);
 END LOOP;
 SELECT digest INTO pd FROM coordinator_receipts r WHERE r.project_id=project AND revision=1;SELECT digest INTO rd FROM coordinator_receipts r WHERE r.project_id=project AND revision=2;
 binding:=jsonb_build_object('schemaVersion',1,'projectId',project,'epoch','${epoch}','baselineSha','${base}','contextHash','${pin}','expectedRevision',2,'proposalId','synthetic_work_'||project,'proposalOperationId','synthetic_proposal_'||project,'proposalDigest',pd,'acceptanceHash',repeat('d',64),'resultOperationId','synthetic_result_'||project,'resultDigest',rd,'resultHash',repeat('e',64),'evidenceHashes',jsonb_build_array(repeat('f',64)),'resultQualification','SUBMITTER_ATTESTED','decision','ACCEPT','expiresAt',expires);
 INSERT INTO fixture_requests VALUES(project,jsonb_build_object('id','synthetic_owner_'||project,'binding',binding,'bindingDigest',encode(sha256(convert_to(pg_temp.canonical_json(binding),'UTF8')),'hex'),'expectedDecisionRevision',0));
END LOOP; END $setup$;
DO $tests$ DECLARE req jsonb; changed jsonb; binding jsonb; accepted jsonb; replay jsonb; count_before bigint; fixture_project text;
BEGIN
 SELECT request INTO req FROM fixture_requests f WHERE f.project='NEXAEON';
 UPDATE fixture_actor SET aal='aal1';BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(req);RAISE EXCEPTION 'TEST_AAL1_ALLOWED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;UPDATE fixture_actor SET aal='aal2';
 UPDATE fixture_actor SET session_active=false;BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(req);RAISE EXCEPTION 'TEST_REVOKED_ALLOWED';EXCEPTION WHEN invalid_authorization_specification THEN NULL;END;UPDATE fixture_actor SET session_active=true;
 UPDATE members SET active=false WHERE project_id='NEXAEON';BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(req);RAISE EXCEPTION 'TEST_MEMBER_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'SYNTHETIC_MEMBER_DENIED' THEN RAISE; END IF;END;UPDATE members SET active=true;
 accepted:=pg_temp.mc_owner_decide_coordinator_result(req);IF accepted->>'revision'<>'1' OR accepted->>'duplicate'<>'false' THEN RAISE EXCEPTION 'TEST_FIRST_APPEND';END IF;
 replay:=pg_temp.mc_owner_decide_coordinator_result(req);IF replay->>'digest'<>accepted->>'digest' OR replay->>'committedAt'<>accepted->>'committedAt' OR replay->>'duplicate'<>'true' THEN RAISE EXCEPTION 'TEST_REPLAY';END IF;
 binding:=jsonb_set(req->'binding','{expiresAt}','1');changed:=jsonb_set(jsonb_set(req,'{binding}',binding),'{bindingDigest}',to_jsonb(encode(sha256(convert_to(pg_temp.canonical_json(binding),'UTF8')),'hex')));replay:=pg_temp.mc_owner_decide_coordinator_result(changed);IF replay->>'duplicate'<>'true' THEN RAISE EXCEPTION 'TEST_EXPIRED_REPLAY';END IF;
 binding:=jsonb_set(req->'binding','{decision}','"REJECT"');changed:=jsonb_set(jsonb_set(req,'{binding}',binding),'{bindingDigest}',to_jsonb(encode(sha256(convert_to(pg_temp.canonical_json(binding),'UTF8')),'hex')));BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(changed);RAISE EXCEPTION 'TEST_CHANGED_REPLAY_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_IDEMPOTENCY_CONFLICT' THEN RAISE;END IF;END;
 changed:=jsonb_set(req,'{id}','"synthetic_second_device"');BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(changed);RAISE EXCEPTION 'TEST_STALE_CAS_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_REVISION_CONFLICT' THEN RAISE;END IF;END;
 changed:=jsonb_set(changed,'{expectedDecisionRevision}','1');BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(changed);RAISE EXCEPTION 'TEST_OVERWRITE_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_ALREADY_FINAL' THEN RAISE;END IF;END;
 SELECT request INTO req FROM fixture_requests f WHERE f.project='WOOSONG_BUDDY';UPDATE storage_budget SET event_count=10000;BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(req);RAISE EXCEPTION 'TEST_QUOTA_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_SHARED_CAPACITY' THEN RAISE;END IF;END;UPDATE storage_budget SET event_count=3;
 binding:=jsonb_set(req->'binding','{resultHash}',to_jsonb(repeat('a',64)));changed:=jsonb_set(jsonb_set(req,'{binding}',binding),'{bindingDigest}',to_jsonb(encode(sha256(convert_to(pg_temp.canonical_json(binding),'UTF8')),'hex')));BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(changed);RAISE EXCEPTION 'TEST_CHANGED_EVIDENCE_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_EVIDENCE_CONFLICT' THEN RAISE;END IF;END;
 binding:=jsonb_set(req->'binding','{expiresAt}','1');changed:=jsonb_set(jsonb_set(req,'{binding}',binding),'{bindingDigest}',to_jsonb(encode(sha256(convert_to(pg_temp.canonical_json(binding),'UTF8')),'hex')));BEGIN PERFORM pg_temp.mc_owner_decide_coordinator_result(changed);RAISE EXCEPTION 'TEST_EXPIRED_NEW_ALLOWED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'OWNER_DECISION_EXPIRED' THEN RAISE;END IF;END;
 FOREACH fixture_project IN ARRAY ARRAY['WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'] LOOP SELECT request INTO req FROM fixture_requests f WHERE f.project=fixture_project;PERFORM pg_temp.mc_owner_decide_coordinator_result(req);END LOOP;
 FOREACH fixture_project IN ARRAY ARRAY['${projects.join("','")}'] LOOP IF jsonb_array_length(pg_temp.mc_owner_coordinator_decisions(fixture_project,0,50)->'decisions')<>1 THEN RAISE EXCEPTION 'TEST_READBACK';END IF;END LOOP;
 IF (SELECT count(*) FROM coordinator_owner_decisions)<>4 OR (SELECT event_count FROM storage_budget)<>6 THEN RAISE EXCEPTION 'TEST_ROW_BUDGET';END IF;
END $tests$;
RESET ROLE;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
SELECT true AS synthetic_rollback_only,4 AS fixture_project_pass,true AS cas_replay_expiry_quota_denial_readback_pass;
ROLLBACK;
`;
await fs.writeFile('/tmp/mc-private-restore/receipts/owner-decision.synthetic.'+(local?'local':'compact')+'.rollback.sql',sql,{mode:0o600});console.log(JSON.stringify({generated:true,syntheticOnly:true,authTablesReadOrWritten:false,realDecisionsSeeded:false}));
