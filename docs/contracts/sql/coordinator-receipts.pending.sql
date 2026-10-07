-- Offline template. Freeze approved scope before applying only to the MC project.
BEGIN;
DO $preflight$
BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres' THEN RAISE EXCEPTION 'P3_MANAGEMENT_INSTALL_ONLY'; END IF;
 IF pg_catalog.to_regclass('mc_private.coordinator_receipts') IS NOT NULL
  OR pg_catalog.to_regprocedure('mc_private.append_coordinator_receipt(jsonb)') IS NOT NULL
  OR pg_catalog.to_regprocedure('public.mc_owner_coordinator_receipts(text,bigint,integer)') IS NOT NULL THEN RAISE EXCEPTION 'P3_OBJECTS_EXIST'; END IF;
 IF pg_catalog.has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET') THEN RAISE EXCEPTION 'P3_INSTALL_ACL_DRIFT'; END IF;
 IF (SELECT count(*) FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text)
  JOIN mc_private.heads h ON h.project_id=s.project_id AND h.epoch=s.epoch AND h.baseline_sha=s.baseline_sha AND h.revision=0 AND NOT h.writes_enabled
  JOIN mc_private.contexts c ON c.project_id=s.project_id AND c.context_hash=s.context_hash)<>4
 THEN RAISE EXCEPTION 'P3_FROZEN_SCOPE_DRIFT'; END IF;
END; $preflight$;
CREATE TABLE mc_private.coordinator_receipts (
 project_id text NOT NULL REFERENCES mc_private.heads(project_id), epoch text NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 10000),
 operation_id text NOT NULL CHECK(operation_id ~ '^[A-Za-z0-9_-]{1,80}$'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 writer_id text NOT NULL CHECK(writer_id='nexaeon-coordinator'),
 approval_ref text NOT NULL CHECK(approval_ref='@@APPROVAL@@'),
 tool_invocation_ref text NOT NULL CHECK(tool_invocation_ref ~ '^[A-Za-z0-9_-]{1,128}$'),
 actual_sql_caller text NOT NULL CHECK(actual_sql_caller='postgres'),
 committed_at bigint NOT NULL CHECK(committed_at>0),
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object' AND octet_length(content::text)<=8192),
 charged_bytes bigint NOT NULL CHECK(charged_bytes BETWEEN 2049 AND 10240),
 PRIMARY KEY(project_id,epoch,revision), UNIQUE(project_id,epoch,operation_id)
);
CREATE UNIQUE INDEX coordinator_one_proposal ON mc_private.coordinator_receipts(project_id,epoch,((content->'operation'->'payload')->>'proposalId')) WHERE content->'operation'->>'kind'='proposal';
CREATE INDEX coordinator_proposal_lookup ON mc_private.coordinator_receipts(project_id,epoch,((content->'operation'->'payload')->>'proposalId'));
ALTER TABLE mc_private.coordinator_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.coordinator_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON mc_private.coordinator_receipts FROM PUBLIC,anon,authenticated,service_role,mc_continuity_executor;
GRANT SELECT,INSERT ON mc_private.coordinator_receipts TO mc_continuity_executor;
CREATE POLICY coordinator_executor_read ON mc_private.coordinator_receipts FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY coordinator_executor_append ON mc_private.coordinator_receipts FOR INSERT TO mc_continuity_executor WITH CHECK(true);
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
DO $integrity$ BEGIN
 IF (SELECT count(*) FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,context_hash text)
 JOIN mc_private.contexts c ON c.project_id=s.project_id AND c.context_hash=s.context_hash
 WHERE pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(c.filtered_claims),'UTF8')),'hex')=s.context_hash)<>4
 THEN RAISE EXCEPTION 'P3_FROZEN_INTEGRITY_DRIFT'; END IF;
END; $integrity$;
RESET ROLE;

