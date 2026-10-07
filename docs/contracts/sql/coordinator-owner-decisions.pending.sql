-- Offline template. Joey 2026-10-07 13:24:03 approved this narrow Owner-only bundle.
-- Freeze four existing scope pins before MC-only installation. No real decision seed.
BEGIN;
DO $preflight$ BEGIN
 IF session_user<>'postgres' OR current_user<>'postgres'
  OR pg_catalog.to_regclass('mc_private.coordinator_owner_decisions') IS NOT NULL
  OR pg_catalog.to_regprocedure('public.mc_owner_decide_coordinator_result(jsonb)') IS NOT NULL
  OR pg_catalog.to_regprocedure('public.mc_owner_coordinator_decisions(text,bigint,integer)') IS NOT NULL
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET')
 THEN RAISE EXCEPTION 'OWNER_DECISION_INSTALL_PRECONDITION'; END IF;
 IF (SELECT count(*) FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text)
  JOIN mc_private.heads h ON h.project_id=s.project_id AND h.epoch=s.epoch AND h.baseline_sha=s.baseline_sha AND h.revision=0 AND NOT h.writes_enabled
  JOIN mc_private.contexts c ON c.project_id=s.project_id AND c.context_hash=s.context_hash)<>4
 THEN RAISE EXCEPTION 'OWNER_DECISION_FROZEN_SCOPE_DRIFT'; END IF;
