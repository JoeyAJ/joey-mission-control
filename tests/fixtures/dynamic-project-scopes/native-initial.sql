SET mc_test.owner_active='true';SET ROLE authenticated;
SELECT public.mc_owner_development_task_save('{"schemaVersion": "mc.development-task.v1", "taskId": "task_aaaaaaaaaaaaaaaaaaaaaaaa", "revision": 1, "createdAt": "2026-10-12T22:30:00.000Z", "updatedAt": "2026-10-12T22:30:00.000Z", "projectId": "WOOSONG_BUDDY", "track": "BASELINE", "request": {"feature": "Synthetic native task", "acceptance": "Scope/CAS acceptance", "constraints": "No Agent execution"}}'::jsonb,0);
SELECT public.mc_owner_development_task_save('{"schemaVersion": "mc.development-task.v1", "taskId": "task_bbbbbbbbbbbbbbbbbbbbbbbb", "revision": 1, "createdAt": "2026-10-12T22:30:00.000Z", "updatedAt": "2026-10-12T22:30:00.000Z", "projectId": "AUTHORIZED_FIXTURE", "track": "BASELINE", "request": {"feature": "Synthetic native task", "acceptance": "Scope/CAS acceptance", "constraints": "No Agent execution"}}'::jsonb,0);
SELECT public.mc_owner_development_task_save('{"schemaVersion": "mc.development-task.v1", "taskId": "task_cccccccccccccccccccccccc", "revision": 1, "createdAt": "2026-10-12T22:30:00.000Z", "updatedAt": "2026-10-12T22:30:00.000Z", "projectId": "AUTHORIZED_SECOND", "track": "BASELINE", "request": {"feature": "Synthetic native task", "acceptance": "Scope/CAS acceptance", "constraints": "No Agent execution"}}'::jsonb,0);
DO $$BEGIN IF jsonb_array_length(public.mc_owner_development_task_list()->'tasks')<>3 THEN RAISE EXCEPTION 'MULTI_SCOPE_LIST';END IF;END$$;
RESET ROLE;
SET ROLE mc_continuity_executor;
DO $$DECLARE t jsonb;r jsonb;req jsonb;BEGIN
 SELECT task INTO t FROM mc_private.development_tasks WHERE task_id='task_bbbbbbbbbbbbbbbbbbbbbbbb';
 req:=jsonb_build_object('schemaVersion','mc.task-requirements.v1','revision',1,'requestDigest',encode(sha256(convert_to(mc_private.canonical_json(jsonb_build_object('schemaVersion',t->'schemaVersion','projectId',t->'projectId','track',t->'track','taskId',t->'taskId','revision',t->'revision','request',t->'request')),'UTF8')),'hex'));
 r:=jsonb_build_object('schemaVersion','mc.owner-task-review.v1','projectId','AUTHORIZED_FIXTURE','track','BASELINE','taskId',t->>'taskId','taskRequirements',req,'repositoryId','JoeyAJ/synthetic-fixture','canonicalRef','main','canonicalHeadSha',repeat('a',40),'reportRef','mc/progress','reportPath','.mission-control/runs/native-fixture.json','reportHeadSha',repeat('a',40),'reportBlobId',repeat('a',40),'reportSequence',2,'runId','native-fixture','workRef','feature/fixture','codeSha',repeat('a',40),'decision','REQUEST_CHANGES','comment','Synthetic native opinion');
 PERFORM public.mc_owner_task_review_append(r,'33333333-3333-4333-8333-333333333333'::uuid,0);
 IF jsonb_array_length(public.mc_owner_task_review_list(t->>'taskId',0,50)->'records')<>1 THEN RAISE EXCEPTION 'NATIVE_REVIEW';END IF;
END$$;
RESET ROLE;
