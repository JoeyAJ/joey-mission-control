# Reviewed engineering integration with dynamic runtime OFF

Canonical baseline: e1a5c88bac4c28b73034d5f1aa6e82ed4af57540
Reviewed source: ef3b26bfcbbe1a3e9a57316b95d17c85ac36ed4b
Authorization: parent independent code GO, runtime OFF only; no live SQL approval.
Local integration branch: codex/mc-runtime-off-integration-20261012

The reviewed source is imported into a tree rooted in the exact canonical baseline. Canonical vercel.json remains Git blob 2ead69a92b6733b70534f6bd255bc8d64c0ac30a, without the review deployment exclusion. The publication commit has ONLY the canonical baseline as parent; no guard/review ancestry enters canonical. The review branch retains its own deploymentEnabled:false.

156 focused regression tests and build pass. Reviewed synthetic real-app/router workflow covers fixed plus two dynamic projects, task RPC/list isolation, report/PR/tests, request changes rev1, saved rev2, exact approval/current-review handoff, retained form and revocation. Existing maintained UI QA passes four cases. Those are synthetic/local qualifications, not actual Owner/Agent or served Preview acceptance.

## Live preflight — readonly, no mutation

At 2026-10-12T23:51:52Z, a single metadata-only SELECT on Supabase scmvedfqwlhkyvljymjj confirms all six existing validator/RPC source fingerprints and restricted owners/ACL/volatility match. Both task/review tables have forced RLS with recorded policies; anon/authenticated/service_role have no direct table read. New grant/backups/helper/read-RPC objects are absent. No Owner/session/task/review/grant rows were read, no migration was applied, no rights were changed.

SQL installation remains HOLD. Live version is PostgreSQL17.0.11. postgres is non-superuser with global INHERIT/BYPASSRLS true; the executor remains NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS. Two executor-to-postgres membership rows exist: grantor postgres (ADMIN false), grantor supabase_admin (ADMIN true), both SET false/INHERIT false. Existing guards require a matching ADMIN row but do not lock the complete two-row fingerprint. The stricter PG16 fixture does not reproduce all live attributes. Do not request/apply installation until this gap is resolved and independently reviewed; stop on subsequent drift.

## Exact proposed live action — NOT AUTHORIZED FOR INSTALLATION

[SQL inventory](MC_DYNAMIC_PROJECT_SQL_INVENTORY_20261012.json) pins all bytes/hashes. Apply scopes pending then runtime-authorization pending; rollback runtime read ports first then scopes. The intended action creates three private tables (validator backup, policy backup, explicit grants), one private allowed-scope predicate, replaces two structural validators and four existing Owner RPCs, modifies two policy WITH CHECK expressions, and creates two authenticated read-only RPCs guarded by existing Owner/AAL2/live session. Temporary executor SET/CREATE is restored; zero project grant rows and no writer RPC are created. Existing data, reports, credentials, auth realm and automatic execution remain unchanged.

Rollback is exact/review-only, preserves original functions/ACL/volatility/policies, never deletes task/review/report rows, and requires an explicit recovery plan when dynamic history exists. It retains RLS and requires valid existing Owner context for history inspection when rows exist. Preparing the scripts is not executing them.

## Release and next dependency

One canonical Git update may produce the normal bounded Preview build. Do not request duplicate deployments during GitHub/Vercel delays. After READY, resolve the fixed alias to the exact deployed SHA, and report actual served/Owner gaps honestly. Production stays unchanged.

The source factory's dynamic runtime activation is FALSE, environment variables cannot turn it on, and disabled routes do not open providers/read credentials. Morning secure registry writer setup, exact SQL approval and individually named project grant/read/report scope must precede any reviewed activation. No actual Agent, real saved-only task, arbitrary private project import, repository creation, live schema/grant mutation or credential issuance occurs in this code release.
