// Exact two-body correction planner. No DB connection, grants or authority changes.
export const originalReadSelect=` SELECT coalesce(max(d.revision),0),coalesce(max(d.committed_at),0) INTO rev,last_time FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch;
 SELECT coalesce(jsonb_agg(x ORDER BY (x->>'revision')::bigint),'[]'::jsonb) INTO rows FROM(
  SELECT pg_catalog.jsonb_build_object('revision',d.revision,'operationId',d.operation_id,'digest',d.digest,'committedAt',d.committed_at,'ownerSubject',d.owner_subject,'aal',d.owner_aal,'content',d.content) AS x
  FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch AND d.revision>after_revision ORDER BY d.revision LIMIT page_limit
 ) bounded;`;
export const correctedReadSelect=` WITH metadata AS (
  SELECT coalesce(max(d.revision),0) AS latest_revision,coalesce(max(d.committed_at),0) AS latest_time
  FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch
 ),bounded AS (
  SELECT pg_catalog.jsonb_build_object('revision',d.revision,'operationId',d.operation_id,'digest',d.digest,'committedAt',d.committed_at,'ownerSubject',d.owner_subject,'aal',d.owner_aal,'content',d.content) AS x
  FROM mc_private.coordinator_owner_decisions d WHERE d.project_id=project AND d.epoch=scope.epoch AND d.revision>after_revision ORDER BY d.revision LIMIT page_limit
 )
 SELECT m.latest_revision,m.latest_time,coalesce((SELECT jsonb_agg(b.x ORDER BY (b.x->>'revision')::bigint) FROM bounded b),'[]'::jsonb)
 INTO rev,last_time,rows FROM metadata m;`;
export const originalWriteAnchor="  OR binding->>'schemaVersion' IS DISTINCT FROM '1' OR jsonb_typeof(binding->'schemaVersion') IS DISTINCT FROM 'number'";
export const correctedWriteAnchor=`  OR jsonb_typeof(binding->'proposalId') IS DISTINCT FROM 'string' OR binding->>'proposalId' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR jsonb_typeof(binding->'proposalOperationId') IS DISTINCT FROM 'string' OR binding->>'proposalOperationId' !~ '^[A-Za-z0-9_-]{1,80}$'
  OR jsonb_typeof(binding->'resultOperationId') IS DISTINCT FROM 'string' OR binding->>'resultOperationId' !~ '^[A-Za-z0-9_-]{1,80}$'
${originalWriteAnchor}`;
export const correctionTargets=Object.freeze({read:Object.freeze({signature:'public.mc_owner_coordinator_decisions(text,bigint,integer)',originalMd5:'43bcb9bbda9e44b2f675188abbf46b24',before:originalReadSelect,after:correctedReadSelect}),write:Object.freeze({signature:'public.mc_owner_decide_coordinator_result(jsonb)',originalMd5:'80e2e69e1038153e0b698105759b759a',before:originalWriteAnchor,after:correctedWriteAnchor})});
export function correctOwnerDecisionDefinition(definition,kind){const t=correctionTargets[kind];if(!t||typeof definition!=='string'||definition.split(t.before).length!==2||definition.includes(t.after)||!definition.includes('SECURITY DEFINER')||!definition.includes("SET search_path=''")&&!definition.includes("SET search_path TO ''"))throw Error('OWNER_DECISION_CORRECTION_SOURCE_DRIFT');return definition.replace(t.before,()=>t.after);}
export function ownerDecisionCorrectionSql(kind){const t=correctionTargets[kind];if(!t)throw Error('OWNER_DECISION_CORRECTION_TARGET');return `-- REVIEW ONLY until existing ownership/schema permissions permit replacement.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='2s';
DO $patch$ DECLARE definition text; current_owner oid;
BEGIN
 SELECT p.proowner,pg_get_functiondef(p.oid) INTO STRICT current_owner,definition FROM pg_proc p WHERE p.oid='${t.signature}'::regprocedure;
 IF NOT pg_has_role(current_user,current_owner,'USAGE') OR NOT has_schema_privilege(current_user,'public','CREATE') THEN RAISE EXCEPTION 'OWNER_DECISION_CORRECTION_OWNER_DENIED';END IF;
 IF md5(definition)<>'${t.originalMd5}' OR strpos(definition,$before$${t.before}$before$)=0 THEN RAISE EXCEPTION 'OWNER_DECISION_CORRECTION_SOURCE_DRIFT';END IF;
 EXECUTE replace(definition,$before$${t.before}$before$,$after$${t.after}$after$);
END $patch$;
COMMIT;
`;}
