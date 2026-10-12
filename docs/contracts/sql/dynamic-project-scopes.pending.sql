-- REVIEW ONLY, NOT APPLIED. Target scmvedfqwlhkyvljymjj.
-- Replaces the HOLD candidate: CHECK validators stay structural/IMMUTABLE.
-- Owner-global count/CAS remain; public list RPCs filter revoked scopes.
-- Grant checks are VOLATILE, use clock_timestamp, with fresh snapshots; writes
-- recheck after advisory/row locks and at the actual INSERT/UPDATE boundary.
-- Caller protocol: non-superuser postgres, ADMIN but SET/INHERIT false membership
-- in the existing restricted executor. Temporary SET/CREATE restored before commit.
BEGIN;
DO $pre$ BEGIN
 IF current_user<>'postgres' OR to_regclass('mc_private.explicit_project_scope_grants') IS NOT NULL OR to_regclass('mc_private.project_scope_validator_backup') IS NOT NULL THEN RAISE EXCEPTION 'SCOPE_PRECONDITION_FAILED';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
 OR NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.roleid='mc_continuity_executor'::regrole AND m.member='postgres'::regrole AND m.admin_option AND NOT m.set_option AND NOT m.inherit_option)
 OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE') OR has_schema_privilege('mc_continuity_executor','public','CREATE') THEN RAISE EXCEPTION 'RECORDED_RESTRICTED_PROTOCOL_REQUIRED';END IF;
