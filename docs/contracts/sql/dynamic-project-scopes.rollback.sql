-- REVIEW ONLY. Same restricted ownership protocol; never delete task/review rows.
BEGIN;
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
COMMIT;
