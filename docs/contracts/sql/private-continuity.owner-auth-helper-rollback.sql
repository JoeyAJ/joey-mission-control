-- REVIEW CANDIDATE / NOT APPLIED: restore the recorded blocked bridge definitions.
-- Apply only if the approved helper repair needs rollback. No Auth object changes.
-- Restores the existing fail-closed 42501 blocker; not a working Auth bridge.
-- Reset browser sessionBridgeVerified=false/ownerSubject=null if later enabled.
BEGIN;
SET LOCAL statement_timeout='15s';
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE OR REPLACE FUNCTION mc_private.current_actor() RETURNS TABLE(subject uuid,session_id uuid,aal text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claims jsonb; sub uuid; sid uuid; level text; expires numeric; now_at timestamptz:=clock_timestamp();
BEGIN
 BEGIN
  claims:=nullif(current_setting('request.jwt.claims',true),'')::jsonb;
  sub:=(claims->>'sub')::uuid; sid:=(claims->>'session_id')::uuid;
  level:=claims->>'aal'; expires:=(claims->>'exp')::numeric;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED'; END;
 IF sub IS DISTINCT FROM '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid OR sid IS NULL
  OR claims->>'role' IS DISTINCT FROM 'authenticated'
  OR claims->>'iss' IS DISTINCT FROM 'https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1'
  OR NOT coalesce(claims->'aud'='"authenticated"'::jsonb OR claims->'aud' @> '["authenticated"]'::jsonb,false)
  OR level IS NULL OR level NOT IN ('aal1','aal2') OR expires IS NULL OR expires::text!~'^[0-9]+$' OR expires>9007199254740 OR expires<=extract(epoch FROM now_at)
  OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=sub AND u.is_anonymous IS FALSE AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now_at))
  OR NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=sub AND s.aal::text=level AND (s.not_after IS NULL OR s.not_after>now_at))
  OR (level='aal2' AND NOT EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=sub AND f.status::text='verified' AND f.factor_type::text='totp'))
 THEN RAISE EXCEPTION USING ERRCODE='28000',MESSAGE='OWNER_SESSION_DENIED'; END IF;
 RETURN QUERY SELECT sub,sid,level;
END; $$;
REVOKE ALL ON FUNCTION mc_private.current_actor() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.mc_owner_session(project text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor record; expiry bigint; BEGIN
 IF project IS NULL OR project NOT IN ('NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='PROJECT_DENIED'; END IF;
 SELECT * INTO STRICT actor FROM mc_private.current_actor();
 SELECT floor(least((current_setting('request.jwt.claims')::jsonb->>'exp')::numeric,coalesce(extract(epoch FROM s.not_after),(current_setting('request.jwt.claims')::jsonb->>'exp')::numeric))*1000)::bigint INTO STRICT expiry FROM auth.sessions s WHERE s.id=actor.session_id AND s.user_id=actor.subject;
 RETURN jsonb_build_object('subject',actor.subject,'role','OWNER','projectId',project,'aal',actor.aal,'expiresAt',expiry,'sessionActive',true,'memberActive',EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=actor.subject AND m.project_id=project AND m.member_role='OWNER' AND m.active));
END; $$;
REVOKE ALL ON FUNCTION public.mc_owner_session(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_session(text) TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
DROP FUNCTION mc_private.owner_auth_verification();
COMMIT;
