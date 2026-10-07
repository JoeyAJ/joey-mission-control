-- SQL-admin synthetic wiring ONLY, not positive provider Auth/AAL2 evidence.
-- No Auth row/user/JWT creation, private table insertion or writer activation.
-- An uncommitted helper stub is visible only to this test transaction and rolls back.
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF (SELECT pg_catalog.md5(p.prosrc) FROM pg_catalog.pg_proc p WHERE p.oid='mc_private.owner_auth_verification()'::regprocedure)<>'9bdea547ae6176bdab8f9e84c8e533d9'
 THEN RAISE EXCEPTION 'EXPECTED_LIVE_HELPER_SOURCE_REQUIRED'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION mc_private.owner_auth_verification()
RETURNS TABLE(subject uuid,session_id uuid,aal text,expires_at bigint)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $$
 SELECT '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  pg_catalog.current_setting('request.jwt.claims')::jsonb->>'aal',2000000000123::bigint;
$$;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
SET LOCAL ROLE mc_continuity_executor;
DO $$ DECLARE level text; actor record; BEGIN
 FOREACH level IN ARRAY ARRAY['aal1','aal2'] LOOP
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('aal',level)::text,true);
  SELECT * INTO STRICT actor FROM mc_private.current_actor();
  IF actor.subject<>'6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid
   OR actor.session_id<>'00000000-0000-4000-8000-000000000001'::uuid OR actor.aal<>level
  THEN RAISE EXCEPTION 'SYNTHETIC_ACTOR_WIRING_FAILED'; END IF;
 END LOOP;
END; $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ DECLARE level text; reply jsonb; BEGIN
 FOREACH level IN ARRAY ARRAY['aal1','aal2'] LOOP
  PERFORM pg_catalog.set_config('request.jwt.claims',pg_catalog.jsonb_build_object('aal',level)::text,true);
  reply:=public.mc_owner_session('NEXAEON');
  IF reply->>'subject'<>'6f0ca2ae-83e0-4684-af12-0b37d08182db' OR reply->>'role'<>'OWNER'
   OR reply->>'projectId'<>'NEXAEON' OR reply->>'aal'<>level
   OR reply->'sessionActive'<>'true'::jsonb OR reply->'memberActive'<>'false'::jsonb
   OR (reply->>'expiresAt')::bigint<>2000000000123
  THEN RAISE EXCEPTION 'SYNTHETIC_IDENTITY_EXPIRY_WIRING_FAILED'; END IF;
 END LOOP;
END; $$;
RESET ROLE;
ROLLBACK;
DO $$ BEGIN
 IF (SELECT pg_catalog.md5(p.prosrc) FROM pg_catalog.pg_proc p WHERE p.oid='mc_private.owner_auth_verification()'::regprocedure)<>'9bdea547ae6176bdab8f9e84c8e533d9'
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.roleid='mc_continuity_executor'::regrole AND m.member='postgres'::regrole AND (m.set_option OR m.inherit_option))
 THEN RAISE EXCEPTION 'SYNTHETIC_HELPER_ROLLBACK_NOT_RESTORED'; END IF;
END; $$;
SELECT 'PASS_SYNTHETIC_HELPER_CALL_CHAIN_ROLLBACK' AS validation,4 AS positive_wiring_cases,
 true AS original_helper_source_restored,false AS private_seed_used,
 false AS real_provider_auth_verified,false AS real_aal2_verified,false AS real_revocation_verified;
