-- Complete offline migration template, NOT APPROVED / NOT APPLIED.
-- Mint the eventual timestamp via `supabase migration new` before installation.
-- MC project scmvedfqwlhkyvljymjj only. Existing Auth helper/ACL are unchanged.
BEGIN;
SET LOCAL statement_timeout='15s';
DO $$ BEGIN
 IF current_user<>'postgres' OR pg_catalog.to_regnamespace('mc_vm_link') IS NOT NULL
  OR pg_catalog.to_regprocedure('mc_private.owner_auth_verification()') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid='mc_private.owner_auth_verification()'::regprocedure AND proowner='postgres'::regrole AND prosecdef AND proconfig=ARRAY['search_path=""'])
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','auth','USAGE')
  OR pg_catalog.has_function_privilege('anon','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_function_privilege('authenticated','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_function_privilege('service_role','mc_private.owner_auth_verification()','EXECUTE')
  OR NOT pg_catalog.has_function_privilege('mc_continuity_executor','mc_private.owner_auth_verification()','EXECUTE')
  OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
  OR pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET')
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole AND grantor='postgres'::regrole AND NOT set_option AND NOT inherit_option)
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='mc_continuity_executor' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit)
 THEN RAISE EXCEPTION 'VM_LINK_INSTALL_PRECONDITION'; END IF;