END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_development_task(jsonb)')) IS DISTINCT FROM $expected$
DECLARE p jsonb;k text;v text;lim integer;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','taskId','revision','createdAt','updatedAt','projectId','track','request']),false)
  OR d->>'schemaVersion' IS DISTINCT FROM 'mc.development-task.v1'
  OR jsonb_typeof(d->'taskId') IS DISTINCT FROM 'string'
  OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR jsonb_typeof(d->'revision') IS DISTINCT FROM 'number'
  OR d->>'revision' !~ '^[1-9][0-9]{0,5}$'
  OR (d->>'revision')::bigint>100000
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>98304 THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['createdAt','updatedAt']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string'
   OR d->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
   OR to_char((d->>k)::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>d->>k THEN RETURN false; END IF;
 END LOOP;
 IF (d->>'updatedAt')::timestamptz<(d->>'createdAt')::timestamptz THEN RETURN false; END IF;
 IF jsonb_typeof(d->'projectId') IS DISTINCT FROM 'string' OR d->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  OR jsonb_typeof(d->'track') IS DISTINCT FROM 'string' OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM' THEN RETURN false;END IF;
 p:=d->'request';
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['feature','acceptance','constraints']),false) THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['feature','acceptance','constraints']) LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
  v:=p->>k;lim:=CASE k WHEN 'feature' THEN 32768 ELSE 6000 END;
  IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>lim
   OR v<>btrim(v,U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
   OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}|\y(password|secret|token)["'']?[[:space:]]*[:=]|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+' THEN RETURN false;END IF;
 END LOOP;
 IF p->>'feature'='' THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_development_task(jsonb)')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_mc_private.validate_development_task(jsonb)';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_task_review(jsonb)')) IS DISTINCT FROM $expected$
DECLARE k text;v text;b jsonb;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','projectId','track','taskId','taskRequirements','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','reportSequence','runId','workRef','codeSha','decision','comment']),false) THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['schemaVersion','projectId','track','taskId','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','runId','workRef','codeSha','decision','comment']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
 END LOOP;
 IF d->>'schemaVersion'<>'mc.owner-task-review.v1' OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR d->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM'
  OR d->>'repositoryId' !~ '^[-A-Za-z0-9_.]+/[-A-Za-z0-9_.]+$' OR char_length(d->>'repositoryId')>200
  OR d->>'runId' !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$'
  OR d->>'reportRef'<>'mc/progress' OR d->>'reportPath' NOT IN ('.mission-control/runs/'||(d->>'runId')||'.json','.mission-control/runs-page-2/'||(d->>'runId')||'.json')
  OR jsonb_typeof(d->'reportSequence') IS DISTINCT FROM 'number' OR d->>'reportSequence' !~ '^[1-9][0-9]*$'
  OR (d->>'reportSequence')::bigint NOT BETWEEN 2 AND 64
  OR d->>'decision' NOT IN ('APPROVE','REQUEST_CHANGES') THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['canonicalRef','workRef']) LOOP
  v:=d->>k;IF v !~ '^[-A-Za-z0-9_./]+$' OR char_length(v)>255 OR v LIKE '%..%' OR v LIKE '/%' OR v LIKE '-%' OR v LIKE '%/' OR v LIKE '%//%' THEN RETURN false;END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['canonicalHeadSha','reportHeadSha','reportBlobId','codeSha']) LOOP IF d->>k !~ '^[a-f0-9]{40}$' THEN RETURN false;END IF;END LOOP;
 b:=d->'taskRequirements';
 IF NOT coalesce(mc_private.exact_keys(b,ARRAY['schemaVersion','revision','requestDigest']),false)
  OR jsonb_typeof(b->'schemaVersion') IS DISTINCT FROM 'string' OR b->>'schemaVersion'<>'mc.task-requirements.v1'
  OR jsonb_typeof(b->'revision') IS DISTINCT FROM 'number' OR b->>'revision' !~ '^[1-9][0-9]{0,5}$' OR (b->>'revision')::bigint>100000
  OR jsonb_typeof(b->'requestDigest') IS DISTINCT FROM 'string' OR b->>'requestDigest' !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 v:=d->>'comment';
 IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>2000
  OR octet_length(convert_to(v,'UTF8'))>8192 OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
  OR v~*'gh[pousr]_|github_pat_|Bearer[[:space:]]|sb_secret_|PRIVATE KEY|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.]|\y(password|secret|token)["'']?[[:space:]]*[:=]|api[[:space:]_-]*key["'']?[[:space:]]*[:=]|\y[a-z]{2,12}://|\y(javascript|data|file):'
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>16384 THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_task_review(jsonb)')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_mc_private.validate_task_review(jsonb)';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_development_task_list()')) IS DISTINCT FROM $expected$
DECLARE actor uuid;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 SELECT coalesce(jsonb_agg(task ORDER BY updated_at DESC,task_id),'[]'::jsonb) INTO out_value
  FROM mc_private.development_tasks WHERE owner_subject=actor;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASKS','tasks',out_value);
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_development_task_list()')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_public.mc_owner_development_task_list()';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_development_task_save(jsonb,bigint)')) IS DISTINCT FROM $expected$
DECLARE actor uuid;old mc_private.development_tasks%ROWTYPE;id text;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF expected_revision IS NULL OR expected_revision<0 OR expected_revision>=100000
  OR NOT mc_private.validate_development_task(task) OR (task->>'revision')::bigint<>expected_revision+1 THEN
  RAISE EXCEPTION 'TASK_INVALID' USING ERRCODE='22023';
 END IF;
 id:=task->>'taskId';
 PERFORM pg_advisory_xact_lock(hashtextextended('mc.development_tasks:'||actor::text,0));
 SELECT * INTO old FROM mc_private.development_tasks d WHERE d.owner_subject=actor AND d.task_id=id FOR UPDATE;
 IF FOUND THEN
  -- Idempotent replay after a committed write whose response was lost.
  -- Only the exact same complete validated JSON payload and next revision qualify.
  IF old.revision=expected_revision+1 AND old.task=$1 THEN
   PERFORM mc_private.project_draft_actor();
   RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASK_SAVED','task',old.task);
  END IF;
  IF old.revision<>expected_revision OR task->>'projectId' IS DISTINCT FROM old.task->>'projectId' OR task->>'track' IS DISTINCT FROM old.task->>'track' OR task->>'createdAt'<>old.task->>'createdAt'
   OR (task->>'updatedAt')::timestamptz<(old.task->>'updatedAt')::timestamptz THEN
   RAISE EXCEPTION 'TASK_REVISION_CONFLICT' USING ERRCODE='40001';
  END IF;
  UPDATE mc_private.development_tasks d SET task=$1,revision=expected_revision+1,updated_at=clock_timestamp()
   WHERE d.owner_subject=actor AND d.task_id=id;
 ELSE
  IF expected_revision<>0 THEN RAISE EXCEPTION 'TASK_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF (SELECT count(*) FROM mc_private.development_tasks WHERE owner_subject=actor)>=12 THEN RAISE EXCEPTION 'TASK_CAPACITY'; END IF;
  INSERT INTO mc_private.development_tasks(owner_subject,task_id,revision,task) VALUES(actor,id,1,$1);
 END IF;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASK_SAVED','task',$1);
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_development_task_save(jsonb,bigint)')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_public.mc_owner_development_task_save(jsonb,bigint)';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_task_review_list(text,bigint,integer)')) IS DISTINCT FROM $expected$
DECLARE actor uuid;n bigint;rows jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF task_id IS NULL OR task_id !~ '^task_[a-f0-9]{24}$' OR after_sequence IS NULL OR after_sequence NOT BETWEEN 0 AND 20 OR page_limit IS NULL OR page_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'TASK_REVIEW_INVALID' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM mc_private.development_tasks t WHERE t.owner_subject=actor AND t.task_id=$1) THEN RAISE EXCEPTION 'TASK_REVIEW_TASK_REQUIRED' USING ERRCODE='42501';END IF;
 SELECT coalesce(max(d.decision_sequence),0) INTO n FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=$1;
 IF after_sequence>n THEN RAISE EXCEPTION 'TASK_REVIEW_CURSOR_CONFLICT' USING ERRCODE='40001';END IF;
 SELECT coalesce(jsonb_agg(x.record ORDER BY x.sequence),'[]'::jsonb) INTO rows FROM (
  SELECT d.decision_sequence AS sequence,jsonb_build_object('sequence',d.decision_sequence,'operationId',d.operation_id,'decisionDigest',d.decision_digest,'committedAt',to_char(d.committed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'review',d.review) AS record
  FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=$1 AND d.decision_sequence>$2 AND d.decision_sequence<=n ORDER BY d.decision_sequence LIMIT $3
 ) x;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_TASK_REVIEW_RECORDED','taskId',$1,'afterSequence',$2,'sequence',n,'records',rows,'executionAuthorized',false);
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_task_review_list(text,bigint,integer)')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_public.mc_owner_task_review_list(text,bigint,integer)';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_task_review_append(jsonb,uuid,bigint)')) IS DISTINCT FROM $expected$
DECLARE actor uuid;t mc_private.development_tasks%ROWTYPE;old mc_private.task_review_decisions%ROWTYPE;stored mc_private.task_review_decisions%ROWTYPE;n bigint;payload jsonb;request_digest text;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF NOT mc_private.validate_task_review(review) OR operation_id IS NULL OR operation_id='00000000-0000-0000-0000-000000000000'::uuid OR expected_sequence IS NULL OR expected_sequence NOT BETWEEN 0 AND 20 THEN RAISE EXCEPTION 'TASK_REVIEW_INVALID' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('mc.task_review_decisions:'||actor::text,0));
 PERFORM mc_private.project_draft_actor();
 SELECT * INTO t FROM mc_private.development_tasks d WHERE d.owner_subject=actor AND d.task_id=$1->>'taskId' FOR UPDATE;
 IF NOT FOUND OR t.task->>'projectId' IS DISTINCT FROM review->>'projectId' OR t.task->>'track' IS DISTINCT FROM review->>'track' THEN RAISE EXCEPTION 'TASK_REVIEW_TASK_REQUIRED' USING ERRCODE='42501';END IF;
 SELECT * INTO old FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.operation_id=$2;
 IF FOUND THEN
  IF old.review IS DISTINCT FROM $1 OR old.decision_sequence<>$3+1 THEN RAISE EXCEPTION 'TASK_REVIEW_OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  -- Exact lost-response replay acknowledges the original dated record, never a new current acceptance.
  stored:=old;
 ELSE
  payload:=jsonb_build_object('schemaVersion',t.task->'schemaVersion','projectId',t.task->'projectId','track',t.task->'track','taskId',t.task->'taskId','revision',t.task->'revision','request',t.task->'request');
  request_digest:=encode(sha256(convert_to(mc_private.canonical_json(payload),'UTF8')),'hex');
  IF t.revision<>(review->'taskRequirements'->>'revision')::bigint OR request_digest IS DISTINCT FROM review->'taskRequirements'->>'requestDigest' THEN RAISE EXCEPTION 'TASK_REVIEW_REQUIREMENTS_CHANGED' USING ERRCODE='40001';END IF;
  SELECT coalesce(max(d.decision_sequence),0) INTO n FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=t.task_id;
  IF n<>expected_sequence THEN RAISE EXCEPTION 'TASK_REVIEW_SEQUENCE_CONFLICT' USING ERRCODE='40001';END IF;
  IF n>=20 OR (SELECT count(*) FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor)>=120 THEN RAISE EXCEPTION 'TASK_REVIEW_CAPACITY' USING ERRCODE='54000';END IF;
  INSERT INTO mc_private.task_review_decisions(owner_subject,task_id,decision_sequence,operation_id,decision_digest,review)
   VALUES(actor,t.task_id,n+1,$2,encode(sha256(convert_to(mc_private.canonical_json($1),'UTF8')),'hex'),$1) RETURNING * INTO stored;
 END IF;
 PERFORM mc_private.project_draft_actor();
 out_value:=jsonb_build_object('sequence',stored.decision_sequence,'operationId',stored.operation_id,'decisionDigest',stored.decision_digest,'committedAt',to_char(stored.committed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'review',stored.review);
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_TASK_REVIEW_RECORDED','record',out_value,'executionAuthorized',false);
END $expected$ OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure('public.mc_owner_task_review_append(jsonb,uuid,bigint)')) IS DISTINCT FROM 'mc_continuity_executor' THEN RAISE EXCEPTION 'EXACT_RESTRICTED_BASELINE_REQUIRED_public.mc_owner_task_review_append(jsonb,uuid,bigint)';END IF;END $pre$;
CREATE TABLE mc_private.project_scope_validator_backup(signature text PRIMARY KEY,definition text NOT NULL,owner_name text NOT NULL,acl aclitem[],volatility "char" NOT NULL);
REVOKE ALL ON mc_private.project_scope_validator_backup FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON mc_private.project_scope_validator_backup TO mc_continuity_executor;
INSERT INTO mc_private.project_scope_validator_backup SELECT oid::regprocedure::text,pg_get_functiondef(oid),pg_get_userbyid(proowner),proacl,provolatile FROM pg_proc WHERE oid IN ('mc_private.validate_development_task(jsonb)'::regprocedure,'mc_private.validate_task_review(jsonb)'::regprocedure,'public.mc_owner_development_task_list()'::regprocedure,'public.mc_owner_development_task_save(jsonb,bigint)'::regprocedure,'public.mc_owner_task_review_list(text,bigint,integer)'::regprocedure,'public.mc_owner_task_review_append(jsonb,uuid,bigint)'::regprocedure);
CREATE TABLE mc_private.project_scope_policy_backup(policy_name text PRIMARY KEY,relation_name text NOT NULL,with_check text NOT NULL);
REVOKE ALL ON mc_private.project_scope_policy_backup FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON mc_private.project_scope_policy_backup TO mc_continuity_executor;
INSERT INTO mc_private.project_scope_policy_backup SELECT polname,polrelid::regclass::text,pg_get_expr(polwithcheck,polrelid) FROM pg_policy WHERE (polrelid='mc_private.development_tasks'::regclass AND polname='owner_tasks') OR (polrelid='mc_private.task_review_decisions'::regclass AND polname='owner_task_review_append');
DO $pre$ BEGIN IF (SELECT count(*) FROM mc_private.project_scope_policy_backup)<>2 THEN RAISE EXCEPTION 'EXACT_POLICIES_REQUIRED';END IF;END $pre$;
CREATE TABLE mc_private.explicit_project_scope_grants(
 owner_subject uuid NOT NULL,project_id text NOT NULL,grant_document jsonb NOT NULL,
 PRIMARY KEY(owner_subject,project_id),
 CHECK(coalesce(
  jsonb_typeof(grant_document)='object' AND grant_document ?& ARRAY['schemaVersion','projectId','ownerSubject','repositoryId','repositoryNumericId','ref','registrationRequestDigest','approvalRef','revision','expiresAt','revoked','capabilities'] AND grant_document-ARRAY['schemaVersion','projectId','ownerSubject','repositoryId','repositoryNumericId','ref','registrationRequestDigest','approvalRef','revision','expiresAt','revoked','capabilities']='{}'::jsonb
  AND grant_document->>'schemaVersion'='mc.project-scope-grant.v1'
  AND jsonb_typeof(grant_document->'schemaVersion')='string'
  AND jsonb_typeof(grant_document->'projectId')='string'
  AND jsonb_typeof(grant_document->'ownerSubject')='string'
  AND jsonb_typeof(grant_document->'repositoryId')='string'
  AND jsonb_typeof(grant_document->'ref')='string'
  AND jsonb_typeof(grant_document->'registrationRequestDigest')='string'
  AND jsonb_typeof(grant_document->'approvalRef')='string'
  AND project_id~'^[A-Z][A-Z0-9_]{2,63}$'
  AND project_id NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  AND grant_document->>'projectId'=project_id AND grant_document->>'ownerSubject'=owner_subject::text
  AND grant_document->>'repositoryId'~'^JoeyAJ/[-A-Za-z0-9_.]+$' AND char_length(grant_document->>'repositoryId')<=200
  AND (grant_document->>'repositoryNumericId') NOT IN ('1404959099','1250989709','1183908659','1402869585','1403778863')
  AND jsonb_typeof(grant_document->'repositoryNumericId')='number' AND grant_document->>'repositoryNumericId'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'repositoryNumericId')::bigint<=9007199254740991
  AND jsonb_typeof(grant_document->'revision')='number' AND grant_document->>'revision'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'revision')::bigint<=9007199254740991
  AND jsonb_typeof(grant_document->'expiresAt')='number' AND grant_document->>'expiresAt'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'expiresAt')::bigint<=9007199254740991
  AND grant_document->>'registrationRequestDigest'~'^[a-f0-9]{64}$'
  AND grant_document->>'approvalRef'~'^[-A-Za-z0-9_.:]{1,120}$'
  AND grant_document->>'ref'~'^[-A-Za-z0-9_./]+$' AND char_length(grant_document->>'ref')<=255 AND grant_document->>'ref' NOT LIKE '%..%' AND grant_document->>'ref' NOT LIKE '%//%' AND grant_document->>'ref' NOT LIKE '/%' AND grant_document->>'ref' NOT LIKE '-%' AND grant_document->>'ref' NOT LIKE '%/'
  AND jsonb_typeof(grant_document->'revoked')='boolean'
  AND grant_document->'capabilities'='{"sourceRead":true,"reportRead":true,"reportWrite":true,"task":true,"review":true}'::jsonb,false))
);
REVOKE ALL ON mc_private.explicit_project_scope_grants FROM PUBLIC,anon,authenticated,service_role,mc_continuity_executor;
ALTER TABLE mc_private.explicit_project_scope_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.explicit_project_scope_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY explicit_project_owner_read ON mc_private.explicit_project_scope_grants FOR SELECT TO mc_continuity_executor USING(owner_subject=mc_private.project_draft_actor());
GRANT SELECT ON mc_private.explicit_project_scope_grants TO mc_continuity_executor;
CREATE POLICY explicit_project_admin_write ON mc_private.explicit_project_scope_grants TO postgres USING(true) WITH CHECK(true);

GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE FUNCTION mc_private.explicit_project_scope_allowed(p text,t text,operation text,repository text,canonical_ref text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $body$
DECLARE actor uuid;g jsonb;
BEGIN
 IF p IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM') THEN RETURN true;END IF;
 IF t IS DISTINCT FROM 'BASELINE' OR operation IS NULL OR operation NOT IN ('task','review') THEN RETURN false;END IF;
 actor:=mc_private.project_draft_actor();
 SELECT grant_document INTO g FROM mc_private.explicit_project_scope_grants WHERE owner_subject=actor AND project_id=p;
 IF g IS NULL OR g->'revoked' IS DISTINCT FROM 'false'::jsonb OR (g->>'expiresAt')::bigint<=floor(extract(epoch FROM clock_timestamp())*1000) THEN RETURN false;END IF;
 IF operation='review' AND (repository IS DISTINCT FROM g->>'repositoryId' OR canonical_ref IS DISTINCT FROM g->>'ref') THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
REVOKE ALL ON FUNCTION mc_private.explicit_project_scope_allowed(text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
ALTER POLICY owner_tasks ON mc_private.development_tasks WITH CHECK(owner_subject=mc_private.project_draft_actor() AND mc_private.explicit_project_scope_allowed(task->>'projectId',task->>'track','task',NULL,NULL));
ALTER POLICY owner_task_review_append ON mc_private.task_review_decisions WITH CHECK(owner_subject=mc_private.project_draft_actor() AND mc_private.explicit_project_scope_allowed(review->>'projectId',review->>'track','review',review->>'repositoryId',review->>'canonicalRef'));
-- USING stays exact Owner for restricted internal count/CAS reads. Anonymous,
-- authenticated and service_role have NO table access. Public list RPCs below
-- enforce project grants separately, preserving physical Owner-global capacity.
CREATE OR REPLACE FUNCTION mc_private.validate_development_task(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $body$
DECLARE p jsonb;k text;v text;lim integer;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','taskId','revision','createdAt','updatedAt','projectId','track','request']),false)
  OR d->>'schemaVersion' IS DISTINCT FROM 'mc.development-task.v1'
  OR jsonb_typeof(d->'taskId') IS DISTINCT FROM 'string'
  OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR jsonb_typeof(d->'revision') IS DISTINCT FROM 'number'
  OR d->>'revision' !~ '^[1-9][0-9]{0,5}$'
  OR (d->>'revision')::bigint>100000
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>98304 THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['createdAt','updatedAt']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string'
   OR d->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
   OR to_char((d->>k)::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>d->>k THEN RETURN false; END IF;
 END LOOP;
 IF (d->>'updatedAt')::timestamptz<(d->>'createdAt')::timestamptz THEN RETURN false; END IF;
 IF jsonb_typeof(d->'projectId') IS DISTINCT FROM 'string' OR d->>'projectId' !~ '^[A-Z][A-Z0-9_]{2,63}$'
  OR jsonb_typeof(d->'track') IS DISTINCT FROM 'string' OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM' THEN RETURN false;END IF;
 p:=d->'request';
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['feature','acceptance','constraints']),false) THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['feature','acceptance','constraints']) LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
  v:=p->>k;lim:=CASE k WHEN 'feature' THEN 32768 ELSE 6000 END;
  IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>lim
   OR v<>btrim(v,U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
   OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}|\y(password|secret|token)["'']?[[:space:]]*[:=]|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+' THEN RETURN false;END IF;
 END LOOP;
 IF p->>'feature'='' THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
CREATE OR REPLACE FUNCTION mc_private.validate_task_review(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $body$
DECLARE k text;v text;b jsonb;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','projectId','track','taskId','taskRequirements','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','reportSequence','runId','workRef','codeSha','decision','comment']),false) THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['schemaVersion','projectId','track','taskId','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','runId','workRef','codeSha','decision','comment']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
 END LOOP;
 IF d->>'schemaVersion'<>'mc.owner-task-review.v1' OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR d->>'projectId' !~ '^[A-Z][A-Z0-9_]{2,63}$'
  OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM'
  OR d->>'repositoryId' !~ '^[-A-Za-z0-9_.]+/[-A-Za-z0-9_.]+$' OR char_length(d->>'repositoryId')>200
  OR d->>'runId' !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$'
  OR d->>'reportRef'<>'mc/progress' OR d->>'reportPath' NOT IN ('.mission-control/runs/'||(d->>'runId')||'.json','.mission-control/runs-page-2/'||(d->>'runId')||'.json')
  OR jsonb_typeof(d->'reportSequence') IS DISTINCT FROM 'number' OR d->>'reportSequence' !~ '^[1-9][0-9]*$'
  OR (d->>'reportSequence')::bigint NOT BETWEEN 2 AND 64
  OR d->>'decision' NOT IN ('APPROVE','REQUEST_CHANGES') THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['canonicalRef','workRef']) LOOP
  v:=d->>k;IF v !~ '^[-A-Za-z0-9_./]+$' OR char_length(v)>255 OR v LIKE '%..%' OR v LIKE '/%' OR v LIKE '-%' OR v LIKE '%/' OR v LIKE '%//%' THEN RETURN false;END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['canonicalHeadSha','reportHeadSha','reportBlobId','codeSha']) LOOP IF d->>k !~ '^[a-f0-9]{40}$' THEN RETURN false;END IF;END LOOP;
 b:=d->'taskRequirements';
 IF NOT coalesce(mc_private.exact_keys(b,ARRAY['schemaVersion','revision','requestDigest']),false)
  OR jsonb_typeof(b->'schemaVersion') IS DISTINCT FROM 'string' OR b->>'schemaVersion'<>'mc.task-requirements.v1'
  OR jsonb_typeof(b->'revision') IS DISTINCT FROM 'number' OR b->>'revision' !~ '^[1-9][0-9]{0,5}$' OR (b->>'revision')::bigint>100000
  OR jsonb_typeof(b->'requestDigest') IS DISTINCT FROM 'string' OR b->>'requestDigest' !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 v:=d->>'comment';
 IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>2000
  OR octet_length(convert_to(v,'UTF8'))>8192 OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
  OR v~*'gh[pousr]_|github_pat_|Bearer[[:space:]]|sb_secret_|PRIVATE KEY|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.]|\y(password|secret|token)["'']?[[:space:]]*[:=]|api[[:space:]_-]*key["'']?[[:space:]]*[:=]|\y[a-z]{2,12}://|\y(javascript|data|file):'
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>16384 THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
CREATE OR REPLACE FUNCTION public.mc_owner_development_task_list() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 SELECT coalesce(jsonb_agg(task ORDER BY updated_at DESC,task_id),'[]'::jsonb) INTO out_value
  FROM mc_private.development_tasks WHERE owner_subject=actor AND mc_private.explicit_project_scope_allowed(task->>'projectId',task->>'track','task',NULL,NULL);
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASKS','tasks',out_value);
END $body$;
CREATE OR REPLACE FUNCTION public.mc_owner_development_task_save(task jsonb,expected_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;old mc_private.development_tasks%ROWTYPE;id text;old_found boolean;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF expected_revision IS NULL OR expected_revision<0 OR expected_revision>=100000
  OR NOT mc_private.validate_development_task(task) OR (task->>'revision')::bigint<>expected_revision+1 THEN
  RAISE EXCEPTION 'TASK_INVALID' USING ERRCODE='22023';
 END IF;
 id:=task->>'taskId';
 PERFORM pg_advisory_xact_lock(hashtextextended('mc.development_tasks:'||actor::text,0));
 SELECT * INTO old FROM mc_private.development_tasks d WHERE d.owner_subject=actor AND d.task_id=id FOR UPDATE;old_found:=FOUND;

 PERFORM mc_private.project_draft_actor();IF NOT mc_private.explicit_project_scope_allowed(task->>'projectId',task->>'track','task',NULL,NULL) THEN RAISE EXCEPTION 'TASK_SCOPE_DENIED' USING ERRCODE='42501';END IF;
 IF old_found THEN
  -- Idempotent replay after a committed write whose response was lost.
  -- Only the exact same complete validated JSON payload and next revision qualify.
  IF old.revision=expected_revision+1 AND old.task=$1 THEN
   PERFORM mc_private.project_draft_actor();
   RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASK_SAVED','task',old.task);
  END IF;
  IF old.revision<>expected_revision OR task->>'projectId' IS DISTINCT FROM old.task->>'projectId' OR task->>'track' IS DISTINCT FROM old.task->>'track' OR task->>'createdAt'<>old.task->>'createdAt'
   OR (task->>'updatedAt')::timestamptz<(old.task->>'updatedAt')::timestamptz THEN
   RAISE EXCEPTION 'TASK_REVISION_CONFLICT' USING ERRCODE='40001';
  END IF;
 PERFORM mc_private.project_draft_actor();IF NOT mc_private.explicit_project_scope_allowed(task->>'projectId',task->>'track','task',NULL,NULL) THEN RAISE EXCEPTION 'TASK_SCOPE_DENIED' USING ERRCODE='42501';END IF;
  UPDATE mc_private.development_tasks d SET task=$1,revision=expected_revision+1,updated_at=clock_timestamp()
   WHERE d.owner_subject=actor AND d.task_id=id;
 ELSE
  IF expected_revision<>0 THEN RAISE EXCEPTION 'TASK_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF (SELECT count(*) FROM mc_private.development_tasks WHERE owner_subject=actor)>=12 THEN RAISE EXCEPTION 'TASK_CAPACITY'; END IF;
 PERFORM mc_private.project_draft_actor();IF NOT mc_private.explicit_project_scope_allowed(task->>'projectId',task->>'track','task',NULL,NULL) THEN RAISE EXCEPTION 'TASK_SCOPE_DENIED' USING ERRCODE='42501';END IF;
  INSERT INTO mc_private.development_tasks(owner_subject,task_id,revision,task) VALUES(actor,id,1,$1);
 END IF;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASK_SAVED','task',$1);
END $body$;
CREATE OR REPLACE FUNCTION public.mc_owner_task_review_list(task_id text,after_sequence bigint,page_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;n bigint;rows jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF task_id IS NULL OR task_id !~ '^task_[a-f0-9]{24}$' OR after_sequence IS NULL OR after_sequence NOT BETWEEN 0 AND 20 OR page_limit IS NULL OR page_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'TASK_REVIEW_INVALID' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM mc_private.development_tasks t WHERE t.owner_subject=actor AND t.task_id=$1 AND mc_private.explicit_project_scope_allowed(t.task->>'projectId',t.task->>'track','task',NULL,NULL)) THEN RAISE EXCEPTION 'TASK_REVIEW_TASK_REQUIRED' USING ERRCODE='42501';END IF;
 SELECT coalesce(max(d.decision_sequence),0) INTO n FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=$1 AND mc_private.explicit_project_scope_allowed(d.review->>'projectId',d.review->>'track','review',d.review->>'repositoryId',d.review->>'canonicalRef');
 IF after_sequence>n THEN RAISE EXCEPTION 'TASK_REVIEW_CURSOR_CONFLICT' USING ERRCODE='40001';END IF;
 SELECT coalesce(jsonb_agg(x.record ORDER BY x.sequence),'[]'::jsonb) INTO rows FROM (
  SELECT d.decision_sequence AS sequence,jsonb_build_object('sequence',d.decision_sequence,'operationId',d.operation_id,'decisionDigest',d.decision_digest,'committedAt',to_char(d.committed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'review',d.review) AS record
  FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=$1 AND mc_private.explicit_project_scope_allowed(d.review->>'projectId',d.review->>'track','review',d.review->>'repositoryId',d.review->>'canonicalRef') AND d.decision_sequence>$2 AND d.decision_sequence<=n ORDER BY d.decision_sequence LIMIT $3
 ) x;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_TASK_REVIEW_RECORDED','taskId',$1,'afterSequence',$2,'sequence',n,'records',rows,'executionAuthorized',false);
END $body$;
CREATE OR REPLACE FUNCTION public.mc_owner_task_review_append(review jsonb,operation_id uuid,expected_sequence bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE task_found boolean;actor uuid;t mc_private.development_tasks%ROWTYPE;old mc_private.task_review_decisions%ROWTYPE;stored mc_private.task_review_decisions%ROWTYPE;n bigint;payload jsonb;request_digest text;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF NOT mc_private.validate_task_review(review) OR operation_id IS NULL OR operation_id='00000000-0000-0000-0000-000000000000'::uuid OR expected_sequence IS NULL OR expected_sequence NOT BETWEEN 0 AND 20 THEN RAISE EXCEPTION 'TASK_REVIEW_INVALID' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('mc.task_review_decisions:'||actor::text,0));
 PERFORM mc_private.project_draft_actor();
 SELECT * INTO t FROM mc_private.development_tasks d WHERE d.owner_subject=actor AND d.task_id=$1->>'taskId' FOR UPDATE;task_found:=FOUND;
 PERFORM mc_private.project_draft_actor();IF NOT mc_private.explicit_project_scope_allowed(review->>'projectId',review->>'track','review',review->>'repositoryId',review->>'canonicalRef') THEN RAISE EXCEPTION 'TASK_REVIEW_SCOPE_DENIED' USING ERRCODE='42501';END IF;
 IF NOT task_found OR t.task->>'projectId' IS DISTINCT FROM review->>'projectId' OR t.task->>'track' IS DISTINCT FROM review->>'track' THEN RAISE EXCEPTION 'TASK_REVIEW_TASK_REQUIRED' USING ERRCODE='42501';END IF;
 SELECT * INTO old FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.operation_id=$2;
 IF FOUND THEN
  IF old.review IS DISTINCT FROM $1 OR old.decision_sequence<>$3+1 THEN RAISE EXCEPTION 'TASK_REVIEW_OPERATION_CONFLICT' USING ERRCODE='40001';END IF;
  -- Exact lost-response replay acknowledges the original dated record, never a new current acceptance.
  stored:=old;
 ELSE
  payload:=jsonb_build_object('schemaVersion',t.task->'schemaVersion','projectId',t.task->'projectId','track',t.task->'track','taskId',t.task->'taskId','revision',t.task->'revision','request',t.task->'request');
  request_digest:=encode(sha256(convert_to(mc_private.canonical_json(payload),'UTF8')),'hex');
  IF t.revision<>(review->'taskRequirements'->>'revision')::bigint OR request_digest IS DISTINCT FROM review->'taskRequirements'->>'requestDigest' THEN RAISE EXCEPTION 'TASK_REVIEW_REQUIREMENTS_CHANGED' USING ERRCODE='40001';END IF;
  SELECT coalesce(max(d.decision_sequence),0) INTO n FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor AND d.task_id=t.task_id;
  IF n<>expected_sequence THEN RAISE EXCEPTION 'TASK_REVIEW_SEQUENCE_CONFLICT' USING ERRCODE='40001';END IF;
  IF n>=20 OR (SELECT count(*) FROM mc_private.task_review_decisions d WHERE d.owner_subject=actor)>=120 THEN RAISE EXCEPTION 'TASK_REVIEW_CAPACITY' USING ERRCODE='54000';END IF;
 PERFORM mc_private.project_draft_actor();IF NOT mc_private.explicit_project_scope_allowed(review->>'projectId',review->>'track','review',review->>'repositoryId',review->>'canonicalRef') THEN RAISE EXCEPTION 'TASK_REVIEW_SCOPE_DENIED' USING ERRCODE='42501';END IF;
  INSERT INTO mc_private.task_review_decisions(owner_subject,task_id,decision_sequence,operation_id,decision_digest,review)
   VALUES(actor,t.task_id,n+1,$2,encode(sha256(convert_to(mc_private.canonical_json($1),'UTF8')),'hex'),$1) RETURNING * INTO stored;
 END IF;
 PERFORM mc_private.project_draft_actor();
 out_value:=jsonb_build_object('sequence',stored.decision_sequence,'operationId',stored.operation_id,'decisionDigest',stored.decision_digest,'committedAt',to_char(stored.committed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'review',stored.review);
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_TASK_REVIEW_RECORDED','record',out_value,'executionAuthorized',false);
END $body$;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
DO $verify$ BEGIN
 IF EXISTS(SELECT 1 FROM mc_private.project_scope_validator_backup b JOIN pg_proc p ON p.oid=to_regprocedure(b.signature) WHERE pg_get_userbyid(p.proowner)<>b.owner_name OR p.proacl IS DISTINCT FROM b.acl OR p.provolatile<>b.volatility) THEN RAISE EXCEPTION 'OWNER_ACL_VOLATILITY_CHANGED';END IF;
 IF EXISTS(SELECT 1 FROM mc_private.explicit_project_scope_grants) THEN RAISE EXCEPTION 'ZERO_INITIAL_GRANTS_REQUIRED';END IF;
END $verify$;
COMMIT;
