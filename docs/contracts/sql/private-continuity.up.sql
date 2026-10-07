-- Pending standard PostgreSQL migration; NOT EXECUTED / NOT ACTIVATED.
-- No Supabase dependency. AUTH bridge intentionally denies until separately approved.
-- Requires dedicated fresh schema/NOLOGIN role. Apply only to approved MC-only DB.
BEGIN;
CREATE ROLE mc_continuity_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
CREATE SCHEMA mc_private;
CREATE SCHEMA mc_api;
REVOKE ALL ON SCHEMA mc_private, mc_api FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mc_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mc_api REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE mc_private.members (
 subject uuid NOT NULL, project_id text NOT NULL CHECK(project_id IN ('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')),
 member_role text NOT NULL CHECK(member_role IN ('OWNER','WRITER')), active boolean NOT NULL DEFAULT false,
 PRIMARY KEY(subject,project_id)
);
CREATE UNIQUE INDEX one_active_owner_per_project ON mc_private.members(project_id) WHERE member_role='OWNER' AND active;
CREATE UNIQUE INDEX one_active_writer_per_project ON mc_private.members(project_id) WHERE member_role='WRITER' AND active;
CREATE TABLE mc_private.heads (
 project_id text PRIMARY KEY CHECK(project_id IN ('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')),
 epoch text NOT NULL CHECK(epoch ~ '^[A-Za-z0-9_-]{1,80}$'), baseline_sha text NOT NULL CHECK(baseline_sha ~ '^[a-f0-9]{40}$'),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision BETWEEN 0 AND 10000), used_bytes bigint NOT NULL DEFAULT 0 CHECK(used_bytes BETWEEN 0 AND 104857600),
 last_committed_at bigint NOT NULL DEFAULT 0, writes_enabled boolean NOT NULL DEFAULT false, backup_verified_revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE mc_private.storage_budget (
 singleton boolean PRIMARY KEY CHECK(singleton), event_count bigint NOT NULL DEFAULT 0 CHECK(event_count BETWEEN 0 AND 10000), used_bytes bigint NOT NULL DEFAULT 0 CHECK(used_bytes BETWEEN 0 AND 104857600)
);
-- Empty until approved bootstrap. One shared logical-data cap across all four projects.
CREATE TABLE mc_private.contexts (
 project_id text NOT NULL REFERENCES mc_private.heads(project_id), context_hash text NOT NULL CHECK(context_hash ~ '^[a-f0-9]{64}$'),
 filtered_claims jsonb NOT NULL CHECK(jsonb_typeof(filtered_claims)='object' AND octet_length(filtered_claims::text)<=65536),
 PRIMARY KEY(project_id,context_hash)
);
CREATE TABLE mc_private.events (
 project_id text NOT NULL REFERENCES mc_private.heads(project_id), epoch text NOT NULL, revision bigint NOT NULL,
 operation_id text NOT NULL, digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 subject uuid NOT NULL, member_role text NOT NULL CHECK(member_role IN ('OWNER','WRITER')), aal text NOT NULL CHECK(aal IN ('aal1','aal2')),
 committed_at bigint NOT NULL, operation jsonb NOT NULL,
 PRIMARY KEY(project_id,epoch,revision), UNIQUE(project_id,epoch,operation_id)
);
CREATE INDEX event_proposal_lookup ON mc_private.events(project_id,epoch,(operation->'payload'->>'proposalId'),revision DESC);
CREATE TABLE mc_private.checkpoints (
 project_id text NOT NULL REFERENCES mc_private.heads(project_id), epoch text NOT NULL, revision bigint NOT NULL,
 checkpoint_hash text NOT NULL CHECK(checkpoint_hash ~ '^[a-f0-9]{64}$'), verified_at bigint NOT NULL,
 PRIMARY KEY(project_id,epoch,revision)
);
-- Backend role only. No authenticated/anon table access, no client role inheritance.
GRANT USAGE, CREATE ON SCHEMA mc_private, mc_api TO mc_continuity_executor;
GRANT SELECT ON ALL TABLES IN SCHEMA mc_private TO mc_continuity_executor;
GRANT INSERT ON mc_private.events TO mc_continuity_executor;
GRANT UPDATE(revision,used_bytes,last_committed_at) ON mc_private.heads TO mc_continuity_executor;
GRANT UPDATE(used_bytes,event_count) ON mc_private.storage_budget TO mc_continuity_executor;
ALTER TABLE mc_private.storage_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.storage_budget FORCE ROW LEVEL SECURITY;
CREATE POLICY core_budget_read ON mc_private.storage_budget FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY core_budget_advance ON mc_private.storage_budget FOR UPDATE TO mc_continuity_executor USING(true) WITH CHECK(true);
ALTER TABLE mc_private.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.members FORCE ROW LEVEL SECURITY;
ALTER TABLE mc_private.heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.heads FORCE ROW LEVEL SECURITY;
ALTER TABLE mc_private.contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.contexts FORCE ROW LEVEL SECURITY;
ALTER TABLE mc_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.events FORCE ROW LEVEL SECURITY;
ALTER TABLE mc_private.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.checkpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY core_members_read ON mc_private.members FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY core_heads_read ON mc_private.heads FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY core_heads_advance ON mc_private.heads FOR UPDATE TO mc_continuity_executor USING(true) WITH CHECK(true);
CREATE POLICY core_context_read ON mc_private.contexts FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY core_events_read ON mc_private.events FOR SELECT TO mc_continuity_executor USING(true);
CREATE POLICY core_events_append ON mc_private.events FOR INSERT TO mc_continuity_executor WITH CHECK(true);
CREATE POLICY core_checkpoints_read ON mc_private.checkpoints FOR SELECT TO mc_continuity_executor USING(true);
-- RLS scopes privileged core role; it does NOT grant end users any row/table access.
-- The narrow RPC additionally checks actual principal/member/session before every read/write.
CREATE FUNCTION mc_private.current_actor() RETURNS TABLE(subject uuid, session_id uuid, aal text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='28000', MESSAGE='AUTH_BRIDGE_NOT_INSTALLED'; END;
$$;
-- Future bridge MUST read provider-verified identity, current session revocation and AAL.
-- Never accept subject/role/AAL/session_active or arbitrary SQL from an RPC caller.
CREATE FUNCTION mc_private.canonical_json(v jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER SET search_path='' AS $$
DECLARE t text; BEGIN
 CASE jsonb_typeof(v)
 WHEN 'object' THEN SELECT '{'||coalesce(string_agg(to_jsonb(key)::text||':'||mc_private.canonical_json(value),',' ORDER BY key COLLATE "C"),'')||'}' INTO t FROM jsonb_each(v);
 WHEN 'array' THEN SELECT '['||coalesce(string_agg(mc_private.canonical_json(value),',' ORDER BY ord),'')||']' INTO t FROM jsonb_array_elements(v) WITH ORDINALITY AS a(value,ord);
 WHEN 'number' THEN IF (v::text)::numeric <> trunc((v::text)::numeric) OR abs((v::text)::numeric)>9007199254740991 THEN RAISE EXCEPTION 'JSON_NUMBER'; END IF; t:=((v::text)::numeric)::bigint::text;
 ELSE t:=v::text; END CASE; RETURN t;
END; $$;
-- Admin-only initial filtered-context inserts also reserve the shared budget atomically.
-- No client context update grant. Approved imports must include this trigger and cap.
CREATE FUNCTION mc_private.reserve_context_budget() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE budget mc_private.storage_budget%ROWTYPE; bytes bigint; BEGIN
 SELECT * INTO STRICT budget FROM mc_private.storage_budget WHERE singleton FOR UPDATE;
 bytes:=octet_length(NEW.filtered_claims::text)+512;
 IF budget.used_bytes+bytes>104857600 THEN RAISE EXCEPTION 'LEDGER_CAPACITY'; END IF;
 UPDATE mc_private.storage_budget SET used_bytes=used_bytes+bytes WHERE singleton;
 RETURN NEW;
END; $$;
CREATE TRIGGER reserve_context_budget BEFORE INSERT ON mc_private.contexts FOR EACH ROW EXECUTE FUNCTION mc_private.reserve_context_budget();
CREATE FUNCTION mc_private.exact_keys(v jsonb, keys text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE WHEN jsonb_typeof(v)='object' THEN (SELECT count(*)=cardinality(keys) FROM jsonb_object_keys(v)) AND v ?& keys ELSE false END;
$$;
CREATE FUNCTION mc_private.validate_operation(op jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE p jsonb; k text; n numeric; BEGIN
 IF NOT coalesce(mc_private.exact_keys(op,ARRAY['id','epoch','projectId','baselineSha','expectedRevision','kind','payload']),false) THEN RAISE EXCEPTION 'OPERATION_FIELDS'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['id','epoch','projectId','baselineSha','kind']) AS field_names(field_name) WHERE jsonb_typeof(op->field_names.field_name) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'OPERATION_CONTEXT'; END IF;
 IF jsonb_typeof(op->'id')<>'string' OR jsonb_typeof(op->'epoch')<>'string' OR op->>'id'!~'^[A-Za-z0-9_-]{1,80}$' OR op->>'epoch'!~'^[A-Za-z0-9_-]{1,80}$' OR op->>'projectId' NOT IN ('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM') OR op->>'baselineSha'!~'^[a-f0-9]{40}$' OR jsonb_typeof(op->'expectedRevision')<>'number' THEN RAISE EXCEPTION 'OPERATION_CONTEXT'; END IF;
 n:=(op->>'expectedRevision')::numeric; IF n<>trunc(n) OR n<0 OR n>10000 THEN RAISE EXCEPTION 'OPERATION_CONTEXT'; END IF;
 p:=op->'payload'; k:=op->>'kind';
 IF k='proposal' THEN
  IF NOT coalesce(mc_private.exact_keys(p,ARRAY['proposalId','contextHash','acceptanceHash','expiresAt']),false) OR p->>'contextHash'!~'^[a-f0-9]{64}$' OR p->>'acceptanceHash'!~'^[a-f0-9]{64}$' OR jsonb_typeof(p->'expiresAt')<>'number' THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
  n:=(p->>'expiresAt')::numeric; IF n<>trunc(n) OR n<=0 OR n>9007199254740991 THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 ELSIF k='result' THEN
  IF NOT coalesce(mc_private.exact_keys(p,ARRAY['proposalId','resultHash','evidenceHashes','qualification']),false) OR p->>'resultHash'!~'^[a-f0-9]{64}$' OR p->>'qualification' NOT IN ('SUBMITTER_ATTESTED','OWNER_IMPORTED_UNVERIFIED') OR jsonb_typeof(p->'evidenceHashes')<>'array' THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
  IF jsonb_array_length(p->'evidenceHashes') NOT BETWEEN 1 AND 16 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'evidenceHashes') e WHERE jsonb_typeof(e)<>'string' OR e#>>'{}'!~'^[a-f0-9]{64}$') THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 ELSIF k='decision' THEN
  IF NOT coalesce(mc_private.exact_keys(p,ARRAY['proposalId','resultHash','decision']),false) OR p->>'resultHash'!~'^[a-f0-9]{64}$' OR p->>'decision' NOT IN ('ACCEPT','REJECT') THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 ELSE RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p) e WHERE e.key NOT IN ('expiresAt','evidenceHashes') AND jsonb_typeof(e.value) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 IF jsonb_typeof(p->'proposalId')<>'string' OR p->>'proposalId'!~'^[A-Za-z0-9_-]{1,80}$' THEN RAISE EXCEPTION 'PAYLOAD_FIELDS'; END IF;
 IF octet_length(mc_private.canonical_json(op))>8192 THEN RAISE EXCEPTION 'EVENT_CAPACITY'; END IF;
END; $$;
CREATE FUNCTION mc_api.append_operation(op jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor record; member record; budget mc_private.storage_budget%ROWTYPE; head mc_private.heads%ROWTYPE; old mc_private.events%ROWTYPE;
 proposal mc_private.events%ROWTYPE; result mc_private.events%ROWTYPE; hash text; now_ms bigint; rec jsonb; bytes integer;
BEGIN
 PERFORM mc_private.validate_operation(op);
 SELECT * INTO STRICT actor FROM mc_private.current_actor();
 SELECT * INTO member FROM mc_private.members WHERE subject=actor.subject AND project_id=op->>'projectId' AND active;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='UNAUTHORIZED'; END IF;
 -- All future context/bootstrap writers use budget-before-head lock order.
 SELECT * INTO STRICT budget FROM mc_private.storage_budget WHERE singleton FOR UPDATE;
 -- Approved operator revocation first locks/pauses head, then disables membership.
 SELECT * INTO STRICT head FROM mc_private.heads WHERE project_id=op->>'projectId' FOR UPDATE;
 -- Recheck revoked session after a possible lock wait before replay or mutation.
 SELECT * INTO STRICT actor FROM mc_private.current_actor();
 SELECT * INTO member FROM mc_private.members WHERE subject=actor.subject AND project_id=op->>'projectId' AND active;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='UNAUTHORIZED'; END IF;
 IF NOT head.writes_enabled THEN RAISE EXCEPTION 'WRITES_DISABLED'; END IF;
 IF head.epoch<>op->>'epoch' OR head.baseline_sha<>op->>'baselineSha' THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='AUTHORITY_CONFLICT'; END IF;
 IF op->>'kind'='decision' AND (member.member_role<>'OWNER' OR actor.aal IS DISTINCT FROM 'aal2') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OWNER_ASSURANCE_REQUIRED'; END IF;
 hash:=encode(sha256(convert_to(mc_private.canonical_json(op),'UTF8')),'hex');
 SELECT * INTO old FROM mc_private.events WHERE project_id=head.project_id AND epoch=head.epoch AND operation_id=op->>'id';
 IF FOUND THEN
  IF old.digest<>hash OR old.subject<>actor.subject THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('duplicate',true,'receipt',jsonb_build_object('revision',old.revision,'digest',old.digest,'subject',old.subject,'role',old.member_role,'aal',old.aal,'committedAt',old.committed_at,'operation',old.operation));
 END IF;
 IF head.revision<>(op->>'expectedRevision')::bigint THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='REVISION_CONFLICT'; END IF;
 bytes:=octet_length(mc_private.canonical_json(op))+512; -- conservative receipt metadata allowance
 IF head.revision>=10000 OR budget.event_count>=10000 OR budget.used_bytes+bytes>104857600 THEN RAISE EXCEPTION 'LEDGER_CAPACITY'; END IF;
 now_ms:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 IF now_ms<head.last_committed_at THEN RAISE EXCEPTION 'SERVER_CLOCK'; END IF;
 SELECT * INTO proposal FROM mc_private.events WHERE project_id=head.project_id AND epoch=head.epoch AND operation->>'kind'='proposal' AND operation->'payload'->>'proposalId'=op->'payload'->>'proposalId' ORDER BY revision LIMIT 1;
 IF op->>'kind'='proposal' THEN
  IF FOUND THEN RAISE EXCEPTION 'PROPOSAL_EXISTS'; END IF;
  IF (op->'payload'->>'expiresAt')::bigint<=now_ms OR (op->'payload'->>'expiresAt')::bigint>now_ms+86400000 THEN RAISE EXCEPTION 'PROPOSAL_EXPIRY'; END IF;
  IF NOT EXISTS(SELECT 1 FROM mc_private.contexts WHERE project_id=head.project_id AND context_hash=op->'payload'->>'contextHash') THEN RAISE EXCEPTION 'CONTEXT_MISSING'; END IF;
 ELSE
  IF NOT FOUND THEN RAISE EXCEPTION 'PROPOSAL_MISSING'; END IF;
  IF now_ms>=(proposal.operation->'payload'->>'expiresAt')::bigint THEN RAISE EXCEPTION 'PROPOSAL_EXPIRED'; END IF;
 END IF;
 IF op->>'kind'='decision' THEN
  SELECT * INTO result FROM mc_private.events WHERE project_id=head.project_id AND epoch=head.epoch AND operation->>'kind'='result' AND operation->'payload'->>'proposalId'=op->'payload'->>'proposalId' ORDER BY revision DESC LIMIT 1;
  IF NOT FOUND OR result.operation->'payload'->>'resultHash'<>op->'payload'->>'resultHash' THEN RAISE EXCEPTION 'RESULT_CONFLICT'; END IF;
  IF head.backup_verified_revision<head.revision THEN RAISE EXCEPTION 'BACKUP_NOT_VERIFIED'; END IF;
 END IF;
 INSERT INTO mc_private.events VALUES(head.project_id,head.epoch,head.revision+1,op->>'id',hash,actor.subject,member.member_role,actor.aal,now_ms,op);
 UPDATE mc_private.storage_budget SET used_bytes=used_bytes+bytes,event_count=event_count+1 WHERE singleton;
 UPDATE mc_private.heads SET revision=revision+1,used_bytes=used_bytes+bytes,last_committed_at=now_ms WHERE project_id=head.project_id;
 rec:=jsonb_build_object('revision',head.revision+1,'digest',hash,'subject',actor.subject,'role',member.member_role,'aal',actor.aal,'committedAt',now_ms,'operation',op);
 RETURN jsonb_build_object('duplicate',false,'receipt',rec);
END; $$;
CREATE FUNCTION mc_api.read_events(project text, after_revision bigint DEFAULT 0, page_limit integer DEFAULT 100) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor record; head mc_private.heads%ROWTYPE; rows jsonb; BEGIN
 IF after_revision IS NULL OR page_limit IS NULL OR after_revision<0 OR page_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'READ_BOUND'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.current_actor();
 IF NOT EXISTS(SELECT 1 FROM mc_private.members WHERE subject=actor.subject AND project_id=project AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='UNAUTHORIZED'; END IF;
 SELECT * INTO STRICT head FROM mc_private.heads WHERE project_id=project;
 SELECT coalesce(jsonb_agg(r ORDER BY (r->>'revision')::bigint),'[]'::jsonb) INTO rows FROM(SELECT jsonb_build_object('revision',revision,'digest',digest,'subject',subject,'role',member_role,'aal',aal,'committedAt',committed_at,'operation',operation) r FROM mc_private.events WHERE project_id=project AND epoch=head.epoch AND revision>after_revision AND revision<=head.revision ORDER BY revision LIMIT page_limit) q;
 RETURN jsonb_build_object('projectId',head.project_id,'epoch',head.epoch,'baselineSha',head.baseline_sha,'headRevision',head.revision,'events',rows);
END; $$;
CREATE FUNCTION mc_api.read_context(project text, requested_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor record; claims jsonb; BEGIN
 IF requested_hash IS NULL OR requested_hash!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'CONTEXT_HASH'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.current_actor();
 IF NOT EXISTS(SELECT 1 FROM mc_private.members WHERE subject=actor.subject AND project_id=project AND active) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='UNAUTHORIZED'; END IF;
 SELECT filtered_claims INTO STRICT claims FROM mc_private.contexts WHERE project_id=project AND context_hash=requested_hash;
 IF encode(sha256(convert_to(mc_private.canonical_json(claims),'UTF8')),'hex')<>requested_hash THEN RAISE EXCEPTION 'CONTEXT_INTEGRITY'; END IF;
 RETURN jsonb_build_object('projectId',project,'contextHash',requested_hash,'filteredClaims',claims);
END; $$;
-- Ownership is narrowly privileged, not postgres/service_role. Helpers also have closed search path.
ALTER FUNCTION mc_private.current_actor() OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_private.canonical_json(jsonb) OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_private.exact_keys(jsonb,text[]) OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_private.validate_operation(jsonb) OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_private.reserve_context_budget() OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_api.append_operation(jsonb) OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_api.read_events(text,bigint,integer) OWNER TO mc_continuity_executor;
ALTER FUNCTION mc_api.read_context(text,text) OWNER TO mc_continuity_executor;
REVOKE ALL ON ALL TABLES IN SCHEMA mc_private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mc_private,mc_api FROM PUBLIC;
REVOKE CREATE ON SCHEMA mc_private, mc_api FROM mc_continuity_executor;
-- NO GRANT to anon/authenticated, no seed identities/context, no enabled writes.
-- Future approved bridge/access-role migration is required before RPC execution.
COMMIT;
