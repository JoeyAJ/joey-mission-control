// Generates a bounded rollback-only verification of the approved draft RPCs.
// Existing Auth metadata stays inside SQL; no token, identity or session output.
// SQL-admin claims emulate the call context; this is not an Owner HTTP/JWT test.
import fs from 'node:fs/promises';
import {createProjectDraft} from '../src/onboarding/project-draft.mjs';
const output=process.argv[2];if(!output)throw Error('OUTPUT_REQUIRED');
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const fields={projectId:'SYNTHETIC_LIVE_VERIFY',name:'Rollback-only verification',idea:'Synthetic PRD; never retained',acceptance:'Rollback-only',repositoryId:'',branch:'main',environment:'CODE_ONLY',deployment:'NOT_REQUIRED',previewUrl:''};
const draft=createProjectDraft(fields,{draftId:'draft_fffffffffffffffffffffff1',now:Date.parse('2026-10-11T07:00:00.000Z')});
const fixtures=JSON.parse(await fs.readFile('tests/fixtures/project-draft-url-parity.json','utf8')).map(f=>({draft:{...draft,draftId:'draft_fffffffffffffffffffffff2',project:{...draft.project,previewUrl:f.url}},valid:f.valid}));
for(const [patch,valid] of [[{name:'😀'.repeat(50)},true],[{name:'😀'.repeat(51)},false],[{name:'\u00a0Name'},false],[{idea:'Text\u3000'},false],[{idea:'SQL_GENERATED_OVERSIZE_UTF8'},false],[{branch:'a/../b'},false],[{repositoryId:'Synthetic/repo.git'},false]])fixtures.push({draft:{...draft,draftId:'draft_fffffffffffffffffffffff2',project:{...draft.project,...patch}},valid});
const sql=`-- Only the newly approved draft objects are exercised. All test rows ROLLBACK.
-- Qualification: SQL_ADMIN_EMULATED_CLAIMS_WITH_EXISTING_SESSION_METADATA.
-- No Auth mutation, token read, new user/session or actual Owner HTTP request.
BEGIN;
DO $verification$
DECLARE sid uuid;claims jsonb;candidate jsonb;ack jsonb;reply jsonb;row jsonb;role_name text;patch jsonb;before_count integer;i integer;
 d jsonb:=${q(JSON.stringify(draft))}::jsonb;
BEGIN
 SELECT s.id INTO sid FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
 WHERE s.user_id='6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid AND s.aal::text='aal2'
 AND (s.not_after IS NULL OR s.not_after>clock_timestamp()) AND u.is_anonymous IS FALSE
 AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=clock_timestamp())
 AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=s.user_id AND f.status::text='verified' AND f.factor_type::text='totp') LIMIT 1;
 IF sid IS NULL THEN RAISE EXCEPTION 'EXISTING_LIVE_OWNER_AAL2_SESSION_REQUIRED';END IF;
 claims:=jsonb_build_object('sub','6f0ca2ae-83e0-4684-af12-0b37d08182db','session_id',sid,'aal','aal2','role','authenticated','iss','https://scmvedfqwlhkyvljymjj.supabase.co/auth/v1','aud','authenticated','exp',floor(extract(epoch FROM clock_timestamp()))::bigint+600);
 PERFORM set_config('request.jwt.claims',claims::text,true);EXECUTE 'SET LOCAL ROLE authenticated';
 reply:=public.mc_owner_project_draft_list();before_count:=jsonb_array_length(reply->'drafts');
 IF before_count<>0 THEN RAISE EXCEPTION 'FRESH_INSTALL_EMPTY_TABLE_REQUIRED';END IF;
 ack:=public.mc_owner_project_draft_save(d,0);
 IF ack->>'qualification'<>'OWNER_PRIVATE_DRAFT_SAVED' OR ack->'draft'<>d THEN RAISE EXCEPTION 'SAVE_ACK_MISMATCH';END IF;
 IF public.mc_owner_project_draft_save(d,0)<>ack THEN RAISE EXCEPTION 'EXACT_REPLAY_MISMATCH';END IF;
 reply:=public.mc_owner_project_draft_list();IF reply->>'qualification'<>'OWNER_PRIVATE_DRAFTS' OR reply->'drafts'<>jsonb_build_array(d) THEN RAISE EXCEPTION 'READBACK_MISMATCH';END IF;
 candidate:=jsonb_set(d,'{project,idea}','"Changed stale revision"'::jsonb);
 BEGIN PERFORM public.mc_owner_project_draft_save(candidate,0);RAISE EXCEPTION 'STALE_CHANGED_PAYLOAD_ACCEPTED';EXCEPTION WHEN serialization_failure THEN NULL;END;
 candidate:=jsonb_set(jsonb_set(d,'{revision}','2'::jsonb),'{project,idea}','"Second revision"'::jsonb);
 ack:=public.mc_owner_project_draft_save(candidate,1);IF ack->'draft'<>candidate OR public.mc_owner_project_draft_save(candidate,1)<>ack THEN RAISE EXCEPTION 'CAS_OR_REPLAY_MISMATCH';END IF;
 FOR patch IN SELECT value FROM jsonb_array_elements('[{"aal":"aal1"},{"sub":"11111111-1111-4111-8111-111111111111"},{"exp":1},{"session_id":"11111111-1111-4111-8111-111111111111"},{"role":"anon"}]'::jsonb) LOOP
  PERFORM set_config('request.jwt.claims',(claims||patch)::text,true);
  BEGIN PERFORM public.mc_owner_project_draft_list();RAISE EXCEPTION 'INVALID_ACTOR_ACCEPTED';EXCEPTION WHEN invalid_authorization_specification OR insufficient_privilege THEN NULL;END;
 END LOOP;
 PERFORM set_config('request.jwt.claims',claims::text,true);
 FOR row IN SELECT value FROM jsonb_array_elements(${q(JSON.stringify(fixtures))}::jsonb) LOOP
  IF row#>>'{draft,project,idea}'='SQL_GENERATED_OVERSIZE_UTF8' THEN row:=jsonb_set(row,'{draft,project,idea}',to_jsonb(repeat('界',32768)));END IF;
  BEGIN
   PERFORM public.mc_owner_project_draft_save(row->'draft',0);
   RAISE EXCEPTION 'ROLLBACK_VALID_FIXTURE' USING ERRCODE='Z0001';
  EXCEPTION WHEN SQLSTATE 'Z0001' THEN IF NOT (row->>'valid')::boolean THEN RAISE EXCEPTION 'INVALID_FIXTURE_ACCEPTED';END IF;
   WHEN invalid_parameter_value THEN IF (row->>'valid')::boolean THEN RAISE EXCEPTION 'VALID_FIXTURE_REJECTED';END IF;
  END;
 END LOOP;
 BEGIN PERFORM public.mc_owner_project_draft_save(d||'{"owner":"spoofed"}'::jsonb,0);RAISE EXCEPTION 'EXTRA_OWNER_ACCEPTED';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 FOR i IN 1..11 LOOP
  candidate:=jsonb_set(d,'{draftId}',to_jsonb('draft_eeeeeeeeeeeeeeeeeeee'||lpad(to_hex(i),4,'0')));PERFORM public.mc_owner_project_draft_save(candidate,0);
 END LOOP;
 candidate:=jsonb_set(d,'{draftId}','"draft_dddddddddddddddddddddddd"'::jsonb);
 BEGIN PERFORM public.mc_owner_project_draft_save(candidate,0);RAISE EXCEPTION 'CAPACITY_ACCEPTED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'DRAFT_CAPACITY' THEN RAISE;END IF;END;
 IF jsonb_array_length(public.mc_owner_project_draft_list()->'drafts')<>12 THEN RAISE EXCEPTION 'CAPACITY_CHANGED';END IF;
 EXECUTE 'RESET ROLE';
 FOR role_name IN SELECT unnest(ARRAY['anon','authenticated','service_role']) LOOP
  EXECUTE 'SET LOCAL ROLE '||quote_ident(role_name);
  BEGIN PERFORM 1 FROM mc_private.project_drafts;RAISE EXCEPTION 'DIRECT_TABLE_ALLOWED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  BEGIN PERFORM mc_private.project_draft_actor();RAISE EXCEPTION 'PRIVATE_HELPER_ALLOWED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  IF role_name<>'authenticated' THEN
   BEGIN PERFORM public.mc_owner_project_draft_list();RAISE EXCEPTION 'PUBLIC_RPC_ALLOWED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  END IF;
  EXECUTE 'RESET ROLE';
 END LOOP;
END $verification$;
SELECT jsonb_build_object('pass',true,'qualification','SQL_ADMIN_EMULATED_CLAIMS_WITH_EXISTING_SESSION_METADATA','actualOwnerHttp',false,'authMutations',0,'tokensRead',0,'fixtureCases',28,'rollbackOnly',true,'checks',jsonb_build_array('existingLiveOwnerAal2Helper','saveListReadbackCasExactReplay','foreignAal1ExpiredMissingSessionRoleDenied','urlUnicodeUtf16Utf8Parity','capacityTwelve','anonServiceRoleDirectTablePrivateHelperDenied')) AS verification;
ROLLBACK;
`;
await fs.writeFile(output,sql,{mode:0o600});console.log(JSON.stringify({output,bytes:Buffer.byteLength(sql),fixtureCases:fixtures.length}));
