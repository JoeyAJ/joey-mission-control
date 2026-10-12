# Private project registration candidate

Checkpoint: isolated branch `codex/mc-registry-receipts-20261012`, based on canonical
`cab187ea5208fabe82d47cfe47bdf32cc3d4f0c1`.

This candidate adds an inactive server-side interface for importing an already-created
private repository. It will consume the existing saved project draft, independently
read repository identity, source HEAD and canonical documents, and produce a
revision-checked canonical registry update with its verification receipt.

No repository is created, no external write is activated, and no SQL, ACL, credential,
reporting grant, deployment, or existing five-project read scope is changed.
Repository import and registration are separate from development/report activation
and from verified delivery or Joey acceptance.

The implementation is additive. `project-registration-server.mjs` is an unmounted
server factory; neither the existing read-only onboarding endpoint nor the draft
RPC/storage schema changes. `project-registration-repository.mjs` reuses the existing
bounded GitHub read transport with one explicit repository/ref and seven fixed paths.
There is no credential discovery or new environment variable.

## Proposed interface

The candidate handles `POST` with JSON, exact same Origin, and the existing verified
Owner AAL2 session. Proposed future route: `/api/private/project-registration`.
It is **not mounted** in this candidate. A null policy returns
`503 REGISTRATION_NOT_ACTIVATED` before reading private sources or invoking a writer.

The exact request fields, validated by `registrationRequest`, are:

| Field | Meaning |
|---|---|
| `schemaVersion` | `mc.project-registration.v1` |
| `mode` | `IMPORT_EXISTING_PRIVATE_REPOSITORY`; no creation mode is implemented |
| `requestId` | Bounded ASCII idempotency key, scoped to the verified Owner |
| `draftId`, `draftRevision`, `projectId` | Exact current saved cloud draft, not a browser-supplied draft |
| `repositoryId`, `repositoryNumericId` | Exact owner/name and stable positive GitHub repository ID |
| `ref`, `baselineSha` | Independent source branch and immutable 40-hex Git commit; no reserved `mc/progress` overlap |
| `expectedRegistryDigest`, `expectedIndexDigest` | SHA256 of the current canonical registry and memory index bytes |
| `files` | Exact seven path-to-SHA256 claims; claims are independently re-read and compared |
| `resources` | Exact `{backend, deployment}`; either reference may remain `null` and explicitly pending |

The seven source files are `HANDOFF.md`, `PRD.md`, `README.md`,
`docs/PRODUCT_CHARTER.md`, `docs/PHASE_PLAN.md`, `.mission-control/bootstrap.json`,
and `.mission-control/source-profile.json`. The source profile must contain one
`BASELINE` profile bound to this project/repository/ref, entry `HANDOFF.md`, and the
four context documents in that order. The existing bootstrap manifest must name
the exact repository and draft revision. Save an exact repository target in the
draft before initial import; a previously derived/null target is not proof.

Backend reference shape is `{provider:"supabase", projectRef}`. Deployment reference
shape is `{provider:"vercel", accountId, projectId, environment:"preview", url}`.
These strings do not trigger provider requests or grant permissions. When provided,
an independently configured server resource reader must return a fresh exact-target
`INDEPENDENT_CONFIGURATION_READ` observation bound to the project, repository
numeric identity, branch and baseline. There is no backend/deployment provider
adapter in this candidate. A null reference allows repository registration to
proceed while required setup remains `PENDING_CONFIGURATION`. A verified reference
is `CONFIGURATION_VERIFIED_DELIVERY_UNVERIFIED`; Production URL/SHA stay null.

The server policy is exact JSON with `qualification:
EXACT_PRIVATE_PROJECT_REGISTRATION_POLICY`, `ownerSubject`, bounded `approvalRef`,
future `expiresAt`, and `target`. `target` must exactly match all request fields
except `schemaVersion`, `mode`, and `requestId`. It binds both canonical digests,
every source file hash and each resource reference. The factory copies this policy;
changing a caller's object cannot widen a running server. Existing five-project
read capabilities, imported packets and exported receipts cannot provide this policy.

## Verification and local writer

The server loads the saved draft through the existing Owner draft `list` API,
rejects project/repository collisions with other drafts, and checks Owner/session
and policy validity around awaited reads. It independently checks repository ID,
full name, private visibility, archive/disabled flags, the branch HEAD and seven
pinned files. Both SHA256 content hashes and Git SHA1 blob identities are checked.
The manifest, HANDOFF project and source profile must agree with the saved draft.
Repository identity/privacy and HEAD are read again after document verification
and at the final writer authorization boundary. A complete verification expires
after 30 seconds. No provider diagnostic, file body, credential or live permission
is accepted from the client.