CREATE FUNCTION mc_private.append_coordinator_receipt(draft jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $append$
DECLARE op jsonb; stable jsonb; scope record; head record; budget record; prior record; proposal record;
 rev bigint; last_time bigint; now_ms bigint; charge bigint; content_digest text; row_value mc_private.coordinator_receipts%ROWTYPE;
BEGIN
 IF session_user<>'postgres' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='P3_MANAGEMENT_CALLER_ONLY'; END IF;
 IF NOT coalesce(mc_private.exact_keys(draft,ARRAY['writerId','mode','approvalRef','toolInvocationRef','summary','operation']),false)
  OR draft->>'writerId' IS DISTINCT FROM 'nexaeon-coordinator' OR draft->>'mode' IS DISTINCT FROM 'TOOL_MEDIATED'
  OR draft->>'approvalRef' IS DISTINCT FROM '@@APPROVAL@@'
  OR jsonb_typeof(draft->'toolInvocationRef') IS DISTINCT FROM 'string' OR draft->>'toolInvocationRef' !~ '^[A-Za-z0-9_-]{1,128}$'
  OR jsonb_typeof(draft->'summary') IS DISTINCT FROM 'string' OR length(draft->>'summary') NOT BETWEEN 1 AND 1024
  OR draft->>'summary' ~* '/(Users|home|private|workspace|tmp)/|Bearer[[:space:]]|((password|token|secret)[[:space:]]*[:=])|sb_secret_|eyJ[A-Za-z0-9_-]+\.|PRIVATE KEY'
 THEN RAISE EXCEPTION 'P3_ENVELOPE_DENIED'; END IF;
 op:=draft->'operation';PERFORM mc_private.validate_operation(op);
 IF op->>'kind' NOT IN ('proposal','result') THEN RAISE EXCEPTION 'P3_OWNER_DECISION_EXCLUDED'; END IF;
 SELECT * INTO scope FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text) WHERE s.project_id=op->>'projectId';
 IF NOT FOUND OR op->>'epoch' IS DISTINCT FROM scope.epoch OR op->>'baselineSha' IS DISTINCT FROM scope.baseline_sha THEN RAISE EXCEPTION 'P3_SCOPE_CONFLICT'; END IF;
 -- Shared budget first, then the existing frozen head: one lock order for all writers.
 SELECT * INTO STRICT budget FROM mc_private.storage_budget WHERE singleton FOR UPDATE;
 SELECT * INTO STRICT head FROM mc_private.heads h WHERE h.project_id=scope.project_id FOR UPDATE;
 IF head.epoch IS DISTINCT FROM scope.epoch OR head.baseline_sha IS DISTINCT FROM scope.baseline_sha OR head.revision<>0 OR head.writes_enabled
  OR NOT EXISTS(SELECT 1 FROM mc_private.contexts c WHERE c.project_id=scope.project_id AND c.context_hash=scope.context_hash)
 THEN RAISE EXCEPTION 'P3_SOURCE_CUTOVER_PAUSED'; END IF;
 stable:=pg_catalog.jsonb_build_object('writerId',draft->>'writerId','approvalRef',draft->>'approvalRef','summary',draft->>'summary','operation',op);
 IF pg_catalog.octet_length(stable::text)>8192 OR pg_catalog.octet_length(mc_private.canonical_json(stable))>8192 THEN RAISE EXCEPTION 'P3_RECORD_CAPACITY'; END IF;
 content_digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(stable),'UTF8')),'hex');
 SELECT * INTO prior FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch AND r.operation_id=op->>'id';
 IF FOUND THEN
  IF prior.digest<>content_digest OR prior.writer_id<>draft->>'writerId' THEN RAISE EXCEPTION 'P3_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN pg_catalog.jsonb_build_object('revision',prior.revision,'operationId',prior.operation_id,'digest',prior.digest,'committedAt',prior.committed_at,'duplicate',true);
 END IF;
 SELECT coalesce(max(r.revision),0),coalesce(max(r.committed_at),0) INTO rev,last_time FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch;
 IF (op->>'expectedRevision')::bigint<>rev THEN RAISE EXCEPTION 'P3_REVISION_CONFLICT'; END IF;
 now_ms:=floor(extract(epoch FROM pg_catalog.clock_timestamp())*1000)::bigint;
 IF now_ms<last_time THEN RAISE EXCEPTION 'P3_SERVER_CLOCK'; END IF;
 SELECT * INTO proposal FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch AND r.content->'operation'->>'kind'='proposal' AND r.content->'operation'->'payload'->>'proposalId'=op->'payload'->>'proposalId';
 IF op->>'kind'='proposal' THEN
  IF FOUND THEN RAISE EXCEPTION 'P3_PROPOSAL_EXISTS'; END IF;
  IF op->'payload'->>'contextHash' IS DISTINCT FROM scope.context_hash THEN RAISE EXCEPTION 'P3_CONTEXT_CONFLICT'; END IF;
  IF (op->'payload'->>'expiresAt')::bigint<=now_ms OR (op->'payload'->>'expiresAt')::bigint>now_ms+86400000 THEN RAISE EXCEPTION 'P3_PROPOSAL_EXPIRY'; END IF;
 ELSE
  IF NOT FOUND OR proposal.content->'operation'->'payload'->>'contextHash' IS DISTINCT FROM scope.context_hash THEN RAISE EXCEPTION 'P3_PROPOSAL_REQUIRED'; END IF;
  IF now_ms>=(proposal.content->'operation'->'payload'->>'expiresAt')::bigint THEN RAISE EXCEPTION 'P3_PROPOSAL_EXPIRED'; END IF;
  IF op->'payload'->>'qualification' IS DISTINCT FROM 'SUBMITTER_ATTESTED' THEN RAISE EXCEPTION 'P3_RESULT_QUALIFICATION'; END IF;
 END IF;
 charge:=greatest(pg_catalog.octet_length(stable::text),pg_catalog.octet_length(mc_private.canonical_json(stable)))+2048;
 IF rev>=10000 OR budget.event_count>=10000 OR budget.used_bytes+charge>104857600 THEN RAISE EXCEPTION 'P3_SHARED_CAPACITY'; END IF;
 INSERT INTO mc_private.coordinator_receipts(project_id,epoch,revision,operation_id,digest,writer_id,approval_ref,tool_invocation_ref,actual_sql_caller,committed_at,content,charged_bytes)
 VALUES(scope.project_id,scope.epoch,rev+1,op->>'id',content_digest,draft->>'writerId',draft->>'approvalRef',draft->>'toolInvocationRef',session_user,now_ms,stable,charge) RETURNING * INTO row_value;
 UPDATE mc_private.storage_budget SET event_count=event_count+1,used_bytes=used_bytes+charge WHERE singleton;
 RETURN pg_catalog.jsonb_build_object('revision',row_value.revision,'operationId',row_value.operation_id,'digest',row_value.digest,'committedAt',row_value.committed_at,'duplicate',false);
