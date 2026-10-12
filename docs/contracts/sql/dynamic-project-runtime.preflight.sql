-- READ ONLY. Target scmvedfqwlhkyvljymjj. NOT EXECUTED by this release.
-- Source/ACL metadata only: no task/review/Owner/session/grant row contents.
-- Run before requesting exact SQL approval; do not widen rights to make it pass.
BEGIN READ ONLY;
SELECT current_user,session_user,current_database(),current_setting('server_version_num') AS version_num;
SELECT rolname,rolsuper,rolinherit,rolbypassrls FROM pg_roles WHERE rolname IN ('postgres','mc_continuity_executor');
SELECT r.rolname AS role,u.rolname AS member,g.rolname AS grantor,m.admin_option,m.set_option,m.inherit_option FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE m.roleid=to_regrole('mc_continuity_executor') ORDER BY u.rolname,g.rolname;
SELECT pg_has_role('postgres','mc_continuity_executor','SET') AS effective_set,pg_has_role('postgres','mc_continuity_executor','USAGE') AS effective_inherit;
SELECT has_schema_privilege('mc_continuity_executor','mc_private','CREATE') AS private_create,has_schema_privilege('mc_continuity_executor','public','CREATE') AS public_create;
WITH expected(signature,source_md5) AS (VALUES
 ('mc_private.validate_development_task(jsonb)','e18d0954fbbd5fa30ecb925f02ea2dcf'),
 ('mc_private.validate_task_review(jsonb)','05d91095b96380aff449e41bf21ff9b7'),
 ('public.mc_owner_development_task_list()','62ef9551b088268379b51ec94d2f129d'),
 ('public.mc_owner_development_task_save(jsonb,bigint)','57cbef02fe8d0aa0401f6fa1448759bd'),
 ('public.mc_owner_task_review_list(text,bigint,integer)','072aab8e2bd6276c56e7de85f86d1faa'),
 ('public.mc_owner_task_review_append(jsonb,uuid,bigint)','d7201f4f10a39dad44aadfe25357a926'))
SELECT e.signature,p.oid IS NOT NULL AS installed,pg_get_userbyid(p.proowner) AS owner,p.provolatile,p.prosecdef,md5(p.prosrc)=e.source_md5 AS exact_source_matches,p.proacl
FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature) ORDER BY e.signature;
SELECT c.oid::regclass AS relation,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl FROM pg_class c WHERE c.oid IN (to_regclass('mc_private.development_tasks'),to_regclass('mc_private.task_review_decisions'));
SELECT polrelid::regclass AS relation,polname,polcmd,polroles,pg_get_expr(polqual,polrelid) AS using_expression,pg_get_expr(polwithcheck,polrelid) AS check_expression FROM pg_policy WHERE polrelid IN (to_regclass('mc_private.development_tasks'),to_regclass('mc_private.task_review_decisions')) ORDER BY relation,polname;
SELECT r.role_name,has_table_privilege(r.role_name,'mc_private.development_tasks','SELECT') AS task_direct_read,has_table_privilege(r.role_name,'mc_private.task_review_decisions','SELECT') AS review_direct_read FROM (VALUES ('anon'),('authenticated'),('service_role')) r(role_name);
SELECT to_regprocedure('mc_private.project_draft_actor()') AS actor_helper,to_regprocedure('mc_private.owner_auth_verification()') AS session_helper,to_regprocedure('mc_private.canonical_json(jsonb)') AS canonical_helper,to_regprocedure('mc_private.exact_keys(jsonb,text[])') AS keys_helper;
SELECT to_regclass('mc_private.explicit_project_scope_grants') AS grant_table,to_regclass('mc_private.project_scope_validator_backup') AS function_backup,to_regclass('mc_private.project_scope_policy_backup') AS policy_backup,to_regprocedure('public.mc_owner_project_connection_authorize(text)') AS authorize_rpc,to_regprocedure('public.mc_owner_project_connection_catalog()') AS catalog_rpc;
COMMIT;
-- Expected: recorded non-superuser postgres ADMIN membership, SET/INHERIT false,
-- no executor schema CREATE at rest, six exact restricted function baselines,
-- forced table RLS, no direct anon/authenticated/service_role reads, new objects absent.
-- Missing/mismatched evidence is a STOP. This query grants/changes nothing.