END; $preflight$;
CREATE TABLE mc_private.coordinator_owner_decisions(
 project_id text NOT NULL REFERENCES mc_private.heads(project_id),epoch text NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 10000),
 operation_id text NOT NULL CHECK(operation_id ~ '^[A-Za-z0-9_-]{1,80}$'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 owner_subject uuid NOT NULL CHECK(owner_subject='@@OWNER@@'::uuid),
 owner_session_id uuid NOT NULL,owner_aal text NOT NULL CHECK(owner_aal='aal2'),
 committed_at bigint NOT NULL CHECK(committed_at>0),
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object' AND octet_length(content::text)<=8192),
 charged_bytes bigint NOT NULL CHECK(charged_bytes BETWEEN 2049 AND 10240),
 PRIMARY KEY(project_id,epoch,revision),UNIQUE(project_id,epoch,operation_id)
);
CREATE UNIQUE INDEX coordinator_owner_one_final ON mc_private.coordinator_owner_decisions(project_id,epoch,(content->>'proposalId'));
ALTER TABLE mc_private.coordinator_owner_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.coordinator_owner_decisions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON mc_private.coordinator_owner_decisions FROM PUBLIC,anon,authenticated,service_role,mc_continuity_executor;
GRANT SELECT,INSERT ON mc_private.coordinator_owner_decisions TO mc_continuity_executor;
CREATE POLICY owner_decisions_executor_read ON mc_private.coordinator_owner_decisions FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY owner_decisions_executor_append ON mc_private.coordinator_owner_decisions FOR INSERT TO mc_continuity_executor WITH CHECK(true);
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE FUNCTION public.mc_owner_decide_coordinator_result(request jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $decision$
DECLARE actor record; scope record; head record; budget record; prior record; proposal record; result_row record;
 binding jsonb; stable jsonb; discovered jsonb; content_digest text; binding_digest text;
 journal_revision bigint; decision_revision bigint; last_time bigint; now_ms bigint; charge bigint;
 row_value mc_private.coordinator_owner_decisions%ROWTYPE;
BEGIN
 -- Management tools cannot act as Joey; normal PostgREST carries her verified session.
 IF session_user='postgres' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_BROWSER_ONLY'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 IF actor.subject IS DISTINCT FROM '@@OWNER@@'::uuid OR actor.aal IS DISTINCT FROM 'aal2'
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_ASSURANCE_DENIED'; END IF;
 IF NOT coalesce(mc_private.exact_keys(request,ARRAY['id','binding','bindingDigest','expectedDecisionRevision']),false)
  OR pg_catalog.octet_length(request::text)>12288
  OR jsonb_typeof(request->'id') IS DISTINCT FROM 'string' OR request->>'id' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR jsonb_typeof(request->'expectedDecisionRevision') IS DISTINCT FROM 'number' OR request->>'expectedDecisionRevision' !~ '^[0-9]{1,5}$' OR (request->>'expectedDecisionRevision')::bigint>10000
 THEN RAISE EXCEPTION 'OWNER_DECISION_REQUEST'; END IF;
 binding:=request->'binding';
 IF NOT coalesce(mc_private.exact_keys(binding,ARRAY['schemaVersion','projectId','epoch','baselineSha','contextHash','expectedRevision','proposalId','proposalOperationId','proposalDigest','acceptanceHash','resultOperationId','resultDigest','resultHash','evidenceHashes','resultQualification','decision','expiresAt']),false)
  OR binding->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(binding->'schemaVersion') IS DISTINCT FROM 'number'
  OR binding->>'decision' NOT IN ('ACCEPT','REJECT') OR jsonb_typeof(binding->'decision') IS DISTINCT FROM 'string'
  OR jsonb_typeof(binding->'expectedRevision') IS DISTINCT FROM 'number' OR binding->>'expectedRevision' !~ '^[0-9]{1,5}$' OR (binding->>'expectedRevision')::bigint>10000
  OR jsonb_typeof(binding->'expiresAt') IS DISTINCT FROM 'number' OR binding->>'expiresAt' !~ '^[0-9]{1,16}$' OR (binding->>'expiresAt')::numeric>9007199254740991
  OR jsonb_typeof(binding->'evidenceHashes') IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'OWNER_DECISION_BINDING'; END IF;
 SELECT * INTO scope FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text) WHERE s.project_id=binding->>'projectId';
 IF NOT FOUND OR binding->>'epoch' IS DISTINCT FROM scope.epoch OR binding->>'baselineSha' IS DISTINCT FROM scope.baseline_sha OR binding->>'contextHash' IS DISTINCT FROM scope.context_hash
 THEN RAISE EXCEPTION 'OWNER_DECISION_SCOPE'; END IF;
 discovered:=public.mc_owner_context_scope(scope.project_id);
 IF discovered->>'contextHash' IS DISTINCT FROM scope.context_hash THEN RAISE EXCEPTION 'OWNER_DECISION_SCOPE'; END IF;
 binding_digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(binding),'UTF8')),'hex');
 IF request->>'bindingDigest' IS DISTINCT FROM binding_digest THEN RAISE EXCEPTION 'OWNER_DECISION_BINDING_DIGEST'; END IF;
 SELECT * INTO STRICT budget FROM mc_private.storage_budget WHERE singleton FOR UPDATE;
 SELECT * INTO STRICT head FROM mc_private.heads h WHERE h.project_id=scope.project_id FOR UPDATE;
 IF head.epoch IS DISTINCT FROM scope.epoch OR head.baseline_sha IS DISTINCT FROM scope.baseline_sha OR head.revision<>0 OR head.writes_enabled
 THEN RAISE EXCEPTION 'OWNER_DECISION_SOURCE_CUTOVER'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 IF actor.subject IS DISTINCT FROM '@@OWNER@@'::uuid OR actor.aal IS DISTINCT FROM 'aal2' OR actor.expires_at<=floor(extract(epoch FROM pg_catalog.clock_timestamp())*1000)::bigint
  OR NOT EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=actor.subject AND m.project_id=scope.project_id AND m.member_role='OWNER' AND m.active)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_ASSURANCE_DENIED'; END IF;
 stable:=pg_catalog.jsonb_build_object('schemaVersion',1,'ownerSubject',actor.subject,'projectId',scope.project_id,'epoch',scope.epoch,'baselineSha',scope.baseline_sha,'contextHash',scope.context_hash,
  'proposalId',binding->'proposalId','proposalOperationId',binding->'proposalOperationId','proposalDigest',binding->'proposalDigest','acceptanceHash',binding->'acceptanceHash',
  'resultOperationId',binding->'resultOperationId','resultDigest',binding->'resultDigest','resultHash',binding->'resultHash','evidenceHashes',binding->'evidenceHashes','resultQualification',binding->'resultQualification','decision',binding->'decision');
 IF pg_catalog.octet_length(stable::text)>8192 THEN RAISE EXCEPTION 'OWNER_DECISION_RECORD_CAPACITY'; END IF;
 content_digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(stable),'UTF8')),'hex');
 SELECT * INTO prior FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=scope.project_id AND d.epoch=scope.epoch AND d.operation_id=request->>'id';
 IF FOUND THEN
  IF prior.digest IS DISTINCT FROM content_digest THEN RAISE EXCEPTION 'OWNER_DECISION_IDEMPOTENCY_CONFLICT'; END IF;
  row_value:=prior;
 ELSE
  SELECT coalesce(max(r.revision),0) INTO journal_revision FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch;
  SELECT coalesce(max(d.revision),0),coalesce(max(d.committed_at),0) INTO decision_revision,last_time FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=scope.project_id AND d.epoch=scope.epoch;
  IF (binding->>'expectedRevision')::bigint<>journal_revision OR (request->>'expectedDecisionRevision')::bigint<>decision_revision THEN RAISE EXCEPTION 'OWNER_DECISION_REVISION_CONFLICT'; END IF;
  SELECT * INTO proposal FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch AND r.operation_id=binding->>'proposalOperationId' AND r.content->'operation'->>'kind'='proposal';
  SELECT * INTO result_row FROM mc_private.coordinator_receipts r WHERE r.project_id=scope.project_id AND r.epoch=scope.epoch AND r.operation_id=binding->>'resultOperationId' AND r.content->'operation'->>'kind'='result';
  IF proposal.operation_id IS NULL OR result_row.operation_id IS NULL OR proposal.revision>=result_row.revision
   OR proposal.content->'operation'->'payload'->>'proposalId' IS DISTINCT FROM binding->>'proposalId' OR result_row.content->'operation'->'payload'->>'proposalId' IS DISTINCT FROM binding->>'proposalId'
   OR proposal.digest IS DISTINCT FROM binding->>'proposalDigest' OR result_row.digest IS DISTINCT FROM binding->>'resultDigest'
   OR proposal.content->'operation'->'payload'->>'acceptanceHash' IS DISTINCT FROM binding->>'acceptanceHash'
   OR result_row.content->'operation'->'payload'->>'resultHash' IS DISTINCT FROM binding->>'resultHash'
   OR result_row.content->'operation'->'payload'->'evidenceHashes' IS DISTINCT FROM binding->'evidenceHashes'
   OR result_row.content->'operation'->'payload'->>'qualification' IS DISTINCT FROM 'SUBMITTER_ATTESTED' OR binding->>'resultQualification' IS DISTINCT FROM 'SUBMITTER_ATTESTED'
   OR proposal.content->'operation'->'payload'->>'contextHash' IS DISTINCT FROM scope.context_hash
  THEN RAISE EXCEPTION 'OWNER_DECISION_EVIDENCE_CONFLICT'; END IF;
  now_ms:=floor(extract(epoch FROM pg_catalog.clock_timestamp())*1000)::bigint;
  IF now_ms<last_time THEN RAISE EXCEPTION 'OWNER_DECISION_SERVER_CLOCK'; END IF;
  IF now_ms>=(proposal.content->'operation'->'payload'->>'expiresAt')::bigint OR now_ms>=(binding->>'expiresAt')::bigint OR (binding->>'expiresAt')::bigint>(proposal.content->'operation'->'payload'->>'expiresAt')::bigint
  THEN RAISE EXCEPTION 'OWNER_DECISION_EXPIRED'; END IF;
  IF EXISTS(SELECT 1 FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=scope.project_id AND d.epoch=scope.epoch AND d.content->>'proposalId'=binding->>'proposalId') THEN RAISE EXCEPTION 'OWNER_DECISION_ALREADY_FINAL'; END IF;
  SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
  IF actor.subject IS DISTINCT FROM '@@OWNER@@'::uuid OR actor.aal IS DISTINCT FROM 'aal2' OR actor.expires_at<=now_ms
   OR NOT EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=actor.subject AND m.project_id=scope.project_id AND m.member_role='OWNER' AND m.active)
  THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_ASSURANCE_DENIED'; END IF;
  charge:=greatest(pg_catalog.octet_length(stable::text),pg_catalog.octet_length(mc_private.canonical_json(stable)))+2048;
  IF decision_revision>=10000 OR budget.event_count>=10000 OR budget.used_bytes+charge>104857600 THEN RAISE EXCEPTION 'OWNER_DECISION_SHARED_CAPACITY'; END IF;
  INSERT INTO mc_private.coordinator_owner_decisions(project_id,epoch,revision,operation_id,digest,owner_subject,owner_session_id,owner_aal,committed_at,content,charged_bytes)
  VALUES(scope.project_id,scope.epoch,decision_revision+1,request->>'id',content_digest,actor.subject,actor.session_id,actor.aal,now_ms,stable,charge) RETURNING * INTO row_value;
  UPDATE mc_private.storage_budget SET event_count=event_count+1,used_bytes=used_bytes+charge WHERE singleton;
 END IF;
 RETURN pg_catalog.jsonb_build_object('schemaVersion',1,'projectId',row_value.project_id,'epoch',row_value.epoch,'revision',row_value.revision,'operationId',row_value.operation_id,'digest',row_value.digest,'committedAt',row_value.committed_at,'decision',row_value.content->>'decision','proposalId',row_value.content->>'proposalId','resultHash',row_value.content->>'resultHash','duplicate',prior.operation_id IS NOT NULL,'qualification','VERIFIED_OWNER_AAL2_DECISION','runtimeConnected',false,'executionAuthorized',false);