END; $append$;
ALTER FUNCTION mc_private.append_coordinator_receipt(jsonb) OWNER TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
REVOKE ALL ON FUNCTION mc_private.append_coordinator_receipt(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION mc_private.append_coordinator_receipt(jsonb) TO postgres;
RESET ROLE;
CREATE FUNCTION public.mc_owner_coordinator_receipts(project text,after_revision bigint DEFAULT 0,page_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $read$
DECLARE actor record; scope record; discovered jsonb; rows jsonb; rev bigint; last_time bigint;
BEGIN
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 IF actor.subject IS DISTINCT FROM '@@OWNER@@'::uuid OR actor.aal IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='P3_OWNER_ASSURANCE_DENIED'; END IF;
 IF after_revision IS NULL OR after_revision<0 OR after_revision>10000 OR page_limit IS NULL OR page_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'P3_READ_RANGE'; END IF;
 SELECT * INTO scope FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text) WHERE s.project_id=project;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='P3_READ_PROJECT_DENIED'; END IF;
 discovered:=public.mc_owner_context_scope(project);
 IF discovered->>'contextHash' IS DISTINCT FROM scope.context_hash OR NOT EXISTS(SELECT 1 FROM mc_private.heads h WHERE h.project_id=project AND h.epoch=scope.epoch AND h.baseline_sha=scope.baseline_sha AND h.revision=0 AND NOT h.writes_enabled) THEN RAISE EXCEPTION 'P3_READ_SCOPE_DENIED'; END IF;
 SELECT coalesce(max(r.revision),0),coalesce(max(r.committed_at),0) INTO rev,last_time FROM mc_private.coordinator_receipts r WHERE r.project_id=project AND r.epoch=scope.epoch;
 SELECT coalesce(jsonb_agg(x ORDER BY (x->>'revision')::bigint),'[]'::jsonb) INTO rows FROM (
  SELECT pg_catalog.jsonb_build_object('revision',r.revision,'operationId',r.operation_id,'digest',r.digest,'writerId',r.writer_id,'approvalRef',r.approval_ref,'toolInvocationRef',r.tool_invocation_ref,'actualSqlCaller',r.actual_sql_caller,'committedAt',r.committed_at,'content',r.content) AS x
  FROM mc_private.coordinator_receipts r WHERE r.project_id=project AND r.epoch=scope.epoch AND r.revision>after_revision ORDER BY r.revision LIMIT page_limit
 ) bounded;
 RETURN pg_catalog.jsonb_build_object('schemaVersion',1,'projectId',project,'epoch',scope.epoch,'baselineSha',scope.baseline_sha,'contextHash',scope.context_hash,'revision',rev,'lastCommittedAt',last_time,'afterRevision',after_revision,'writerQualification','TOOL_MEDIATED_COORDINATOR_ATTESTATION','ownerDecisionEnabled',false,'runtimeConnected',false,'receipts',rows);
END; $read$;
ALTER FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer) OWNER TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
REVOKE ALL ON FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_coordinator_receipts(text,bigint,integer) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