`createLocalProjectRegistryWriter` is an in-memory reference writer, explicitly
qualified `LOCAL_REGISTRY_CANDIDATE_ONLY`. It atomically updates its local registry,
memory index, five canonical memory documents and receipt/idempotency ledger after
the final authorization callback and both revision checks. Existing target memory
and registry entries cannot be overwritten. Identical retries return the original
result; different payloads under the same key conflict. A concurrent revision loses
CAS. Exported/serialized receipts cannot be reimported as writer authority: only
receipts issued by the current verification process are accepted.

The generated registry uses the existing reader's fields. `local_head` represents
the **stored verified baseline**, and `local_master` remains null. A non-main source
branch leaves `github_main_head` null. Production URL and Production source SHA stay
null. No local workspace, Agent session or deployed service is inferred.

The matching `MEMORY_INDEX.md` entry and five documents under `PROJECTS/<id>/`
make the local candidate discoverable by the existing `buildProjection` path.
Their current stage and blockers explicitly retain source/report activation,
backend/deployment setup and acceptance status. Existing index section/table
format is required; an unsupported format returns an actionable error instead of
silently rewriting it. This is a candidate artifact set, not a live MC registration.

Responses keep `liveRegistered:false`, `developmentReady:false`,
`executionAuthorized:false`, `verifiedDelivery:false`, and Joey acceptance pending.
Source/report scopes remain `PENDING_EXPLICIT_ACTIVATION`. Authorization is also
checked before returning a response; a revoked session receives no private receipt.
A lost response may follow a successful local commit, so retries must use the same
idempotency key and original expected digests. The immutable `receipt` retains
its original commit observation time, including on replay. `currentVerification`
separately reports the fresh independent read and expiry; an expired original
receipt is never relabelled as a new registration or a fresh commit receipt.

## Smallest live activation prerequisite

No new SQL or ACL schema is proposed. Before mounting a live route, the canonical
writer needs one explicit, expiring policy for a **named existing private repo**:
project/draft revision, numeric repo identity, canonical branch and current HEAD,
the seven exact document reads and hashes, and registry/index revision digests.
This must authorize only private source reads and the canonical registration write;
it does not include repo creation, report writes, provider provisioning, deployment,
access grants, or arbitrary repository/path collection.
Name the canonical writer's actual private destination separately: writes are
limited to `PROJECT_REGISTRY_V1.0.md`, `MEMORY_INDEX.md`, the five new
`PROJECTS/<projectId>/*.md` files and its private receipt/idempotency ledger. No
canonical repository location is inferred from a source repository name.

Then wire the existing Owner verifier and draft RPC read port, an approved exact
repository reader using existing credential management, and a durable canonical
writer. That adapter must commit registry + index + five new memory files +
receipt/idempotency ledger atomically under CAS, reject existing target files, and
recheck authorization within its write boundary. The current server accepts only
the local writer qualification; enabling a durable writer requires a reviewed,
explicit adapter qualification rather than changing the local writer's label.
Mount the proposed same-Origin private POST only after those ports are approved.
Ongoing MC source reads and Agent report writes require their own exact activation;
the current five-project allowlists and database project membership are unchanged.

## Reproduce and integrate

Run focused tests:

```sh
node --import ./tests/test-environment.mjs --test tests/project-registration.test.mjs
```

Produce a readable synthetic request, response, receipt and complete candidate
artifact set without networking:

```sh
node --import ./tests/test-environment.mjs scripts/verify-project-registration-local.mjs /tmp/mc-registration-review.json
```

The committed review example is
`docs/contracts/repository-reporting/receipts/project-registration-20261012.json`.
It is labelled `SYNTHETIC_LOCAL_VERIFICATION_ONLY`; its repository, Owner, SHA and
read receipts are authored fixtures. It demonstrates import and identical replay,
an inactive default server, all linked canonical artifacts, and pending environment
and deployment status. It proves no live entitlement or registration.

The focused suite verifies actual registry/index readers and complete project
projection, English/Traditional Chinese/Korean names, Owner AAL2/session revocation,
Origin controls, canonical draft conflicts, private identity/HEAD drift, file and
profile mismatches, resource receipt binding, expiry, forged receipt rejection,
concurrent CAS, replay conflicts, duplicate targets and atomic failure. Network
transport is injected; the portability guard reports zero forbidden attempts.
This candidate changes no UI, so new desktop/mobile screenshots are not applicable.
Final validation: **34 focused tests and 1,025 portable tests passed**. The portable
run also rebuilt the bundle, checked all five existing schemas, validated the four
existing projects/case/handoffs/Continue payloads, and passed static safety checks.
All guarded runs reported zero forbidden attempts. No deployment was performed.

Cherry-pick the implementation commit after the checkpoint, or apply the portable
patch from canonical base. Re-run `npm run verify:portable`; keep the factory
unmounted and all live activation prerequisites pending during review.

GitHub REST endpoint behavior was checked against primary documentation:
[repository identity](https://docs.github.com/en/rest/repos/repos#get-a-repository),
[Git reference](https://docs.github.com/en/rest/git/refs#get-a-reference), and
[pinned repository content](https://docs.github.com/en/rest/repos/contents#get-repository-content).
