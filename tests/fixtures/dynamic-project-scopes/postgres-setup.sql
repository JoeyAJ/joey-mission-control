CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE mc_continuity_executor NOLOGIN NOINHERIT;
CREATE SCHEMA mc_private;
CREATE FUNCTION mc_private.exact_keys(d jsonb,keys text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$SELECT jsonb_typeof(d)='object' AND (SELECT count(*) FROM jsonb_object_keys(d))=cardinality(keys) AND d ?& keys$$;
CREATE FUNCTION mc_private.canonical_json(d jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT d::text$$;
CREATE FUNCTION mc_private.project_draft_actor() RETURNS uuid LANGUAGE plpgsql STABLE AS $$BEGIN IF current_setting('mc_test.owner_active',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'OWNER_DENIED';END IF;RETURN '11111111-1111-4111-8111-111111111111'::uuid;END$$;
GRANT USAGE ON SCHEMA mc_private TO mc_continuity_executor;
GRANT EXECUTE ON FUNCTION mc_private.exact_keys(jsonb,text[]),mc_private.canonical_json(jsonb),mc_private.project_draft_actor() TO mc_continuity_executor;
CREATE TABLE mc_private.development_tasks(task jsonb);
CREATE FUNCTION mc_private.validate_development_task(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $body$
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
END $body$;
ALTER FUNCTION mc_private.validate_development_task(jsonb) OWNER TO mc_continuity_executor;REVOKE ALL ON FUNCTION mc_private.validate_development_task(jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION mc_private.validate_task_review(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $body$
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
END $body$;
ALTER FUNCTION mc_private.validate_task_review(jsonb) OWNER TO mc_continuity_executor;REVOKE ALL ON FUNCTION mc_private.validate_task_review(jsonb) FROM PUBLIC,anon,authenticated,service_role;
