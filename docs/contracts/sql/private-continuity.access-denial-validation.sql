-- Existing platform roles only; no grant or role creation. Session-local role resets.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM mc_private.events; RAISE EXCEPTION 'ANON_READ_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM mc_api.read_events('NEXAEON',0,100); RAISE EXCEPTION 'ANON_RPC_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM mc_private.events; RAISE EXCEPTION 'AUTH_READ_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM mc_api.read_events('NEXAEON',0,100); RAISE EXCEPTION 'AUTH_RPC_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM 1 FROM mc_private.events; RAISE EXCEPTION 'SERVICE_READ_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM mc_api.read_events('NEXAEON',0,100); RAISE EXCEPTION 'SERVICE_RPC_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS_EXISTING_ROLE_SQL_ACCESS_DENIAL' AS validation, false AS owner_writer_rls_verified;
