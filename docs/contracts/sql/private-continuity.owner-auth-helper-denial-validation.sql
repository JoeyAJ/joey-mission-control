-- POST-APPROVAL VALIDATION ONLY: no claims, Auth rows, tokens or secrets.
-- A missing helper must fail this fixture rather than produce a false ACL PASS.
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF pg_catalog.to_regprocedure('mc_private.owner_auth_verification()') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='mc_private.owner_auth_verification()'::regprocedure AND p.proowner='postgres'::regrole AND p.prosecdef)
  OR NOT pg_catalog.has_function_privilege('mc_continuity_executor','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','auth','USAGE')
 THEN RAISE EXCEPTION 'OWNER_HELPER_EFFECTIVE_BOUNDARY_NOT_READY'; END IF;
END; $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM mc_private.owner_auth_verification(); RAISE EXCEPTION 'ANON_HELPER_MUST_DENY';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM * FROM mc_private.owner_auth_verification(); RAISE EXCEPTION 'AUTHENTICATED_HELPER_MUST_DENY';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM * FROM mc_private.owner_auth_verification(); RAISE EXCEPTION 'SERVICE_ROLE_HELPER_MUST_DENY';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS_OWNER_HELPER_DIRECT_ACCESS_DENIALS' AS validation,3 AS rejected_caller_roles,
 false AS real_provider_auth_verified,false AS real_aal2_verified,false AS real_revocation_verified;
