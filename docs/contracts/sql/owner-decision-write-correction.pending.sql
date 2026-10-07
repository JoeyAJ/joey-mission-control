-- REVIEW ONLY until existing ownership/schema permissions permit replacement.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
DO $patch$ DECLARE definition text; current_owner oid;
BEGIN
 SELECT p.proowner,pg_get_functiondef(p.oid) INTO STRICT current_owner,definition FROM pg_proc p WHERE p.oid='public.mc_owner_decide_coordinator_result(jsonb)'::regprocedure;
 IF NOT pg_has_role(current_user,current_owner,'USAGE') OR NOT has_schema_privilege(current_user,'public','CREATE') THEN RAISE EXCEPTION 'OWNER_DECISION_CORRECTION_OWNER_DENIED';END IF;
 IF md5(definition)<>'80e2e69e1038153e0b698105759b759a' OR strpos(definition,$before$  OR binding->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(binding->'schemaVersion') IS DISTINCT FROM 'number'$before$)=0 THEN RAISE EXCEPTION 'OWNER_DECISION_CORRECTION_SOURCE_DRIFT';END IF;
 EXECUTE replace(definition,$before$  OR binding->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(binding->'schemaVersion') IS DISTINCT FROM 'number'$before$,$after$  OR jsonb_typeof(binding->'proposalId') IS DISTINCT FROM 'string' OR binding->>'proposalId' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR jsonb_typeof(binding->'proposalOperationId') IS DISTINCT FROM 'string' OR binding->>'proposalOperationId' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR jsonb_typeof(binding->'resultOperationId') IS DISTINCT FROM 'string' OR binding->>'resultOperationId' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR binding->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(binding->'schemaVersion') IS DISTINCT FROM 'number'$after$);
END $patch$;
COMMIT;
