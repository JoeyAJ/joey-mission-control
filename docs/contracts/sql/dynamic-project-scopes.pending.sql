-- REVIEW CONTRACT ONLY: target scmvedfqwlhkyvljymjj; NOT APPLIED.
-- No automatic registration grant, public RPC, credential, source/report writer,
-- task execution, live membership expansion, or existing row modification.
-- Requires independent review and isolated PostgreSQL acceptance before use.
-- This is a pending SQL contract, not a CLI-generated applied migration.
BEGIN;
DO $pre$ BEGIN
 IF to_regclass('mc_private.explicit_project_scope_grants') IS NOT NULL
 OR to_regclass('mc_private.project_scope_validator_backup') IS NOT NULL
 OR to_regprocedure('mc_private.explicit_project_scope_allowed(text,text,text,text,text)') IS NOT NULL
 OR to_regprocedure('mc_private.project_draft_actor()') IS NULL THEN RAISE EXCEPTION 'SCOPE_PRECONDITION_FAILED';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit) THEN RAISE EXCEPTION 'RESTRICTED_EXECUTOR_REQUIRED';END IF;
END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_development_task(jsonb)')) IS DISTINCT FROM $expected$
DECLARE p jsonb;k text;v text;lim integer;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','taskId','revision','createdAt','updatedAt','projectId','track','request']),false)
  OR d->>'schemaVersion' IS DISTINCT FROM 'mc.development-task.v1'
  OR jsonb_typeof(d->'taskId') IS DISTINCT FROM 'string'
  OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR jsonb_typeof(d->'revision') IS DISTINCT FROM 'number'
  OR d->>'revision' !~ '^[1-9][0-9]{0,5}$'
  OR (d->>'revision')::bigint>100000
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>98304 THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['createdAt','updatedAt']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string'
   OR d->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
   OR to_char((d->>k)::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>d->>k THEN RETURN false; END IF;
 END LOOP;
 IF (d->>'updatedAt')::timestamptz<(d->>'createdAt')::timestamptz THEN RETURN false; END IF;
 IF jsonb_typeof(d->'projectId') IS DISTINCT FROM 'string' OR d->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  OR jsonb_typeof(d->'track') IS DISTINCT FROM 'string' OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM' THEN RETURN false;END IF;
 p:=d->'request';
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['feature','acceptance','constraints']),false) THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['feature','acceptance','constraints']) LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
  v:=p->>k;lim:=CASE k WHEN 'feature' THEN 32768 ELSE 6000 END;
  IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>lim
   OR v<>btrim(v,U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
   OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}|\y(password|secret|token)["'']?[[:space:]]*[:=]|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+' THEN RETURN false;END IF;
 END LOOP;
 IF p->>'feature'='' THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $expected$ THEN RAISE EXCEPTION 'VALIDATOR_BASELINE_MISMATCH_validate_development_task';END IF;END $pre$;
DO $pre$ BEGIN IF (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('mc_private.validate_task_review(jsonb)')) IS DISTINCT FROM $expected$
DECLARE k text;v text;b jsonb;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','projectId','track','taskId','taskRequirements','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','reportSequence','runId','workRef','codeSha','decision','comment']),false) THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['schemaVersion','projectId','track','taskId','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','runId','workRef','codeSha','decision','comment']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
 END LOOP;
 IF d->>'schemaVersion'<>'mc.owner-task-review.v1' OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR d->>'projectId' NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM'
  OR d->>'repositoryId' !~ '^[-A-Za-z0-9_.]+/[-A-Za-z0-9_.]+$' OR char_length(d->>'repositoryId')>200
  OR d->>'runId' !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$'
  OR d->>'reportRef'<>'mc/progress' OR d->>'reportPath' NOT IN ('.mission-control/runs/'||(d->>'runId')||'.json','.mission-control/runs-page-2/'||(d->>'runId')||'.json')
  OR jsonb_typeof(d->'reportSequence') IS DISTINCT FROM 'number' OR d->>'reportSequence' !~ '^[1-9][0-9]*$'
  OR (d->>'reportSequence')::bigint NOT BETWEEN 2 AND 64
  OR d->>'decision' NOT IN ('APPROVE','REQUEST_CHANGES') THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['canonicalRef','workRef']) LOOP
  v:=d->>k;IF v !~ '^[-A-Za-z0-9_./]+$' OR char_length(v)>255 OR v LIKE '%..%' OR v LIKE '/%' OR v LIKE '-%' OR v LIKE '%/' OR v LIKE '%//%' THEN RETURN false;END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['canonicalHeadSha','reportHeadSha','reportBlobId','codeSha']) LOOP IF d->>k !~ '^[a-f0-9]{40}$' THEN RETURN false;END IF;END LOOP;
 b:=d->'taskRequirements';
 IF NOT coalesce(mc_private.exact_keys(b,ARRAY['schemaVersion','revision','requestDigest']),false)
  OR jsonb_typeof(b->'schemaVersion') IS DISTINCT FROM 'string' OR b->>'schemaVersion'<>'mc.task-requirements.v1'
  OR jsonb_typeof(b->'revision') IS DISTINCT FROM 'number' OR b->>'revision' !~ '^[1-9][0-9]{0,5}$' OR (b->>'revision')::bigint>100000
  OR jsonb_typeof(b->'requestDigest') IS DISTINCT FROM 'string' OR b->>'requestDigest' !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 v:=d->>'comment';
 IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>2000
  OR octet_length(convert_to(v,'UTF8'))>8192 OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
  OR v~*'gh[pousr]_|github_pat_|Bearer[[:space:]]|sb_secret_|PRIVATE KEY|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.]|\y(password|secret|token)["'']?[[:space:]]*[:=]|api[[:space:]_-]*key["'']?[[:space:]]*[:=]|\y[a-z]{2,12}://|\y(javascript|data|file):'
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>16384 THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $expected$ THEN RAISE EXCEPTION 'VALIDATOR_BASELINE_MISMATCH_validate_task_review';END IF;END $pre$;
CREATE TABLE mc_private.project_scope_validator_backup(signature text PRIMARY KEY,definition text NOT NULL,owner_name text NOT NULL,acl aclitem[],volatility "char" NOT NULL);
REVOKE ALL ON mc_private.project_scope_validator_backup FROM PUBLIC,anon,authenticated,service_role,mc_continuity_executor;
INSERT INTO mc_private.project_scope_validator_backup SELECT oid::regprocedure::text,pg_get_functiondef(oid),pg_get_userbyid(proowner),proacl,provolatile FROM pg_proc WHERE oid IN ('mc_private.validate_development_task(jsonb)'::regprocedure,'mc_private.validate_task_review(jsonb)'::regprocedure);
CREATE TABLE mc_private.explicit_project_scope_grants(
 owner_subject uuid NOT NULL,project_id text NOT NULL,grant_document jsonb NOT NULL,
 PRIMARY KEY(owner_subject,project_id),
 CHECK(coalesce(
  mc_private.exact_keys(grant_document,ARRAY['schemaVersion','projectId','ownerSubject','repositoryId','repositoryNumericId','ref','registrationRequestDigest','approvalRef','revision','expiresAt','revoked','capabilities'])
  AND grant_document->>'schemaVersion'='mc.project-scope-grant.v1'
  AND jsonb_typeof(grant_document->'schemaVersion')='string'
  AND jsonb_typeof(grant_document->'projectId')='string'
  AND jsonb_typeof(grant_document->'ownerSubject')='string'
  AND jsonb_typeof(grant_document->'repositoryId')='string'
  AND jsonb_typeof(grant_document->'ref')='string'
  AND jsonb_typeof(grant_document->'registrationRequestDigest')='string'
  AND jsonb_typeof(grant_document->'approvalRef')='string'
  AND project_id~'^[A-Z][A-Z0-9_]{2,63}$'
  AND project_id NOT IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM')
  AND grant_document->>'projectId'=project_id AND grant_document->>'ownerSubject'=owner_subject::text
  AND grant_document->>'repositoryId'~'^JoeyAJ/[-A-Za-z0-9_.]+$' AND char_length(grant_document->>'repositoryId')<=200
  AND (grant_document->>'repositoryNumericId') NOT IN ('1404959099','1250989709','1183908659','1402869585','1403778863')
  AND jsonb_typeof(grant_document->'repositoryNumericId')='number' AND grant_document->>'repositoryNumericId'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'repositoryNumericId')::bigint<=9007199254740991
  AND jsonb_typeof(grant_document->'revision')='number' AND grant_document->>'revision'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'revision')::bigint<=9007199254740991
  AND jsonb_typeof(grant_document->'expiresAt')='number' AND grant_document->>'expiresAt'~'^[1-9][0-9]{0,15}$' AND (grant_document->>'expiresAt')::bigint<=9007199254740991
  AND grant_document->>'registrationRequestDigest'~'^[a-f0-9]{64}$'
  AND grant_document->>'approvalRef'~'^[-A-Za-z0-9_.:]{1,120}$'
  AND grant_document->>'ref'~'^[-A-Za-z0-9_./]+$' AND char_length(grant_document->>'ref')<=255 AND grant_document->>'ref' NOT LIKE '%..%' AND grant_document->>'ref' NOT LIKE '%//%' AND grant_document->>'ref' NOT LIKE '/%' AND grant_document->>'ref' NOT LIKE '-%' AND grant_document->>'ref' NOT LIKE '%/'
  AND jsonb_typeof(grant_document->'revoked')='boolean'
  AND grant_document->'capabilities'='{"sourceRead":true,"reportRead":true,"reportWrite":true,"task":true,"review":true}'::jsonb,false))
);
REVOKE ALL ON mc_private.explicit_project_scope_grants FROM PUBLIC,anon,authenticated,service_role,mc_continuity_executor;
ALTER TABLE mc_private.explicit_project_scope_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.explicit_project_scope_grants FORCE ROW LEVEL SECURITY;
CREATE POLICY explicit_project_owner_read ON mc_private.explicit_project_scope_grants FOR SELECT TO mc_continuity_executor USING(owner_subject=mc_private.project_draft_actor());
GRANT SELECT ON mc_private.explicit_project_scope_grants TO mc_continuity_executor;
-- No INSERT/UPDATE/DELETE grants or RPC. A separately reviewed admin action must
-- write each exact registration-bound grant; this migration inserts ZERO grants.
CREATE FUNCTION mc_private.explicit_project_scope_allowed(p text,t text,operation text,repository text,canonical_ref text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $body$
DECLARE actor uuid;g jsonb;
BEGIN
 -- Preserve the existing fixed scope behavior; existing Owner RPC checks remain.
 IF p IN ('MISSION_CONTROL','NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM') THEN RETURN true;END IF;
 IF t IS DISTINCT FROM 'BASELINE' OR operation IS NULL OR operation NOT IN ('task','review') THEN RETURN false;END IF;
 actor:=mc_private.project_draft_actor();
 SELECT grant_document INTO g FROM mc_private.explicit_project_scope_grants WHERE owner_subject=actor AND project_id=p;
 IF g IS NULL OR g->'revoked' IS DISTINCT FROM 'false'::jsonb OR (g->>'expiresAt')::bigint<=floor(extract(epoch FROM statement_timestamp())*1000) THEN RETURN false;END IF;
 IF operation='review' AND (repository IS DISTINCT FROM g->>'repositoryId' OR canonical_ref IS DISTINCT FROM g->>'ref') THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
REVOKE ALL ON FUNCTION mc_private.explicit_project_scope_allowed(text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION mc_private.explicit_project_scope_allowed(text,text,text,text,text) TO mc_continuity_executor;
CREATE OR REPLACE FUNCTION mc_private.validate_development_task(d jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $body$
DECLARE p jsonb;k text;v text;lim integer;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','taskId','revision','createdAt','updatedAt','projectId','track','request']),false)
  OR d->>'schemaVersion' IS DISTINCT FROM 'mc.development-task.v1'
  OR jsonb_typeof(d->'taskId') IS DISTINCT FROM 'string'
  OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR jsonb_typeof(d->'revision') IS DISTINCT FROM 'number'
  OR d->>'revision' !~ '^[1-9][0-9]{0,5}$'
  OR (d->>'revision')::bigint>100000
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>98304 THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['createdAt','updatedAt']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string'
   OR d->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
   OR to_char((d->>k)::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>d->>k THEN RETURN false; END IF;
 END LOOP;
 IF (d->>'updatedAt')::timestamptz<(d->>'createdAt')::timestamptz THEN RETURN false; END IF;
 IF jsonb_typeof(d->'projectId') IS DISTINCT FROM 'string' OR NOT mc_private.explicit_project_scope_allowed(d->>'projectId',d->>'track','task',NULL,NULL)
  OR jsonb_typeof(d->'track') IS DISTINCT FROM 'string' OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM' THEN RETURN false;END IF;
 p:=d->'request';
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['feature','acceptance','constraints']),false) THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['feature','acceptance','constraints']) LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
  v:=p->>k;lim:=CASE k WHEN 'feature' THEN 32768 ELSE 6000 END;
  IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>lim
   OR v<>btrim(v,U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
   OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}|\y(password|secret|token)["'']?[[:space:]]*[:=]|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+' THEN RETURN false;END IF;
 END LOOP;
 IF p->>'feature'='' THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
CREATE OR REPLACE FUNCTION mc_private.validate_task_review(d jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $body$
DECLARE k text;v text;b jsonb;
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','projectId','track','taskId','taskRequirements','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','reportSequence','runId','workRef','codeSha','decision','comment']),false) THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['schemaVersion','projectId','track','taskId','repositoryId','canonicalRef','canonicalHeadSha','reportRef','reportPath','reportHeadSha','reportBlobId','runId','workRef','codeSha','decision','comment']) LOOP
  IF jsonb_typeof(d->k) IS DISTINCT FROM 'string' THEN RETURN false;END IF;
 END LOOP;
 IF d->>'schemaVersion'<>'mc.owner-task-review.v1' OR d->>'taskId' !~ '^task_[a-f0-9]{24}$'
  OR NOT mc_private.explicit_project_scope_allowed(d->>'projectId',d->>'track','review',d->>'repositoryId',d->>'canonicalRef')
  OR d->>'track' NOT IN ('BASELINE','UNIVERSITY_CANDIDATE')
  OR d->>'track'='UNIVERSITY_CANDIDATE' AND d->>'projectId'<>'JOEY_ASSET_SYSTEM'
  OR d->>'repositoryId' !~ '^[-A-Za-z0-9_.]+/[-A-Za-z0-9_.]+$' OR char_length(d->>'repositoryId')>200
  OR d->>'runId' !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$'
  OR d->>'reportRef'<>'mc/progress' OR d->>'reportPath' NOT IN ('.mission-control/runs/'||(d->>'runId')||'.json','.mission-control/runs-page-2/'||(d->>'runId')||'.json')
  OR jsonb_typeof(d->'reportSequence') IS DISTINCT FROM 'number' OR d->>'reportSequence' !~ '^[1-9][0-9]*$'
  OR (d->>'reportSequence')::bigint NOT BETWEEN 2 AND 64
  OR d->>'decision' NOT IN ('APPROVE','REQUEST_CHANGES') THEN RETURN false;END IF;
 FOR k IN SELECT unnest(ARRAY['canonicalRef','workRef']) LOOP
  v:=d->>k;IF v !~ '^[-A-Za-z0-9_./]+$' OR char_length(v)>255 OR v LIKE '%..%' OR v LIKE '/%' OR v LIKE '-%' OR v LIKE '%/' OR v LIKE '%//%' THEN RETURN false;END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['canonicalHeadSha','reportHeadSha','reportBlobId','codeSha']) LOOP IF d->>k !~ '^[a-f0-9]{40}$' THEN RETURN false;END IF;END LOOP;
 b:=d->'taskRequirements';
 IF NOT coalesce(mc_private.exact_keys(b,ARRAY['schemaVersion','revision','requestDigest']),false)
  OR jsonb_typeof(b->'schemaVersion') IS DISTINCT FROM 'string' OR b->>'schemaVersion'<>'mc.task-requirements.v1'
  OR jsonb_typeof(b->'revision') IS DISTINCT FROM 'number' OR b->>'revision' !~ '^[1-9][0-9]{0,5}$' OR (b->>'revision')::bigint>100000
  OR jsonb_typeof(b->'requestDigest') IS DISTINCT FROM 'string' OR b->>'requestDigest' !~ '^[a-f0-9]{64}$' THEN RETURN false;END IF;
 v:=d->>'comment';
 IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>2000
  OR octet_length(convert_to(v,'UTF8'))>8192 OR regexp_replace(v,E'[\\n\\r\\t]','','g')~'[[:cntrl:]]'
  OR v~*'gh[pousr]_|github_pat_|Bearer[[:space:]]|sb_secret_|PRIVATE KEY|\yeyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.]|\y(password|secret|token)["'']?[[:space:]]*[:=]|api[[:space:]_-]*key["'']?[[:space:]]*[:=]|\y[a-z]{2,12}://|\y(javascript|data|file):'
  OR octet_length(convert_to(mc_private.canonical_json(d),'UTF8'))>16384 THEN RETURN false;END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
-- CREATE OR REPLACE preserves current function ownership/ACL. Fail closed if not.
DO $verify$ BEGIN
 IF EXISTS(SELECT 1 FROM mc_private.project_scope_validator_backup b JOIN pg_proc p ON p.oid=to_regprocedure(b.signature) WHERE pg_get_userbyid(p.proowner)<>b.owner_name OR p.proacl IS DISTINCT FROM b.acl OR p.provolatile<>'s') THEN RAISE EXCEPTION 'VALIDATOR_OWNER_ACL_CHANGED';END IF;
 IF EXISTS(SELECT 1 FROM mc_private.explicit_project_scope_grants) THEN RAISE EXCEPTION 'ZERO_INITIAL_GRANTS_REQUIRED';END IF;
END $verify$;
COMMIT;
