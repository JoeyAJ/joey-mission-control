-- REVIEW ONLY. Same restricted ownership protocol; never delete task/review rows.
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
DO $pre$ BEGIN IF current_user<>'postgres' OR (SELECT count(*) FROM mc_private.project_scope_validator_backup)<>6 THEN RAISE EXCEPTION 'EXACT_BACKUP_REQUIRED';END IF;
 END $pre$;
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
-- Existing RLS remains on. Requires existing verified Owner context if rows exist.
DO $history$ BEGIN IF EXISTS(SELECT 1 FROM mc_private.development_tasks WHERE task->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')) THEN RAISE EXCEPTION 'DYNAMIC_HISTORY_REQUIRES_RECOVERY_PLAN';END IF;END $history$;
DO $restore$ DECLARE b record;BEGIN
 FOR b IN SELECT * FROM mc_private.project_scope_validator_backup LOOP EXECUTE b.definition;END LOOP;
 FOR b IN SELECT * FROM mc_private.project_scope_policy_backup LOOP EXECUTE format('ALTER POLICY %I ON %s WITH CHECK (%s)',b.policy_name,b.relation_name,b.with_check);END LOOP;
END $restore$;
DROP FUNCTION mc_private.explicit_project_scope_allowed(text,text,text,text,text);
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
DO $verify$ BEGIN IF EXISTS(SELECT 1 FROM mc_private.project_scope_validator_backup b JOIN pg_proc p ON p.oid=to_regprocedure(b.signature) WHERE pg_get_userbyid(p.proowner)<>b.owner_name OR p.proacl IS DISTINCT FROM b.acl OR p.provolatile<>b.volatility) THEN RAISE EXCEPTION 'EXACT_RESTORE_FAILED';END IF;END $verify$;
DROP TABLE mc_private.explicit_project_scope_grants;
DROP TABLE mc_private.project_scope_policy_backup;
DROP TABLE mc_private.project_scope_validator_backup;
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
