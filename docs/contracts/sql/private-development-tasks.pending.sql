-- REVIEW ONLY. NOT APPLIED. Independent task specifications; project draft approval does not authorize this.
-- Target: Supabase scmvedfqwlhkyvljymjj.
-- Requires separate explicit approval of this exact migration and its ACL changes.
-- Reuses installed project_draft_actor() with exact Owner/AAL2/live-session/NEXAEON membership.
-- No Agent executor, task-event ledger change, new project/source/report grant or merge authority.
-- No service-role client, key, bucket, paid resource, existing data or auth changes.
BEGIN;
DO $preconditions$
BEGIN
 IF to_regclass('mc_private.development_tasks') IS NOT NULL
  OR to_regprocedure('public.mc_owner_development_task_list()') IS NOT NULL
  OR to_regprocedure('public.mc_owner_development_task_save(jsonb,bigint)') IS NOT NULL
  OR to_regprocedure('mc_private.validate_development_task(jsonb)') IS NOT NULL THEN
  RAISE EXCEPTION 'NEW_OBJECTS_MUST_BE_ABSENT';
 END IF;
 IF to_regprocedure('mc_private.project_draft_actor()') IS NULL OR to_regprocedure('mc_private.owner_auth_verification()') IS NULL
  OR to_regprocedure('mc_private.canonical_json(jsonb)') IS NULL
  OR to_regprocedure('mc_private.exact_keys(jsonb,text[])') IS NULL THEN
  RAISE EXCEPTION 'EXISTING_VERIFIED_HELPERS_REQUIRED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
  OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
   JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='mc_continuity_executor'
   AND u.rolname='postgres' AND NOT m.set_option) THEN
  RAISE EXCEPTION 'EXISTING_RESTRICTED_EXECUTOR_REQUIRED';
 END IF;
 IF NOT has_function_privilege('mc_continuity_executor','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('authenticated','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('anon','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('service_role','mc_private.owner_auth_verification()','EXECUTE') THEN
  RAISE EXCEPTION 'EXISTING_HELPER_ACL_REQUIRED';
 END IF;
END $preconditions$;
-- Same existing migration protocol. These temporary grants are restored before COMMIT.
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;

CREATE FUNCTION mc_private.validate_development_task(d jsonb) RETURNS boolean
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
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}|\\y(password|secret|token)[[:space:]]*[:=]|\\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+' THEN RETURN false;END IF;
 END LOOP;
 IF p->>'feature'='' THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
REVOKE ALL ON FUNCTION mc_private.validate_development_task(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE mc_private.development_tasks(
 owner_subject uuid NOT NULL,
 task_id text NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 100000),
 task jsonb NOT NULL CHECK(mc_private.validate_development_task(task)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(owner_subject,task_id),
 CHECK(task_id=task->>'taskId' AND revision=(task->>'revision')::bigint)
);
REVOKE ALL ON TABLE mc_private.development_tasks FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE mc_private.development_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.development_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_tasks ON mc_private.development_tasks TO mc_continuity_executor
 USING(owner_subject=mc_private.project_draft_actor())
 WITH CHECK(owner_subject=mc_private.project_draft_actor());

CREATE FUNCTION public.mc_owner_development_task_list() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 SELECT coalesce(jsonb_agg(task ORDER BY updated_at DESC,task_id),'[]'::jsonb) INTO out_value
  FROM mc_private.development_tasks WHERE owner_subject=actor;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DEVELOPMENT_TASKS','tasks',out_value);
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_development_task_list() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_development_task_list() TO authenticated;

CREATE FUNCTION public.mc_owner_development_task_save(task jsonb,expected_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
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
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_development_task_save(jsonb,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_development_task_save(jsonb,bigint) TO authenticated;

RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;

-- Separate approved rollback transaction: drop only the two new public RPCs,
-- then mc_private.development_tasks, validate_development_task(jsonb).
-- Do not drop/alter existing auth helpers, members, roles, contexts, reports or grants.
