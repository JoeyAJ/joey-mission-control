-- SQL-admin synthetic claims only: no provider JWT, Auth row insertion or secrets.
-- Every role/claim change is transaction-local and rolled back. No positive Auth proof.
BEGIN;
SET LOCAL statement_timeout='15s';
SET LOCAL ROLE authenticated;
DO $$
DECLARE base jsonb; claims text; checked integer:=0;
BEGIN
 base:=jsonb_build_object('sub','6f0ca2ae-83e0-4684-af12-0b37d08182db','session_id','00000000-0000-4000-8000-000000000001','role','authenticated','iss','https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1','aud','authenticated','aal','aal1','exp',floor(extract(epoch FROM clock_timestamp()))::bigint+600);
 FOR claims IN SELECT value FROM (VALUES
  (''), ('{'),
  ((base||jsonb_build_object('sub','00000000-0000-4000-8000-000000000002'))::text),
  ((base-'session_id')::text),
  ((base||jsonb_build_object('session_id','malformed'))::text),
  ((base||jsonb_build_object('role','service_role'))::text),
  ((base||jsonb_build_object('iss','https://invalid.example/auth/v1'))::text),
  ((base||jsonb_build_object('aud','other'))::text),
  ((base||jsonb_build_object('exp',1))::text),
  ((base||jsonb_build_object('exp','NaN'))::text),
  ((base||jsonb_build_object('aal','aal3'))::text),
  (base::text),
  ((base||jsonb_build_object('aal','aal2'))::text)
 ) cases(value) LOOP
  PERFORM set_config('request.jwt.claims',claims,true);
  BEGIN PERFORM public.mc_owner_session('NEXAEON'); RAISE EXCEPTION 'SYNTHETIC_CLAIMS_MUST_DENY';
  EXCEPTION WHEN invalid_authorization_specification THEN checked:=checked+1; END;
 END LOOP;
 IF checked<>13 THEN RAISE EXCEPTION 'DENIAL_CASE_COUNT'; END IF;
 BEGIN PERFORM public.mc_owner_session('UNKNOWN'); RAISE EXCEPTION 'PROJECT_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM auth.users; RAISE EXCEPTION 'AUTH_RAW_READ_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM mc_private.events; RAISE EXCEPTION 'PRIVATE_RAW_READ_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END; $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN BEGIN PERFORM public.mc_owner_session('NEXAEON'); RAISE EXCEPTION 'ANON_RPC_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN BEGIN PERFORM public.mc_owner_session('NEXAEON'); RAISE EXCEPTION 'SERVICE_RPC_MUST_DENY'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END; $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS_SYNTHETIC_SQL_ADMIN_OWNER_BRIDGE_DENIALS' AS validation,13 AS synthetic_claim_cases,false AS real_provider_auth_verified,false AS real_aal2_verified,false AS real_revocation_verified;
