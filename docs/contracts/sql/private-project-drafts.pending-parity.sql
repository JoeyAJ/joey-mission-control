-- REVIEW ONLY: do not execute before separately approved isolated/provider testing.
-- Applies no migration and mutates no table. Requires the reviewed validator installed.
-- Fixture source: tests/fixtures/project-draft-url-parity.json.
DO $parity$
DECLARE fixture jsonb;d jsonb;actual boolean;
BEGIN
 FOR fixture IN SELECT * FROM jsonb_array_elements($fixtures$[
 {"url":"","valid":true},
 {"url":"https://example.com/","valid":true},
 {"url":"https://example.com:8443/a%20b","valid":true},
 {"url":"https://xn--bcher-kva.example/path","valid":true},
 {"url":"https://example.com/a%2fb","valid":true},
 {"url":"https://Example.COM","valid":false},
 {"url":"https://Example.COM/","valid":false},
 {"url":"https://example.com","valid":false},
 {"url":"https://example.com:443/","valid":false},
 {"url":"https://example.com:08443/","valid":false},
 {"url":"https://example.com:65536/","valid":false},
 {"url":"https://example.com/a/../b","valid":false},
 {"url":"https://example.com/%2e%2E/a","valid":false},
 {"url":"https://example.com/a b","valid":false},
 {"url":"https://example.com/%invalid","valid":false},
 {"url":"https://127.0.0.1/","valid":false},
 {"url":"https://[::1]/","valid":false},
 {"url":"https://user:password@example.com/","valid":false},
 {"url":"https://example.com/?q=x","valid":false},
 {"url":"https://example.com/#private","valid":false},
 {"url":"http://example.com/","valid":false}
]
$fixtures$::jsonb) LOOP
  d:=jsonb_build_object('schemaVersion','mc.project-draft.v1','draftId','draft_000000000000000000000001','revision',1,'createdAt','2026-10-11T07:00:00.000Z','updatedAt','2026-10-11T07:00:00.000Z','project',jsonb_build_object('projectId','SYNTHETIC_PARITY','name','Synthetic parity','idea','Synthetic PRD','acceptance','','repositoryId','Synthetic/unknown','branch','main','environment','CODE_ONLY','deployment','REQUIRED','previewUrl',fixture->>'url'));
  actual:=mc_private.validate_project_draft(d);
  IF actual IS DISTINCT FROM (fixture->>'valid')::boolean THEN RAISE EXCEPTION 'DRAFT_URL_PARITY_FAILED: %',fixture->>'url'; END IF;
 END LOOP;
END $parity$;