END; $$;
CREATE SCHEMA mc_vm_link;
REVOKE ALL ON SCHEMA mc_vm_link FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA mc_vm_link TO mc_continuity_executor;
CREATE TABLE mc_vm_link.configuration(
 singleton boolean PRIMARY KEY CHECK(singleton),enabled boolean NOT NULL DEFAULT false,
 next_fence bigint NOT NULL DEFAULT 1 CHECK(next_fence BETWEEN 1 AND 1000000),
 policy_digest text NOT NULL CHECK(policy_digest ~ '^[a-f0-9]{64}$'),
 artifact_digest text NOT NULL CHECK(artifact_digest ~ '^[a-f0-9]{64}$')
);
INSERT INTO mc_vm_link.configuration(singleton,policy_digest,artifact_digest) VALUES(true,'72f8c00bb21e91fe86720678d72b650eada8dc54ef1f3b5d3dca6395bb83c6f9','9bb363726a13bd96341c84b015354daaa454c6265b5bf0d2c5aff6eab1e3d647');
CREATE TABLE mc_vm_link.workers(
 worker_id text PRIMARY KEY CHECK(worker_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 enabled boolean NOT NULL DEFAULT false,revoked boolean NOT NULL DEFAULT false,
 public_key text CHECK(public_key IS NULL OR octet_length(public_key)<=256),
 key_digest text CHECK(key_digest IS NULL OR key_digest ~ '^[a-f0-9]{64}$'),
 pairing_hash text NOT NULL CHECK(pairing_hash ~ '^[a-f0-9]{64}$'),
 pairing_until bigint NOT NULL,paired_at bigint,created_at bigint NOT NULL
);
CREATE UNIQUE INDEX vm_link_one_enabled_worker ON mc_vm_link.workers((true)) WHERE enabled AND NOT revoked;
CREATE TABLE mc_vm_link.jobs(
 job_id text PRIMARY KEY CHECK(job_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 attempt_id text UNIQUE NOT NULL CHECK(attempt_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 worker_id text NOT NULL REFERENCES mc_vm_link.workers(worker_id),
 fence bigint UNIQUE NOT NULL CHECK(fence BETWEEN 1 AND 1000000),
 approval_id text UNIQUE NOT NULL CHECK(approval_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 owner_subject uuid NOT NULL CHECK(owner_subject='6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid),
 owner_session_id uuid NOT NULL,approved_at bigint NOT NULL,claim_before bigint NOT NULL,
 expires_at bigint,lease_until bigint,claimed boolean NOT NULL DEFAULT false,
 spawn_intent boolean NOT NULL DEFAULT false,cancel boolean NOT NULL DEFAULT false,
 terminal boolean NOT NULL DEFAULT false,outcome text CHECK(outcome IN ('COMPLETED','FAILED','CANCELLED','UNKNOWN')),
 task text NOT NULL DEFAULT 'SMOKE_CONNECTION_V1' CHECK(task='SMOKE_CONNECTION_V1'),
 CHECK((terminal AND outcome IS NOT NULL) OR (NOT terminal AND outcome IS NULL))
);
CREATE UNIQUE INDEX vm_link_one_active_job ON mc_vm_link.jobs((true)) WHERE NOT terminal;
CREATE TABLE mc_vm_link.receipts(
 actor_id text NOT NULL,request_id text NOT NULL CHECK(request_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),response jsonb NOT NULL CHECK(octet_length(response::text)<=8192),
 committed_at bigint NOT NULL,PRIMARY KEY(actor_id,request_id)
);
CREATE TABLE mc_vm_link.events(
 job_id text NOT NULL REFERENCES mc_vm_link.jobs(job_id),event_id text NOT NULL CHECK(event_id ~ '^[A-Za-z0-9_-]{1,100}$'),
 seq integer NOT NULL CHECK(seq BETWEEN 1 AND 128),observed_at bigint NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),payload jsonb NOT NULL CHECK(octet_length(payload::text)<=2048),
 PRIMARY KEY(job_id,seq),UNIQUE(job_id,event_id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['configuration','workers','jobs','receipts','events'] LOOP
  EXECUTE format('ALTER TABLE mc_vm_link.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE mc_vm_link.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON mc_vm_link.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT ON mc_vm_link.%I TO mc_continuity_executor',t);
  IF t IN ('configuration','workers','jobs') THEN EXECUTE format('GRANT UPDATE ON mc_vm_link.%I TO mc_continuity_executor',t); END IF;
  EXECUTE format('CREATE POLICY vm_link_executor ON mc_vm_link.%I TO mc_continuity_executor USING(true) WITH CHECK(true)',t);
 END LOOP;
END; $$;

GRANT mc_continuity_executor TO postgres WITH SET TRUE GRANTED BY postgres;
GRANT CREATE ON SCHEMA mc_vm_link,public TO mc_continuity_executor;
SET LOCAL ROLE mc_continuity_executor;
CREATE FUNCTION mc_vm_link.now_ms() RETURNS bigint LANGUAGE sql VOLATILE SET search_path='' AS $$ SELECT floor(extract(epoch FROM pg_catalog.clock_timestamp())*1000)::bigint $$;
CREATE FUNCTION mc_vm_link.hash(v jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(mc_private.canonical_json(v),'UTF8')),'hex') $$;
CREATE FUNCTION mc_vm_link.owner_check() RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a record; BEGIN
 IF session_user IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'VM_LINK_BROWSER_ONLY'; END IF;
 SELECT * INTO STRICT a FROM mc_private.owner_auth_verification();
 IF a.subject IS DISTINCT FROM '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid OR a.aal IS DISTINCT FROM 'aal2'
  OR a.expires_at<=mc_vm_link.now_ms() OR NOT EXISTS(SELECT 1 FROM mc_private.members m WHERE m.subject=a.subject AND m.project_id='NEXAEON' AND m.member_role='OWNER' AND m.active)
 THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='VM_LINK_OWNER_DENIED'; END IF;
 RETURN a.session_id;
END; $$;
CREATE FUNCTION mc_vm_link.safe_payload(p jsonb) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE k text:=p->>'kind'; expected jsonb:=jsonb_build_object('kind',p->'kind','threadId',null,'itemId',null,'itemType',null,'itemStatus',null,'commandExitCode',null,'processExitCode',null,'signal',null,'errorClass',null); BEGIN
 IF jsonb_typeof(p->'kind') IS DISTINCT FROM 'string'
 OR EXISTS(SELECT 1 FROM jsonb_each(p) x WHERE x.value<>'null'::jsonb AND jsonb_typeof(x.value) IS DISTINCT FROM CASE WHEN x.key IN ('commandExitCode','processExitCode') THEN 'number' ELSE 'string' END) THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
 IF NOT coalesce(mc_private.exact_keys(p,ARRAY['kind','threadId','itemId','itemType','itemStatus','commandExitCode','processExitCode','signal','errorClass']),false)
  OR octet_length(p::text)>2048 OR k NOT IN ('session_started','turn_started','item_started','item_updated','item_completed','turn_completed','turn_failed','provider_error','transport_open','stdout_eof','process_error','process_exit','cancel_requested')
 THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
 IF k='session_started' THEN
  IF jsonb_typeof(p->'threadId')<>'string' OR p->>'threadId'!~'^[A-Za-z0-9_-]{1,100}$' THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
  expected:=expected||jsonb_build_object('threadId',p->'threadId');
 END IF;
 IF k IN ('item_started','item_updated','item_completed') THEN
  IF jsonb_typeof(p->'itemId')<>'string' OR p->>'itemId'!~'^[A-Za-z0-9_-]{1,100}$'
   OR jsonb_typeof(p->'itemType') IS DISTINCT FROM 'string' OR p->>'itemType' NOT IN ('agent_message','reasoning','command_execution','file_change','mcp_tool_call','web_search','todo_list','error','unknown')
   OR NOT (p->'itemStatus'='null'::jsonb OR p->>'itemStatus' IN ('in_progress','completed','failed'))
   OR (k='item_started' AND p->'itemStatus'<>'null'::jsonb AND p->>'itemStatus'<>'in_progress')
   OR (k='item_completed' AND p->>'itemStatus'='in_progress') THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
  expected:=expected||jsonb_build_object('itemId',p->'itemId','itemType',p->'itemType','itemStatus',p->'itemStatus');
  IF p->'commandExitCode'<>'null'::jsonb THEN
   IF p->>'itemType'<>'command_execution' OR jsonb_typeof(p->'commandExitCode')<>'number' OR p->>'commandExitCode'!~'^[0-9]{1,3}$' OR (p->>'commandExitCode')::int>255 THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
   expected:=expected||jsonb_build_object('commandExitCode',p->'commandExitCode');
  END IF;
 END IF;
 IF k IN ('turn_failed','provider_error') THEN expected:=expected||jsonb_build_object('errorClass','PROVIDER_ERROR'); END IF;
 IF k='process_error' THEN
  IF jsonb_typeof(p->'errorClass') IS DISTINCT FROM 'string' OR p->>'errorClass' NOT IN ('SPAWN_FAILURE','PIPE_FAILURE','UNKNOWN_TRANSPORT_ERROR') THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
  expected:=expected||jsonb_build_object('errorClass',p->'errorClass');
 END IF;
 IF k='process_exit' THEN
  IF p->'signal'='null'::jsonb THEN
   IF jsonb_typeof(p->'processExitCode')<>'number' OR p->>'processExitCode'!~'^[0-9]{1,3}$' OR (p->>'processExitCode')::int>255 THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
  ELSIF p->'processExitCode'<>'null'::jsonb OR p->>'signal' NOT IN ('SIGINT','SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGHUP','SIGQUIT','SIGPIPE','SIGALRM','SIGBUS','SIGFPE','SIGILL','SIGTRAP','SIGXCPU','SIGXFSZ','SIGSYS','SIGUSR1','SIGUSR2') THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
  expected:=expected||jsonb_build_object('processExitCode',p->'processExitCode','signal',p->'signal');
 END IF;
 IF expected IS DISTINCT FROM p THEN RAISE EXCEPTION 'VM_LINK_PAYLOAD'; END IF;
END; $$;

CREATE FUNCTION public.mc_vm_link_owner(request jsonb) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; cfg mc_vm_link.configuration%ROWTYPE; old mc_vm_link.receipts%ROWTYPE;
 j mc_vm_link.jobs%ROWTYPE; now_at bigint; d text; result jsonb; action text:=request->>'action'; id text:=request->>'requestId'; b jsonb:=request->'body'; worker text; jid text; BEGIN
 sid:=mc_vm_link.owner_check();
 IF jsonb_typeof(request->'action') IS DISTINCT FROM 'string' OR jsonb_typeof(request->'requestId') IS DISTINCT FROM 'string' OR jsonb_typeof(b) IS DISTINCT FROM 'object'
 OR EXISTS(SELECT 1 FROM jsonb_each(b) x WHERE (x.key='explicit' AND x.value IS DISTINCT FROM 'true'::jsonb) OR (x.key<>'explicit' AND jsonb_typeof(x.value) IS DISTINCT FROM 'string')) THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
 IF NOT coalesce(mc_private.exact_keys(request,ARRAY['requestId','action','body']),false) OR octet_length(request::text)>2048 OR id!~'^[A-Za-z0-9_-]{1,100}$' OR action NOT IN ('read','activate','approve_pair','approve_retry','cancel','revoke','pause') THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
 SELECT * INTO STRICT cfg FROM mc_vm_link.configuration WHERE singleton FOR UPDATE;
 sid:=mc_vm_link.owner_check(); now_at:=mc_vm_link.now_ms(); d:=mc_vm_link.hash(request);
 SELECT * INTO old FROM mc_vm_link.receipts WHERE actor_id='OWNER' AND request_id=id;
 IF FOUND THEN IF old.digest<>d THEN RAISE EXCEPTION 'VM_LINK_REPLAY_CONFLICT'; END IF; RETURN old.response; END IF;
 IF action='read' THEN
  IF b<>'{}'::jsonb THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
  UPDATE mc_vm_link.jobs SET terminal=true,outcome='UNKNOWN',cancel=true WHERE NOT terminal AND claimed AND least(expires_at,lease_until)<=now_at;
  UPDATE mc_vm_link.jobs SET terminal=true,outcome='CANCELLED',cancel=true WHERE NOT terminal AND NOT claimed AND claim_before<=now_at;
  RETURN jsonb_build_object('enabled',cfg.enabled,'release','0.1.1','policyDigest',cfg.policy_digest,'artifactDigest',cfg.artifact_digest,'worker',
   (SELECT jsonb_build_object('workerId',w.worker_id,'enabled',w.enabled,'revoked',w.revoked,'paired',w.paired_at IS NOT NULL,'keyDigest',w.key_digest) FROM mc_vm_link.workers w ORDER BY w.created_at DESC LIMIT 1),
   'jobs',coalesce((SELECT jsonb_agg(jsonb_build_object('jobId',x.job_id,'attemptId',x.attempt_id,'workerId',x.worker_id,'fence',x.fence,'task',x.task,'claimed',x.claimed,'spawnIntent',x.spawn_intent,'cancel',x.cancel,'terminal',x.terminal,'outcome',x.outcome,'leaseUntil',x.lease_until,'expiresAt',x.expires_at,'events',coalesce((SELECT jsonb_agg(jsonb_build_object('eventId',e.event_id,'seq',e.seq,'observedAt',e.observed_at,'payload',e.payload) ORDER BY e.seq) FROM mc_vm_link.events e WHERE e.job_id=x.job_id),'[]'::jsonb))) FROM (SELECT * FROM mc_vm_link.jobs ORDER BY approved_at DESC LIMIT 16) x),'[]'::jsonb));
 END IF;
 IF (SELECT count(*) FROM mc_vm_link.receipts WHERE actor_id='OWNER')>=128 THEN RAISE EXCEPTION 'VM_LINK_CAPACITY'; END IF;
 IF action='activate' THEN
  IF NOT coalesce(mc_private.exact_keys(b,ARRAY['policyDigest','artifactDigest','explicit']),false) OR b->>'policyDigest'<>cfg.policy_digest OR b->>'artifactDigest'<>cfg.artifact_digest OR b->'explicit'<>'true'::jsonb THEN RAISE EXCEPTION 'VM_LINK_APPROVAL_REQUIRED'; END IF;
  UPDATE mc_vm_link.configuration SET enabled=true WHERE singleton; result:=jsonb_build_object('enabled',true);
 ELSIF action='pause' THEN
  IF b<>'{"explicit":true}'::jsonb THEN RAISE EXCEPTION 'VM_LINK_APPROVAL_REQUIRED'; END IF;
  UPDATE mc_vm_link.configuration SET enabled=false WHERE singleton;
  UPDATE mc_vm_link.workers SET enabled=false,revoked=true;
  UPDATE mc_vm_link.jobs SET cancel=true,terminal=true,outcome=CASE WHEN claimed THEN 'UNKNOWN' ELSE 'CANCELLED' END WHERE NOT terminal;
  result:=jsonb_build_object('enabled',false);
 ELSE
  IF NOT cfg.enabled THEN RAISE EXCEPTION 'VM_LINK_DISABLED'; END IF;
  IF action IN ('approve_pair','approve_retry') THEN
   IF b->'explicit'<>'true'::jsonb OR b->>'policyDigest'<>cfg.policy_digest OR b->>'artifactDigest'<>cfg.artifact_digest THEN RAISE EXCEPTION 'VM_LINK_APPROVAL_REQUIRED'; END IF;
   worker:=b->>'workerId';
   IF worker!~'^[A-Za-z0-9_-]{1,100}$' OR EXISTS(SELECT 1 FROM mc_vm_link.jobs WHERE NOT terminal) OR (SELECT count(*) FROM mc_vm_link.jobs)>=16 THEN RAISE EXCEPTION 'VM_LINK_APPROVAL_CONFLICT'; END IF;
   IF action='approve_pair' THEN
    IF NOT coalesce(mc_private.exact_keys(b,ARRAY['workerId','pairingHash','policyDigest','artifactDigest','explicit']),false) OR b->>'pairingHash'!~'^[a-f0-9]{64}$' OR EXISTS(SELECT 1 FROM mc_vm_link.workers WHERE enabled OR NOT revoked) OR (SELECT count(*) FROM mc_vm_link.workers)>=16 THEN RAISE EXCEPTION 'VM_LINK_PAIRING_CONFLICT'; END IF;
    INSERT INTO mc_vm_link.workers(worker_id,pairing_hash,pairing_until,created_at) VALUES(worker,b->>'pairingHash',now_at+600000,now_at);
   ELSE
    IF NOT coalesce(mc_private.exact_keys(b,ARRAY['workerId','priorJobId','policyDigest','artifactDigest','explicit']),false) THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
    SELECT * INTO j FROM mc_vm_link.jobs WHERE job_id=b->>'priorJobId';
    IF NOT FOUND OR NOT j.terminal OR j.claimed OR j.spawn_intent OR j.outcome<>'CANCELLED' OR j.worker_id<>worker OR NOT EXISTS(SELECT 1 FROM mc_vm_link.workers WHERE worker_id=worker AND enabled AND NOT revoked) THEN RAISE EXCEPTION 'VM_LINK_RETRY_DENIED'; END IF;
   END IF;
   jid:=gen_random_uuid()::text;
   INSERT INTO mc_vm_link.jobs(job_id,attempt_id,worker_id,fence,approval_id,owner_subject,owner_session_id,approved_at,claim_before)
   VALUES(jid,gen_random_uuid()::text,worker,cfg.next_fence,id,'6f0ca2ae-83e0-4684-af12-0b37d08182db',sid,now_at,now_at+900000);
   UPDATE mc_vm_link.configuration SET next_fence=next_fence+1 WHERE singleton;
   result:=jsonb_build_object('jobId',jid,'workerId',worker,'task','SMOKE_CONNECTION_V1','pairingUntil',now_at+600000,'policyDigest',cfg.policy_digest,'artifactDigest',cfg.artifact_digest);
  ELSIF action='cancel' THEN
   IF NOT coalesce(mc_private.exact_keys(b,ARRAY['jobId','explicit']),false) OR b->'explicit'<>'true'::jsonb THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
   UPDATE mc_vm_link.jobs SET cancel=true,terminal=NOT claimed,outcome=CASE WHEN claimed THEN null ELSE 'CANCELLED' END WHERE job_id=b->>'jobId' AND NOT terminal;
   IF NOT FOUND THEN RAISE EXCEPTION 'VM_LINK_JOB_NOT_ACTIVE'; END IF; result:=jsonb_build_object('cancelRequested',true,'providerCancellationConfirmed',false);
  ELSIF action='revoke' THEN
   IF NOT coalesce(mc_private.exact_keys(b,ARRAY['workerId','explicit']),false) OR b->'explicit'<>'true'::jsonb THEN RAISE EXCEPTION 'VM_LINK_OWNER_REQUEST'; END IF;
   UPDATE mc_vm_link.workers SET enabled=false,revoked=true WHERE worker_id=b->>'workerId';
   IF NOT FOUND THEN RAISE EXCEPTION 'VM_LINK_WORKER_NOT_FOUND'; END IF;
   UPDATE mc_vm_link.jobs SET cancel=true,terminal=true,outcome=CASE WHEN claimed THEN 'UNKNOWN' ELSE 'CANCELLED' END WHERE worker_id=b->>'workerId' AND NOT terminal;
   result:=jsonb_build_object('revoked',true,'providerCancellationConfirmed',false);
  END IF;
 END IF;
 sid:=mc_vm_link.owner_check();
 INSERT INTO mc_vm_link.receipts VALUES('OWNER',id,d,result,now_at); RETURN result;
END; $$;

CREATE FUNCTION public.mc_vm_link_worker(request jsonb) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE cfg mc_vm_link.configuration%ROWTYPE; w mc_vm_link.workers%ROWTYPE; j mc_vm_link.jobs%ROWTYPE; prior mc_vm_link.receipts%ROWTYPE; old mc_vm_link.events%ROWTYPE;
 action text:=request->>'action'; worker text:=request->>'workerId'; rid text:=request->>'requestId'; b jsonb:=request->'body'; now_at bigint; d text; result jsonb; e jsonb; n integer; last_payload jsonb; BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='VM_LINK_SERVER_ONLY'; END IF;
 IF jsonb_typeof(request->'workerId') IS DISTINCT FROM 'string' OR jsonb_typeof(request->'requestId') IS DISTINCT FROM 'string' OR jsonb_typeof(request->'action') IS DISTINCT FROM 'string' OR jsonb_typeof(b) IS DISTINCT FROM 'object'
 OR EXISTS(SELECT 1 FROM jsonb_each(b) x WHERE (x.key='fence' AND jsonb_typeof(x.value) IS DISTINCT FROM 'number') OR (x.key='events' AND jsonb_typeof(x.value) IS DISTINCT FROM 'array') OR (x.key NOT IN ('fence','events') AND jsonb_typeof(x.value) IS DISTINCT FROM 'string')) THEN RAISE EXCEPTION 'VM_LINK_WORKER_REQUEST'; END IF;
 IF NOT coalesce(mc_private.exact_keys(request,ARRAY['workerId','requestId','action','body']),false) OR worker!~'^[A-Za-z0-9_-]{1,100}$' OR rid!~'^[A-Za-z0-9_-]{1,100}$' OR octet_length(request::text)>48000 OR action NOT IN ('bootstrap','lookup','pair','identity','claim','spawn_intent','control','events','finish') THEN RAISE EXCEPTION 'VM_LINK_WORKER_REQUEST'; END IF;
 SELECT * INTO STRICT cfg FROM mc_vm_link.configuration WHERE singleton FOR UPDATE;
 IF NOT cfg.enabled THEN RAISE EXCEPTION 'VM_LINK_DISABLED'; END IF;
 now_at:=mc_vm_link.now_ms(); SELECT * INTO w FROM mc_vm_link.workers WHERE worker_id=worker FOR UPDATE;
 IF NOT FOUND OR w.revoked THEN RAISE EXCEPTION 'VM_LINK_WORKER_DENIED'; END IF;
 IF action='lookup' THEN IF b<>'{}'::jsonb OR NOT w.enabled OR w.public_key IS NULL THEN RAISE EXCEPTION 'VM_LINK_WORKER_DENIED'; END IF; RETURN jsonb_build_object('publicKey',w.public_key); END IF;
 d:=mc_vm_link.hash(request); SELECT * INTO prior FROM mc_vm_link.receipts WHERE actor_id=worker AND request_id=rid;
 IF FOUND THEN IF prior.digest<>d THEN RAISE EXCEPTION 'VM_LINK_REPLAY_CONFLICT'; END IF; IF action='bootstrap' AND (w.paired_at IS NOT NULL OR w.pairing_until<=now_at) THEN RAISE EXCEPTION 'VM_LINK_PAIRING_DENIED'; END IF; RETURN prior.response; END IF;
 IF (SELECT count(*) FROM mc_vm_link.receipts WHERE actor_id=worker)>=256 THEN RAISE EXCEPTION 'VM_LINK_CAPACITY'; END IF;
 IF action='bootstrap' THEN
  IF NOT coalesce(mc_private.exact_keys(b,ARRAY['pairingHash']),false) OR w.paired_at IS NOT NULL OR w.pairing_until<=now_at OR b->>'pairingHash'<>w.pairing_hash THEN RAISE EXCEPTION 'VM_LINK_PAIRING_DENIED'; END IF;
  result:=jsonb_build_object('authorized',true,'artifactDigest',cfg.artifact_digest,'policyDigest',cfg.policy_digest);
  INSERT INTO mc_vm_link.receipts VALUES(worker,rid,d,result,now_at); RETURN result;
 END IF;
 d:=mc_vm_link.hash(request); SELECT * INTO prior FROM mc_vm_link.receipts WHERE actor_id=worker AND request_id=rid;
 IF FOUND THEN IF prior.digest<>d THEN RAISE EXCEPTION 'VM_LINK_REPLAY_CONFLICT'; END IF; IF action='bootstrap' AND (w.paired_at IS NOT NULL OR w.pairing_until<=now_at) THEN RAISE EXCEPTION 'VM_LINK_PAIRING_DENIED'; END IF; RETURN prior.response; END IF;
 IF (SELECT count(*) FROM mc_vm_link.receipts WHERE actor_id=worker)>=256 THEN RAISE EXCEPTION 'VM_LINK_CAPACITY'; END IF;
 IF action='pair' THEN
  IF NOT coalesce(mc_private.exact_keys(b,ARRAY['pairingHash','publicKey','keyDigest']),false) OR w.paired_at IS NOT NULL OR w.pairing_until<=now_at OR b->>'pairingHash'<>w.pairing_hash OR octet_length(b->>'publicKey')>256 OR b->>'keyDigest'!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'VM_LINK_PAIRING_DENIED'; END IF;
  UPDATE mc_vm_link.workers SET public_key=b->>'publicKey',key_digest=b->>'keyDigest',paired_at=now_at,enabled=true WHERE worker_id=worker;
  result:=jsonb_build_object('paired',true,'workerId',worker,'keyDigest',b->>'keyDigest','policyDigest',cfg.policy_digest,'artifactDigest',cfg.artifact_digest);
 ELSE
  IF NOT w.enabled OR w.public_key IS NULL THEN RAISE EXCEPTION 'VM_LINK_WORKER_DENIED'; END IF;
  IF action='identity' THEN
   IF b<>'{}'::jsonb THEN RAISE EXCEPTION 'VM_LINK_WORKER_REQUEST'; END IF;
   RETURN jsonb_build_object('paired',true,'workerId',worker,'keyDigest',w.key_digest,'policyDigest',cfg.policy_digest,'artifactDigest',cfg.artifact_digest);
  ELSIF action='claim' THEN
   IF b<>'{}'::jsonb THEN RAISE EXCEPTION 'VM_LINK_WORKER_REQUEST'; END IF;
   SELECT * INTO j FROM mc_vm_link.jobs WHERE worker_id=worker AND NOT terminal AND NOT claimed FOR UPDATE;
   IF NOT FOUND OR j.claim_before<=now_at THEN result:=jsonb_build_object('job',null);
   ELSE
    UPDATE mc_vm_link.jobs SET claimed=true,expires_at=now_at+60000,lease_until=now_at+15000 WHERE job_id=j.job_id;
    result:=jsonb_build_object('job',jsonb_build_object('jobId',j.job_id,'attemptId',j.attempt_id,'workerId',worker,'fence',j.fence,'task',j.task,'expiresAt',now_at+60000,'leaseUntil',now_at+15000));
   END IF;
  ELSE
   SELECT * INTO j FROM mc_vm_link.jobs WHERE job_id=b->>'jobId' FOR UPDATE;
   IF NOT FOUND OR NOT j.claimed OR j.worker_id<>worker OR j.attempt_id IS DISTINCT FROM b->>'attemptId' OR b->'fence' IS DISTINCT FROM to_jsonb(j.fence) THEN RAISE EXCEPTION 'VM_LINK_FENCE_DENIED'; END IF;
   IF action IN ('control','spawn_intent') THEN
    IF NOT coalesce(mc_private.exact_keys(b,ARRAY['jobId','attemptId','fence']),false) THEN RAISE EXCEPTION 'VM_LINK_WORKER_REQUEST'; END IF;
    IF action='spawn_intent' THEN
     IF j.terminal OR j.cancel OR j.spawn_intent OR least(j.lease_until,j.expires_at)<=now_at THEN RAISE EXCEPTION 'VM_LINK_SPAWN_DENIED'; END IF;
     UPDATE mc_vm_link.jobs SET spawn_intent=true WHERE job_id=j.job_id;
     result:=jsonb_build_object('authorized',true,'leaseUntil',j.lease_until,'expiresAt',j.expires_at);
    ELSE
     IF NOT j.terminal AND NOT j.cancel AND least(j.lease_until,j.expires_at)>now_at THEN
      UPDATE mc_vm_link.jobs SET lease_until=least(now_at+15000,expires_at) WHERE job_id=j.job_id RETURNING lease_until INTO j.lease_until;
     END IF;
     result:=jsonb_build_object('cancel',j.cancel OR j.terminal OR least(j.lease_until,j.expires_at)<=now_at,'leaseUntil',j.lease_until);
    END IF;
   ELSIF action='events' THEN
    IF NOT coalesce(mc_private.exact_keys(b,ARRAY['jobId','attemptId','fence','events']),false) OR jsonb_typeof(b->'events')<>'array' OR jsonb_array_length(b->'events') NOT BETWEEN 1 AND 16 OR NOT j.spawn_intent THEN RAISE EXCEPTION 'VM_LINK_EVENTS'; END IF;
    SELECT coalesce(max(seq),0) INTO n FROM mc_vm_link.events WHERE job_id=j.job_id;
    FOR e IN SELECT value FROM jsonb_array_elements(b->'events') LOOP
     IF NOT coalesce(mc_private.exact_keys(e,ARRAY['eventId','seq','observedAt','payload']),false) OR jsonb_typeof(e->'eventId') IS DISTINCT FROM 'string' OR e->>'eventId'!~'^[A-Za-z0-9_-]{1,100}$' OR jsonb_typeof(e->'seq')<>'number' OR e->>'seq'!~'^[0-9]{1,3}$' OR jsonb_typeof(e->'observedAt')<>'number' OR e->>'observedAt'!~'^[0-9]{1,16}$' OR (e->>'observedAt')::numeric>9007199254740991 THEN RAISE EXCEPTION 'VM_LINK_EVENTS'; END IF;
     PERFORM mc_vm_link.safe_payload(e->'payload');
     SELECT * INTO old FROM mc_vm_link.events WHERE job_id=j.job_id AND (seq=(e->>'seq')::int OR event_id=e->>'eventId');
     IF FOUND THEN IF old.digest<>mc_vm_link.hash(e) THEN RAISE EXCEPTION 'VM_LINK_EVENT_REPLAY_CONFLICT'; END IF;
     ELSE
      IF j.terminal OR n>=128 OR (e->>'seq')::int<>n+1 OR (e->>'observedAt')::bigint>now_at+30000 OR (e->>'observedAt')::bigint<j.approved_at-1000 THEN RAISE EXCEPTION 'VM_LINK_EVENT_ORDER'; END IF;
      n:=n+1; INSERT INTO mc_vm_link.events VALUES(j.job_id,e->>'eventId',n,(e->>'observedAt')::bigint,mc_vm_link.hash(e),e->'payload');
     END IF;
    END LOOP;
    result:=jsonb_build_object('acceptedThrough',n);
   ELSIF action='finish' THEN
    IF NOT coalesce(mc_private.exact_keys(b,ARRAY['jobId','attemptId','fence','outcome']),false) OR b->>'outcome' NOT IN ('COMPLETED','FAILED','CANCELLED','UNKNOWN') OR (j.terminal AND j.outcome IS DISTINCT FROM b->>'outcome') THEN RAISE EXCEPTION 'VM_LINK_FINISH'; END IF;
    IF NOT j.terminal AND least(j.lease_until,j.expires_at)<=now_at AND b->>'outcome' NOT IN ('UNKNOWN','CANCELLED') THEN RAISE EXCEPTION 'VM_LINK_EXPIRED_FINISH'; END IF;
    IF NOT j.terminal AND b->>'outcome'='COMPLETED' THEN
     SELECT payload INTO last_payload FROM mc_vm_link.events WHERE job_id=j.job_id ORDER BY seq DESC LIMIT 1;
     IF j.cancel OR NOT j.spawn_intent OR last_payload->>'kind' IS DISTINCT FROM 'process_exit' OR last_payload->'processExitCode' IS DISTINCT FROM '0'::jsonb OR last_payload->'signal' IS DISTINCT FROM 'null'::jsonb OR NOT EXISTS(SELECT 1 FROM mc_vm_link.events WHERE job_id=j.job_id AND payload->>'kind'='turn_completed') OR EXISTS(SELECT 1 FROM mc_vm_link.events WHERE job_id=j.job_id AND (payload->>'kind' IN ('turn_failed','provider_error','process_error','cancel_requested') OR payload->>'itemType' IN ('command_execution','file_change','mcp_tool_call','web_search'))) THEN RAISE EXCEPTION 'VM_LINK_COMPLETION_EVIDENCE'; END IF;
    END IF;
    UPDATE mc_vm_link.jobs SET terminal=true,outcome=b->>'outcome' WHERE job_id=j.job_id;
    result:=jsonb_build_object('terminal',true,'outcome',b->>'outcome');
   END IF;
  END IF;
 END IF;
 INSERT INTO mc_vm_link.receipts VALUES(worker,rid,d,result,now_at); RETURN result;
END; $$;

-- Function grants are set by the existing executor, then temporary privileges restored.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mc_vm_link FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.mc_vm_link_owner(jsonb),public.mc_vm_link_worker(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mc_vm_link_owner(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mc_vm_link_worker(jsonb) TO service_role;
RESET ROLE;
REVOKE CREATE ON SCHEMA mc_vm_link,public FROM mc_continuity_executor;
GRANT mc_continuity_executor TO postgres WITH SET FALSE GRANTED BY postgres;
DO $$ BEGIN
 IF pg_catalog.pg_has_role('postgres','mc_continuity_executor','SET')
 OR pg_catalog.has_schema_privilege('mc_continuity_executor','public','CREATE')
 OR pg_catalog.has_schema_privilege('mc_continuity_executor','mc_vm_link','CREATE')
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE roleid='mc_continuity_executor'::regrole AND member='postgres'::regrole AND (set_option OR inherit_option))
 THEN RAISE EXCEPTION 'VM_LINK_ACL_DRIFT'; END IF;
END; $$;
COMMIT;
