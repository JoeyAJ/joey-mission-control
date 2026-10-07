-- REVIEW CANDIDATE / NOT APPROVED / NOT APPLIED. Exact MC project only.
-- New limited privilege delegation: one postgres-owned private verifier.
-- No Auth grant/policy/owner change, new credential, Auth write or private seed.
-- PostgREST verifies the JWT before setting request.jwt.claims. SQL admins remain trusted.
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF current_user<>'postgres'
  OR NOT pg_catalog.has_schema_privilege('postgres','auth','USAGE')
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname='postgres' AND r.rolbypassrls)
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname='mc_continuity_executor' AND NOT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolinherit)
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.roleid='mc_continuity_executor'::regrole AND m.member='postgres'::regrole AND (m.set_option OR m.inherit_option))
  OR pg_catalog.to_regprocedure('mc_private.owner_auth_verification()') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='mc_private.current_actor()'::regprocedure AND p.proowner='mc_continuity_executor'::regrole AND NOT p.prosecdef)
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='public.mc_owner_session(text)'::regprocedure AND p.proowner='mc_continuity_executor'::regrole AND p.prosecdef)
 THEN RAISE EXCEPTION 'OWNER_HELPER_PRECONDITION_FAILED'; END IF;
END; $$;

-- No arbitrary subject/session/aal argument. At most one verified safe tuple.
CREATE FUNCTION mc_private.owner_auth_verification()
RETURNS TABLE(subject uuid,session_id uuid,aal text,expires_at bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE claims jsonb; sub uuid; sid uuid; level text; expires numeric;
 now_at timestamptz:=pg_catalog.clock_timestamp(); expiry bigint;
BEGIN
 BEGIN
  claims:=nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb;
  sub:=(claims->>'sub')::uuid; sid:=(claims->>'session_id')::uuid;
  level:=claims->>'aal'; expires:=(claims->>'exp')::numeric;
 EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED';
 END;
 IF sub IS DISTINCT FROM '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid OR sid IS NULL
  OR claims->>'role' IS DISTINCT FROM 'authenticated'
  OR claims->>'iss' IS DISTINCT FROM 'https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1'
  OR NOT coalesce(claims->'aud'='"authenticated"'::jsonb OR claims->'aud' @> '["authenticated"]'::jsonb,false)
  OR level IS NULL OR level NOT IN ('aal1','aal2') OR expires IS NULL
  OR expires::text!~'^[0-9]+$' OR expires>9007199254740
  OR expires<=extract(epoch FROM now_at)
 THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED'; END IF;

 -- Only the same twelve previously approved non-secret metadata columns.
 -- Existing postgres USAGE/SELECT/BYPASSRLS; no managed Auth privileges added.
 SELECT pg_catalog.floor(least(expires,coalesce(extract(epoch FROM s.not_after),expires))*1000)::bigint
 INTO expiry
 FROM auth.sessions s
 WHERE s.id=sid AND s.user_id=sub AND s.aal::text=level
  AND (s.not_after IS NULL OR s.not_after>now_at)
  AND EXISTS(SELECT 1 FROM auth.users u
   WHERE u.id=sub AND u.is_anonymous IS FALSE AND u.deleted_at IS NULL
    AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now_at))
  AND (level='aal1' OR EXISTS(SELECT 1 FROM auth.mfa_factors f
   WHERE f.user_id=sub AND f.status::text='verified' AND f.factor_type::text='totp'));
 IF NOT FOUND OR expiry IS NULL OR expiry<=extract(epoch FROM now_at)*1000
 THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED'; END IF;
 RETURN QUERY SELECT sub,sid,level,expiry;
END; $$;
REVOKE ALL ON FUNCTION mc_private.owner_auth_verification() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION mc_private.owner_auth_verification() TO mc_continuity_executor;

-- Same temporary MC-function editing capability as the approved bridge migration.
-- Both grants are restored before COMMIT; no persistent CREATE/SET enlargement.
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE OR REPLACE FUNCTION mc_private.current_actor()
RETURNS TABLE(subject uuid,session_id uuid,aal text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 RETURN QUERY SELECT v.subject,v.session_id,v.aal FROM mc_private.owner_auth_verification() v;
END; $$;
REVOKE ALL ON FUNCTION mc_private.current_actor() FROM PUBLIC,anon,authenticated,service_role;

-- Identity only. Membership still reads under the NOBYPASSRLS executor.
-- This fixes the second direct auth.sessions read as well as current_actor.
CREATE OR REPLACE FUNCTION public.mc_owner_session(project text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor record; BEGIN
 IF project IS NULL OR project NOT IN ('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='PROJECT_DENIED'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.owner_auth_verification();
 RETURN pg_catalog.jsonb_build_object('subject',actor.subject,'role','OWNER','projectId',project,
  'aal',actor.aal,'expiresAt',actor.expires_at,'sessionActive',true,
  'memberActive',EXISTS(SELECT 1 FROM mc_private.members m
   WHERE m.subject=actor.subject AND m.project_id=project AND m.member_role='OWNER' AND m.active));
END; $$;
REVOKE ALL ON FUNCTION public.mc_owner_session(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_session(text) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;

-- Fail the whole transaction if a public helper path or ownership drift exists.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='mc_private.owner_auth_verification()'::regprocedure AND p.proowner='postgres'::regrole AND p.prosecdef)
  OR pg_catalog.has_function_privilege('anon','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_function_privilege('authenticated','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_function_privilege('service_role','mc_private.owner_auth_verification()','EXECUTE')
  OR NOT pg_catalog.has_function_privilege('mc_continuity_executor','mc_private.owner_auth_verification()','EXECUTE')
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE p.oid='mc_private.owner_auth_verification()'::regprocedure AND a.grantee NOT IN ('postgres'::regrole,'mc_continuity_executor'::regrole))
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.roleid='mc_continuity_executor'::regrole AND m.member='postgres'::regrole AND (m.set_option OR m.inherit_option))
 THEN RAISE EXCEPTION 'OWNER_HELPER_POSTCONDITION_FAILED'; END IF;
END; $$;
COMMIT;
