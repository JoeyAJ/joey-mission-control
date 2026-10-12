-- REVIEW ONLY; target scmvedfqwlhkyvljymjj. Requires reviewed scope migration.
-- Read-only native ports: combined live Owner/session and current project grant.
-- Same temporary ownership protocol; no new role, table DML grant or grant writer.
BEGIN;
DO $pre$ BEGIN
 IF current_user<>'postgres' OR to_regclass('mc_private.explicit_project_scope_grants') IS NULL
 OR to_regprocedure('public.mc_owner_project_connection_authorize(text)') IS NOT NULL
 OR to_regprocedure('public.mc_owner_project_connection_catalog()') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole AND admin_option AND NOT set_option AND NOT inherit_option) THEN RAISE EXCEPTION 'EXACT_RUNTIME_PRECONDITIONS_REQUIRED';END IF;
END $pre$;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE FUNCTION public.mc_owner_project_connection_authorize(project text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;a record;g jsonb;expiry bigint;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF project IS NULL OR project !~ '^[A-Z][A-Z0-9_]{2,63}$' THEN RAISE EXCEPTION 'PROJECT_SCOPE_DENIED' USING ERRCODE='42501';END IF;
 SELECT grant_document INTO g FROM mc_private.explicit_project_scope_grants WHERE owner_subject=actor AND project_id=$1;
 IF g IS NULL OR g->'revoked' IS DISTINCT FROM 'false'::jsonb OR (g->>'expiresAt')::bigint<=floor(extract(epoch FROM clock_timestamp())*1000) THEN RAISE EXCEPTION 'PROJECT_SCOPE_DENIED' USING ERRCODE='42501';END IF;
 PERFORM mc_private.project_draft_actor();SELECT * INTO a FROM mc_private.owner_auth_verification();
 expiry:=least(a.expires_at::bigint,(g->>'expiresAt')::bigint,floor(extract(epoch FROM clock_timestamp())*1000)::bigint+30000);
 IF expiry<=floor(extract(epoch FROM clock_timestamp())*1000) THEN RAISE EXCEPTION 'PROJECT_SCOPE_DENIED' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_EXPLICIT_PROJECT_RUNTIME_AUTHORIZATION','actor',jsonb_build_object('subject',actor,'role','OWNER','aal','aal2','verified',true,'sessionActive',true,'identityProject','NEXAEON','expiresAt',expiry),'grants',jsonb_build_array(g));
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_project_connection_authorize(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_project_connection_authorize(text) TO authenticated;
CREATE FUNCTION public.mc_owner_project_connection_catalog() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;a record;grants jsonb;expiry bigint;
BEGIN
 actor:=mc_private.project_draft_actor();
 SELECT coalesce(jsonb_agg(grant_document ORDER BY project_id),'[]'::jsonb) INTO grants FROM mc_private.explicit_project_scope_grants WHERE owner_subject=actor AND grant_document->'revoked'='false'::jsonb AND (grant_document->>'expiresAt')::bigint>floor(extract(epoch FROM clock_timestamp())*1000);
 IF jsonb_array_length(grants)>32 THEN RAISE EXCEPTION 'PROJECT_SCOPE_LIMIT' USING ERRCODE='54000';END IF;
 PERFORM mc_private.project_draft_actor();SELECT * INTO a FROM mc_private.owner_auth_verification();
 expiry:=least(a.expires_at::bigint,floor(extract(epoch FROM clock_timestamp())*1000)::bigint+30000);
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_EXPLICIT_PROJECT_RUNTIME_AUTHORIZATION','actor',jsonb_build_object('subject',actor,'role','OWNER','aal','aal2','verified',true,'sessionActive',true,'identityProject','NEXAEON','expiresAt',expiry),'grants',grants);
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_project_connection_catalog() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_project_connection_catalog() TO authenticated;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;
