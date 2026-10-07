-- Qualified field alias fixes first realSQL test failure; no access changes.
BEGIN;
CREATE OR REPLACE FUNCTION mc_private.validate_operation(op jsonb) RETURNS void
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
COMMIT;