END; $decision$;
REVOKE ALL ON FUNCTION public.mc_owner_decide_coordinator_result(jsonb) FROM PUBLIC,anon,authenticated,service_role,postgres;
GRANT EXECUTE ON FUNCTION public.mc_owner_decide_coordinator_result(jsonb) TO authenticated;
CREATE FUNCTION public.mc_owner_coordinator_decisions(project text,after_revision bigint DEFAULT 0,page_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $read$
DECLARE actor record; scope record; discovered jsonb; rows jsonb; rev bigint; last_time bigint;
BEGIN
 IF session_user='postgres' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_BROWSER_ONLY'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 IF actor.subject IS DISTINCT FROM '@@OWNER@@'::uuid OR actor.aal IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_ASSURANCE_DENIED'; END IF;
 IF after_revision IS NULL OR after_revision<0 OR after_revision>10000 OR page_limit IS NULL OR page_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'OWNER_DECISION_READ_RANGE'; END IF;
 SELECT * INTO scope FROM pg_catalog.jsonb_to_recordset('@@SCOPE@@'::jsonb) s(project_id text,epoch text,baseline_sha text,context_hash text) WHERE s.project_id=project;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_DECISION_READ_SCOPE'; END IF;
 discovered:=public.mc_owner_context_scope(project);
 IF discovered->>'contextHash' IS DISTINCT FROM scope.context_hash OR NOT EXISTS(SELECT 1 FROM mc_private.heads h WHERE h.project_id=project AND h.epoch=scope.epoch AND h.baseline_sha=scope.baseline_sha AND h.revision=0 AND NOT h.writes_enabled) THEN RAISE EXCEPTION 'OWNER_DECISION_READ_SCOPE'; END IF;
 SELECT coalesce(max(d.revision),0),coalesce(max(d.committed_at),0) INTO rev,last_time FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch;
 SELECT coalesce(jsonb_agg(x ORDER BY (x->>'revision')::bigint),'[]'::jsonb) INTO rows FROM(
  SELECT pg_catalog.jsonb_build_object('revision',d.revision,'operationId',d.operation_id,'digest',d.digest,'committedAt',d.committed_at,'ownerSubject',d.owner_subject,'aal',d.owner_aal,'content',d.content) AS x
  FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch AND d.revision>after_revision ORDER BY d.revision LIMIT page_limit
 ) bounded;
 RETURN pg_catalog.jsonb_build_object('schemaVersion',1,'projectId',project,'epoch',scope.epoch,'baselineSha',scope.baseline_sha,'contextHash',scope.context_hash,'revision',rev,'lastCommittedAt',last_time,'afterRevision',after_revision,'qualification','VERIFIED_OWNER_AAL2_DECISION','runtimeConnected',false,'executionAuthorized',false,'decisions',rows);
END; $read$;
REVOKE ALL ON FUNCTION public.mc_owner_coordinator_decisions(text,bigint,integer) FROM PUBLIC,anon,authenticated,service_role,postgres;
GRANT EXECUTE ON FUNCTION public.mc_owner_coordinator_decisions(text,bigint,integer) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
