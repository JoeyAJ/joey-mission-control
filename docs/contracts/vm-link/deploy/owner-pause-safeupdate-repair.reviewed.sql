-- Guarded correction through the established temporary-inheritance workflow.
-- Only the existing postgres-grantor membership briefly inherits the function owner.
-- Restores it before commit; no pause/revoke invocation or operational row update.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
DO $repair$
DECLARE definition text; body_before text; owner_before oid; acl_before aclitem[]; settings_before text[]; membership_before jsonb; membership_after jsonb;
BEGIN
 IF current_user<>'postgres'
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','USAGE')
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole AND grantor='postgres'::regrole AND NOT set_option AND NOT inherit_option AND NOT admin_option)
 THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_PERMISSION_BASELINE'; END IF;
 SELECT jsonb_agg(jsonb_build_object('grantor',grantor,'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY grantor)
 INTO membership_before FROM pg_catalog.pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole;
 SELECT pg_get_functiondef(p.oid),p.prosrc,p.proowner,p.proacl,p.proconfig
 INTO STRICT definition,body_before,owner_before,acl_before,settings_before
 FROM pg_catalog.pg_proc p WHERE p.oid='public.mc_vm_link_owner(jsonb)'::regprocedure;
 IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body_before,'UTF8')),'hex')<>'180d510bdb690a0027d247a6c321d831b3201c16945866019a17f9a20088bef8' THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_SOURCE_DRIFT'; END IF;
 GRANT mc_continuity_executor TO postgres WITH INHERIT TRUE GRANTED BY postgres;
 IF NOT pg_catalog.pg_has_role(current_user,owner_before,'USAGE')
  OR NOT pg_catalog.has_schema_privilege(current_user,'public','CREATE')
 THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_OWNER_DENIED'; END IF;
 IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(body_before,'UTF8')),'hex')<>'180d510bdb690a0027d247a6c321d831b3201c16945866019a17f9a20088bef8'
  OR owner_before<>'mc_continuity_executor'::regrole
  OR settings_before IS DISTINCT FROM ARRAY['search_path=""']
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid='public.mc_vm_link_owner(jsonb)'::regprocedure AND prosecdef)
 THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_SOURCE_DRIFT'; END IF;
 EXECUTE pg_catalog.replace(definition,
  'UPDATE mc_vm_link.workers SET enabled=false,revoked=true;',
  'UPDATE mc_vm_link.workers SET enabled=false,revoked=true WHERE enabled OR NOT revoked;');
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid='public.mc_vm_link_owner(jsonb)'::regprocedure
  AND p.proowner=owner_before AND p.proacl IS NOT DISTINCT FROM acl_before AND p.proconfig IS NOT DISTINCT FROM settings_before AND p.prosecdef
  AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')='8ecebe115ce12d759431920b6237d834fdb641307a352ee092f2703e58bcfb93')
 THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_POSTCONDITION'; END IF;
 GRANT mc_continuity_executor TO postgres WITH INHERIT FALSE GRANTED BY postgres;
 SELECT jsonb_agg(jsonb_build_object('grantor',grantor,'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY grantor)
 INTO membership_after FROM pg_catalog.pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole;
 IF membership_after IS DISTINCT FROM membership_before
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','USAGE')
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
 THEN RAISE EXCEPTION 'OWNER_PAUSE_REPAIR_PERMISSION_RESTORE'; END IF;
END $repair$;
COMMIT;
