-- MC-only PostgreSQL synthetic validation. Always ROLLBACK: no Auth user or grant.
-- Requires installed default-deny foundation; executes only through owner connector.
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM mc_private.heads) OR EXISTS(SELECT 1 FROM mc_private.members) OR EXISTS(SELECT 1 FROM mc_private.storage_budget) THEN RAISE EXCEPTION 'SYNTHETIC_REQUIRES_EMPTY_FOUNDATION'; END IF;
 BEGIN PERFORM mc_api.read_events('NEXAEON',0,100); RAISE EXCEPTION 'BRIDGE_MUST_DENY'; EXCEPTION WHEN SQLSTATE '28000' THEN NULL; END;
END; $$;
-- Transaction-local stub is rolled back. This is NOT a verified Auth bridge.
CREATE OR REPLACE FUNCTION mc_private.current_actor() RETURNS TABLE(subject uuid,session_id uuid,aal text)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT '00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000002'::uuid,'aal1'::text;
$$;
INSERT INTO mc_private.storage_budget(singleton) VALUES(true);
INSERT INTO mc_private.heads(project_id,epoch,baseline_sha,writes_enabled) VALUES('NEXAEON','synthetic-validation',repeat('a',40),true);
INSERT INTO mc_private.members VALUES('00000000-0000-4000-8000-000000000001','NEXAEON','WRITER',true);
INSERT INTO mc_private.contexts VALUES('NEXAEON',encode(sha256(convert_to(mc_private.canonical_json('{"synthetic":true}'::jsonb),'UTF8')),'hex'),'{"synthetic":true}');
DO $$
DECLARE op jsonb; receipt jsonb; prior_bytes bigint; prior_count bigint; BEGIN
 op:=jsonb_build_object('id','synthetic-proposal','epoch','synthetic-validation','projectId','NEXAEON','baselineSha',repeat('a',40),'expectedRevision',0,'kind','proposal','payload',jsonb_build_object('proposalId','synthetic-proposal','contextHash',encode(sha256(convert_to(mc_private.canonical_json('{"synthetic":true}'::jsonb),'UTF8')),'hex'),'acceptanceHash',repeat('b',64),'expiresAt',floor(extract(epoch FROM clock_timestamp())*1000)::bigint+60000));
 receipt:=mc_api.append_operation(op);
 IF receipt->>'duplicate'<>'false' OR (receipt->'receipt'->>'revision')::bigint<>1 THEN RAISE EXCEPTION 'COMMIT_FAILED'; END IF;
 SELECT used_bytes,event_count INTO prior_bytes,prior_count FROM mc_private.storage_budget WHERE singleton;
 receipt:=mc_api.append_operation(op);
 IF receipt->>'duplicate'<>'true' OR (SELECT event_count FROM mc_private.storage_budget WHERE singleton)<>prior_count OR (SELECT used_bytes FROM mc_private.storage_budget WHERE singleton)<>prior_bytes THEN RAISE EXCEPTION 'IDEMPOTENCY_FAILED'; END IF;
 BEGIN PERFORM mc_api.append_operation(jsonb_set(op,'{payload,acceptanceHash}',to_jsonb(repeat('c',64)))); RAISE EXCEPTION 'IDEMPOTENCY_MUST_REFUSE'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'IDEMPOTENCY_CONFLICT' THEN RAISE; END IF; END;
 BEGIN PERFORM mc_api.append_operation(op||jsonb_build_object('id','stale-proposal')); RAISE EXCEPTION 'CAS_MUST_REFUSE'; EXCEPTION WHEN SQLSTATE '40001' THEN IF SQLERRM<>'REVISION_CONFLICT' THEN RAISE; END IF; END;
 IF (mc_api.read_events('NEXAEON',0,100)->>'headRevision')::bigint<>1 THEN RAISE EXCEPTION 'READ_FAILED'; END IF;
 UPDATE mc_private.storage_budget SET event_count=10000 WHERE singleton;
 BEGIN PERFORM mc_api.append_operation(op||jsonb_build_object('id','capacity-proposal','expectedRevision',1)); RAISE EXCEPTION 'CAP_MUST_REFUSE'; EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'LEDGER_CAPACITY' THEN RAISE; END IF; END;
 IF (SELECT revision FROM mc_private.heads WHERE project_id='NEXAEON')<>1 OR (SELECT count(*) FROM mc_private.events)<>1 THEN RAISE EXCEPTION 'FAILURE_ATOMICITY'; END IF;
END; $$;
SELECT 'PASS_SYNTHETIC_SQL_ROLLBACK_ONLY' AS validation, false AS real_auth_verified, false AS real_role_rls_verified, false AS parallel_cas_verified;
ROLLBACK;
