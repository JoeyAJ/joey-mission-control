-- REVIEW ONLY; no CASCADE, no task/review/report deletion.
-- If new-project task rows exist, restoration retains them as inaccessible
-- history under the old validators. Stop for an explicit recovery plan first.
BEGIN;
DO $restore$ DECLARE b record;BEGIN
 IF EXISTS(SELECT 1 FROM mc_private.development_tasks WHERE task->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')) THEN RAISE EXCEPTION 'DYNAMIC_TASK_ROWS_REQUIRE_RECOVERY_PLAN';END IF;
 IF (SELECT count(*) FROM mc_private.project_scope_validator_backup)<>2 THEN RAISE EXCEPTION 'EXACT_VALIDATOR_BACKUP_REQUIRED';END IF;
 FOR b IN SELECT * FROM mc_private.project_scope_validator_backup LOOP
  EXECUTE b.definition;
  IF (SELECT pg_get_userbyid(proowner)<>b.owner_name OR proacl IS DISTINCT FROM b.acl OR provolatile<>b.volatility FROM pg_proc WHERE oid=to_regprocedure(b.signature)) THEN RAISE EXCEPTION 'RESTORE_OWNER_ACL_MISMATCH';END IF;
 END LOOP;
END $restore$;
DROP FUNCTION mc_private.explicit_project_scope_allowed(text,text,text,text,text);
DROP TABLE mc_private.explicit_project_scope_grants;
DROP TABLE mc_private.project_scope_validator_backup;
COMMIT;
