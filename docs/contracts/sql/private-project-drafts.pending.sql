-- REVIEW ONLY. NOT APPLIED. Target: Supabase scmvedfqwlhkyvljymjj.
-- Requires separate explicit approval of this exact migration and its ACL changes.
-- Reuses existing exact Owner/AAL2/live-session verifier and NEXAEON membership.
-- No service-role client, key, bucket, paid resource, existing data or auth changes.
BEGIN;
DO $preconditions$
BEGIN
 IF to_regclass('mc_private.project_drafts') IS NOT NULL
  OR to_regprocedure('public.mc_owner_project_draft_list()') IS NOT NULL
  OR to_regprocedure('public.mc_owner_project_draft_save(jsonb,bigint)') IS NOT NULL
  OR to_regprocedure('mc_private.project_draft_actor()') IS NOT NULL
  OR to_regprocedure('mc_private.validate_project_draft(jsonb)') IS NOT NULL THEN
  RAISE EXCEPTION 'NEW_OBJECTS_MUST_BE_ABSENT';
 END IF;
 IF to_regprocedure('mc_private.owner_auth_verification()') IS NULL
  OR to_regprocedure('mc_private.canonical_json(jsonb)') IS NULL
  OR to_regprocedure('mc_private.exact_keys(jsonb,text[])') IS NULL THEN
  RAISE EXCEPTION 'EXISTING_VERIFIED_HELPERS_REQUIRED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mc_continuity_executor'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
  OR has_schema_privilege('mc_continuity_executor','mc_private','CREATE')
  OR has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
   JOIN pg_roles u ON u.oid=m.member WHERE r.rolname='mc_continuity_executor'
   AND u.rolname='postgres' AND NOT m.set_option) THEN
  RAISE EXCEPTION 'EXISTING_RESTRICTED_EXECUTOR_REQUIRED';
 END IF;
 IF NOT has_function_privilege('mc_continuity_executor','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('authenticated','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('anon','mc_private.owner_auth_verification()','EXECUTE')
  OR has_function_privilege('service_role','mc_private.owner_auth_verification()','EXECUTE') THEN
  RAISE EXCEPTION 'EXISTING_HELPER_ACL_REQUIRED';
 END IF;
END $preconditions$;
-- Same existing migration protocol. These temporary grants are restored before COMMIT.
GRANT mc_continuity_executor TO postgres WITH SET TRUE;
GRANT CREATE ON SCHEMA mc_private,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;

CREATE FUNCTION mc_private.project_draft_actor() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE a record;
BEGIN
 SELECT * INTO a FROM mc_private.owner_auth_verification();
 IF a.subject IS DISTINCT FROM '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid
  OR a.aal IS DISTINCT FROM 'aal2' OR a.session_id IS NULL
  OR a.expires_at IS NULL OR a.expires_at<=extract(epoch FROM clock_timestamp())*1000
  OR NOT EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=a.subject
   AND m.project_id='NEXAEON' AND m.member_role='OWNER' AND m.active) THEN
  RAISE EXCEPTION 'OWNER_AUTHORIZATION_DENIED' USING ERRCODE='42501';
 END IF;
 RETURN a.subject;
