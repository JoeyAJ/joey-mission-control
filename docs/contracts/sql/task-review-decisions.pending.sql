-- Bounded four-object Owner acceptance ledger; explicit Owner approval 2026-10-11T12:43:39Z.
-- Target scmvedfqwlhkyvljymjj. Review/hash/native gates BEFORE apply or server activation.
-- Limits remain 120/Owner,20/task,50/page,16KiB review,2000 UTF16 units AND8KiB comment.
-- No Auth/helper/source/report modification, new keys/roles/extensions or execution authority.
BEGIN;
DO $preconditions$
BEGIN
 IF to_regclass('mc_private.task_review_decisions') IS NOT NULL
  OR to_regprocedure('mc_private.validate_task_review(jsonb)') IS NOT NULL
  OR to_regprocedure('public.mc_owner_task_review_list(text,bigint,integer)') IS NOT NULL
  OR to_regprocedure('public.mc_owner_task_review_append(jsonb,uuid,bigint)') IS NOT NULL THEN
  RAISE EXCEPTION 'NEW_OBJECTS_MUST_BE_ABSENT';
 END IF;
 IF to_regclass('mc_private.development_tasks') IS NULL
  OR to_regprocedure('mc_private.project_draft_actor()') IS NULL
  OR to_regprocedure('mc_private.canonical_json(jsonb)') IS NULL
  OR to_regprocedure('mc_private.exact_keys(jsonb,text[])') IS NULL
  OR to_regprocedure('pg_catalog.sha256(bytea)') IS NULL THEN RAISE EXCEPTION 'EXISTING_HELPERS_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
  OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='mc_continuity_executor' AND u.rolname='postgres' AND NOT m.set_option)
  OR NOT has_function_privilege('mc_continuity_executor','mc_private.project_draft_actor()','EXECUTE')
  OR NOT has_function_privilege('mc_continuity_executor','mc_private.canonical_json(jsonb)','EXECUTE')
  OR NOT has_function_privilege('mc_continuity_executor','pg_catalog.sha256(bytea)','EXECUTE')
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='mc_private.development_tasks'::regclass AND relowner='mc_continuity_executor'::regrole AND relrowsecurity AND relforcerowsecurity) THEN
  RAISE EXCEPTION 'EXISTING_RESTRICTED_EXECUTOR_REQUIRED';
 END IF;
END $preconditions$;
-- Existing bounded migration protocol; these exact temporary permissions are restored in this transaction.
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;

CREATE FUNCTION mc_private.validate_task_review(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $body$
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
END $body$;
REVOKE ALL ON FUNCTION mc_private.validate_task_review(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE mc_private.task_review_decisions(
 owner_subject uuid NOT NULL,
 task_id text NOT NULL,
 decision_sequence bigint NOT NULL CHECK(decision_sequence BETWEEN 1 AND 20),
 operation_id uuid NOT NULL CHECK(operation_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 decision_digest text NOT NULL CHECK(decision_digest~'^[a-f0-9]{64}$'),
 committed_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds',clock_timestamp()),
 review jsonb NOT NULL CHECK(mc_private.validate_task_review(review)),
 PRIMARY KEY(owner_subject,task_id,decision_sequence),
 UNIQUE(owner_subject,operation_id),
 FOREIGN KEY(owner_subject,task_id) REFERENCES mc_private.development_tasks(owner_subject,task_id),
 CHECK(task_id=review->>'taskId')
);
REVOKE ALL ON TABLE mc_private.task_review_decisions FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE mc_private.task_review_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.task_review_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_task_review_read ON mc_private.task_review_decisions FOR SELECT TO mc_continuity_executor USING(owner_subject=mc_private.project_draft_actor());
CREATE POLICY owner_task_review_append ON mc_private.task_review_decisions FOR INSERT TO mc_continuity_executor WITH CHECK(owner_subject=mc_private.project_draft_actor());
-- No UPDATE/DELETE policy or public table grants.

CREATE FUNCTION public.mc_owner_task_review_list(task_id text,after_sequence bigint,page_limit integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
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
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_task_review_list(text,bigint,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_task_review_list(text,bigint,integer) TO authenticated;

CREATE FUNCTION public.mc_owner_task_review_append(review jsonb,operation_id uuid,expected_sequence bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
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
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_task_review_append(jsonb,uuid,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_task_review_append(jsonb,uuid,bigint) TO authenticated;

RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
