-- REVIEW ONLY; remove only the two read ports through their owning role.
-- Run before dynamic-project-scopes.rollback.sql. Retain all data/history.
BEGIN;
-- Exact read-only live fingerprint observed 2026-10-13T00:07:22Z.
DO $membership$ DECLARE actual jsonb;BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')<>'170011' THEN RAISE EXCEPTION 'EXACT_PG17_POSTGRES_CALLER_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres' AND rolcanlogin AND NOT rolsuper AND rolinherit AND rolbypassrls AND rolcreatedb AND rolcreaterole)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolinherit AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole) THEN RAISE EXCEPTION 'EXACT_RECORDED_ROLE_ATTRIBUTES_REQUIRED';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'member',u.rolname,'grantor',g.rolname,'admin',m.admin_option,'set',m.set_option,'inherit',m.inherit_option) ORDER BY u.rolname,g.rolname),'[]'::jsonb) INTO actual FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE m.roleid='mc_continuity_executor'::regrole;
 IF actual IS DISTINCT FROM '[{"role":"mc_continuity_executor","member":"postgres","grantor":"postgres","admin":false,"set":false,"inherit":false},{"role":"mc_continuity_executor","member":"postgres","grantor":"supabase_admin","admin":true,"set":false,"inherit":false}]'::jsonb
 OR pg_has_role('postgres','mc_continuity_executor','SET') OR pg_has_role('postgres','mc_continuity_executor','USAGE')
 OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE') OR has_schema_privilege('mc_continuity_executor','public','CREATE') THEN RAISE EXCEPTION 'EXACT_TWO_MEMBERSHIP_ROWS_REQUIRED';END IF;
END $membership$;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
SET LOCAL ROLE mc_continuity_executor;
DROP FUNCTION public.mc_owner_project_connection_authorize(text);
DROP FUNCTION public.mc_owner_project_connection_catalog();
RESET ROLE;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
-- Exact read-only live fingerprint observed 2026-10-13T00:07:22Z.
DO $membership$ DECLARE actual jsonb;BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')<>'170011' THEN RAISE EXCEPTION 'EXACT_PG17_POSTGRES_CALLER_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres' AND rolcanlogin AND NOT rolsuper AND rolinherit AND rolbypassrls AND rolcreatedb AND rolcreaterole)
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolinherit AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole) THEN RAISE EXCEPTION 'EXACT_RECORDED_ROLE_ATTRIBUTES_REQUIRED';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'member',u.rolname,'grantor',g.rolname,'admin',m.admin_option,'set',m.set_option,'inherit',m.inherit_option) ORDER BY u.rolname,g.rolname),'[]'::jsonb) INTO actual FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE m.roleid='mc_continuity_executor'::regrole;
 IF actual IS DISTINCT FROM '[{"role":"mc_continuity_executor","member":"postgres","grantor":"postgres","admin":false,"set":false,"inherit":false},{"role":"mc_continuity_executor","member":"postgres","grantor":"supabase_admin","admin":true,"set":false,"inherit":false}]'::jsonb
 OR pg_has_role('postgres','mc_continuity_executor','SET') OR pg_has_role('postgres','mc_continuity_executor','USAGE')
 OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE') OR has_schema_privilege('mc_continuity_executor','public','CREATE') THEN RAISE EXCEPTION 'EXACT_TWO_MEMBERSHIP_ROWS_REQUIRED';END IF;
END $membership$;
COMMIT;