END $body$;
REVOKE ALL ON FUNCTION mc_private.project_draft_actor() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION mc_private.validate_project_draft(d jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $body$
DECLARE p jsonb;k text;v text;lim integer;urlparts text[];
BEGIN
 IF NOT coalesce(mc_private.exact_keys(d,ARRAY['schemaVersion','draftId','revision','createdAt','updatedAt','project']),false)
  OR d->>'schemaVersion' IS DISTINCT FROM 'mc.project-draft.v1'
  OR jsonb_typeof(d->'draftId') IS DISTINCT FROM 'string'
  OR d->>'draftId' !~ '^draft_[a-f0-9]{16,32}$'
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
 p:=d->'project';
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['projectId','name','idea','acceptance','repositoryId','branch','environment','deployment','previewUrl']),false) THEN RETURN false; END IF;
 FOR k IN SELECT unnest(ARRAY['projectId','name','idea','acceptance','repositoryId','branch','environment','deployment','previewUrl']) LOOP
  IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  v:=p->>k;lim:=CASE k WHEN 'idea' THEN 32768 WHEN 'acceptance' THEN 6000 WHEN 'previewUrl' THEN 500 WHEN 'projectId' THEN 64 WHEN 'branch' THEN 120 WHEN 'repositoryId' THEN 160 ELSE 100 END;
  IF char_length(v)+(SELECT count(*) FROM regexp_split_to_table(v,'') AS chars(ch) WHERE octet_length(ch)=4)>lim OR v<>btrim(v,U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
   OR v~'[[:cntrl:]]' AND (k NOT IN ('idea','acceptance') OR regexp_replace(v,E'[\n\r\t]','','g')~'[[:cntrl:]]')
   OR v~*'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|Bearer[[:space:]]+[A-Za-z0-9_.-]{30,}' THEN RETURN false; END IF;
 END LOOP;
 IF p->>'projectId' !~ '^[A-Z][A-Z0-9_]{2,63}$' OR p->>'name'='' OR p->>'idea'=''
  OR p->>'environment' NOT IN ('CODE_ONLY','BACKEND_REQUIRED') OR p->>'deployment' NOT IN ('REQUIRED','NOT_REQUIRED')
  OR p->>'branch' !~ '^[A-Za-z0-9][A-Za-z0-9_./-]*$' OR p->>'branch'~'\.\.|//|/$|\.$|\.lock(/|$)'
  OR p->>'repositoryId'<>'' AND (p->>'repositoryId' !~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9_.-]{1,100}$' OR p->>'repositoryId'~'(/\.{1,2}|\.git)$')
  THEN RETURN false; END IF;
 IF p->>'previewUrl'<>'' THEN
  -- Reject uncanonical raw RPC input. UI creation canonicalizes before saving.
  urlparts:=regexp_match(p->>'previewUrl',$url$^https://((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?[.])+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?)(?::([1-9][0-9]{0,4}))?/([A-Za-z0-9._~!$&'()*+,;=:@/%-]*)$$url$);
  IF urlparts IS NULL OR char_length(urlparts[1])>253
   OR urlparts[2] IS NOT NULL AND (urlparts[2]::integer>65535 OR urlparts[2]::integer=443)
   OR position('%' IN regexp_replace(urlparts[3],'%[a-fA-F0-9]{2}','','g'))>0
   OR urlparts[3]~*'(^|/)([.]|%2e){1,2}(/|$)' THEN RETURN false; END IF;
 END IF;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $body$;
REVOKE ALL ON FUNCTION mc_private.validate_project_draft(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE mc_private.project_drafts(
 owner_subject uuid NOT NULL,
 draft_id text NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 100000),
 draft jsonb NOT NULL CHECK(mc_private.validate_project_draft(draft)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(owner_subject,draft_id),
 CHECK(draft_id=draft->>'draftId' AND revision=(draft->>'revision')::bigint)
);
REVOKE ALL ON TABLE mc_private.project_drafts FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE mc_private.project_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mc_private.project_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_drafts ON mc_private.project_drafts TO mc_continuity_executor
 USING(owner_subject=mc_private.project_draft_actor())
 WITH CHECK(owner_subject=mc_private.project_draft_actor());

CREATE FUNCTION public.mc_owner_project_draft_list() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;out_value jsonb;
BEGIN
 actor:=mc_private.project_draft_actor();
 SELECT coalesce(jsonb_agg(draft ORDER BY updated_at DESC,draft_id),'[]'::jsonb) INTO out_value
  FROM mc_private.project_drafts WHERE owner_subject=actor;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DRAFTS','drafts',out_value);
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_project_draft_list() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_project_draft_list() TO authenticated;

CREATE FUNCTION public.mc_owner_project_draft_save(draft jsonb,expected_revision bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE actor uuid;old mc_private.project_drafts%ROWTYPE;id text;
BEGIN
 actor:=mc_private.project_draft_actor();
 IF expected_revision IS NULL OR expected_revision<0 OR expected_revision>=100000
  OR NOT mc_private.validate_project_draft(draft) OR (draft->>'revision')::bigint<>expected_revision+1 THEN
  RAISE EXCEPTION 'DRAFT_INVALID' USING ERRCODE='22023';
 END IF;
 id:=draft->>'draftId';
 PERFORM pg_advisory_xact_lock(hashtextextended('mc.project_drafts:'||actor::text,0));
 SELECT * INTO old FROM mc_private.project_drafts d WHERE d.owner_subject=actor AND d.draft_id=id FOR UPDATE;
 IF FOUND THEN
  -- Idempotent replay after a committed write whose response was lost.
  -- Only the exact same complete validated JSON payload and next revision qualify.
  IF old.revision=expected_revision+1 AND old.draft=$1 THEN
   PERFORM mc_private.project_draft_actor();
   RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DRAFT_SAVED','draft',old.draft);
  END IF;
  IF old.revision<>expected_revision OR draft->>'createdAt'<>old.draft->>'createdAt'
   OR (draft->>'updatedAt')::timestamptz<(old.draft->>'updatedAt')::timestamptz THEN
   RAISE EXCEPTION 'DRAFT_REVISION_CONFLICT' USING ERRCODE='40001';
  END IF;
  UPDATE mc_private.project_drafts d SET draft=$1,revision=expected_revision+1,updated_at=clock_timestamp()
   WHERE d.owner_subject=actor AND d.draft_id=id;
 ELSE
  IF expected_revision<>0 THEN RAISE EXCEPTION 'DRAFT_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF (SELECT count(*) FROM mc_private.project_drafts WHERE owner_subject=actor)>=12 THEN RAISE EXCEPTION 'DRAFT_CAPACITY'; END IF;
  INSERT INTO mc_private.project_drafts(owner_subject,draft_id,revision,draft) VALUES(actor,id,1,$1);
 END IF;
 PERFORM mc_private.project_draft_actor();
 RETURN jsonb_build_object('schemaVersion',1,'qualification','OWNER_PRIVATE_DRAFT_SAVED','draft',$1);
END $body$;
REVOKE ALL ON FUNCTION public.mc_owner_project_draft_save(jsonb,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_owner_project_draft_save(jsonb,bigint) TO authenticated;

RESET ROLE;
REVOKE CREATE ON SCHEMA mc_private,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE;
COMMIT;

-- Separate approved rollback transaction: drop only the two new public RPCs,
-- then mc_private.project_drafts, validate_project_draft(jsonb), project_draft_actor().
-- Do not drop/alter existing auth helpers, members, roles, contexts, reports or grants.
