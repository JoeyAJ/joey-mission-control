# Durable private registration activation decision

Status: decision-ready proposal only. No catalog branch, credential, permission,
database object, live write or deployment was created by this investigation.
Receipt-validation repair: `15710035a6baf145bc72232ee4837bb265b2a82c`.

## Decision

Use a **data-only `mc/registry` branch in the existing private
`JoeyAJ/joey-mission-control` repository (numeric ID `1404959099`)** for the new
Owner-private registration catalog. Commit the complete registration and its
idempotency receipt together in one Git commit. Reuse existing Supabase Owner
authentication and saved drafts. No new SQL table, RPC, bucket or paid service is
needed for registration.

This is a proposed new destination, not a discovered existing Git canonical
registry. It is authoritative only for newly imported projects. The existing four
projects retain their existing Mac canonical sources and release snapshot. Do not
copy the full Mac memory tree, silently migrate its authority, or merge this data
branch into an application branch.

## What was actually verified

| Component | Current evidence | Consequence |
|---|---|---|
| Canonical master | `src/config.mjs` defaults to `/Users/joeyaj/JOEY_CANONICAL_MEMORY`; registry/index adapters read that filesystem. That directory is absent from this execution environment. | There is no accessible Mac canonical writer here. |
| Deployed project list | `api/index.mjs` loads `deployment/production-snapshot.json`; GET projects/state comes from that compiled snapshot. | A Git registry write alone will not make a new project appear in the web app. An Owner-private catalog reader and UI consumer are required. |
| Existing MC Git repo | Connected read confirmed private, numeric ID `1404959099`, JoeyAJ account `admin`/`push` permission. Isolated branch pushes succeeded. Root registry/index files are absent from fetched `main` and canonical code branch. Exact `mc/registry` branch search returned no matches. | Reuse this existing private repository, but acknowledge the new data branch and authority explicitly. No repository creation is needed. |
| Latest canonical code branch | Read-only fetch observed `8d0a4ab99d5ac46e72e864e9ceed465418c7356c` on `codex/mc-command-center-checkpoint-20261006`. | The proposal does not write that branch. |
| Existing Supabase | `scmvedfqwlhkyvljymjj`, `joey-mission-control`, `ACTIVE_HEALTHY`. Live table/ACL metadata was read. `project_drafts` exists, with authenticated-only Owner draft list/save RPCs; anon execution is false. No registration table or RPC exists. | Reuse the existing draft and Owner-session ports, not their tables as an untyped registry. |
| Continuity database | Live `members` and `heads` constraints allow only `NEXAEON`, `WOOSONG_BUDDY`, `NAMYOUNG_WEB3D`, `JOEY_ASSET_SYSTEM`. Draft rows require the existing exact draft validator. | A new project is not automatically a database member; do not widen these constraints or hide registry data in drafts/events/finalization rows. |
| Existing Vercel | Project `prj_X67htPw7vkRI2tuf8817vOUCGQOD`, team `team_zpwdbE1o53BqrXSXxPfcKxKV`. Non-decrypted env metadata exposes `MC_GITHUB_READ_TOKEN` on Preview for the canonical code branch. | Deployed code has a read transport. There is no configured registry writer port. The token's actual write entitlement was not inspected or exercised; a variable name is not permission proof. |

The connected development/GitHub tooling is not a credential that the deployed
Vercel function can automatically use. No secret values were decrypted or copied.
Repository search absence is limited to the exact connected searches; it is not a
global claim that Joey has no other memory repository.

## Exact proposed storage destination

Repository: `JoeyAJ/joey-mission-control`, ID `1404959099`.
Ref: `refs/heads/mc/registry` (new; deployments disabled).
Root paths:

```text
PROJECT_REGISTRY_V1.0.md
MEMORY_INDEX.md
PROJECTS/<validated-projectId>/PROJECT_MEMORY.md
PROJECTS/<validated-projectId>/CURRENT_STATE.md
PROJECTS/<validated-projectId>/NEXT_ACTIONS.md
PROJECTS/<validated-projectId>/ARCHITECTURE.md
PROJECTS/<validated-projectId>/DECISIONS.md
.mission-control/registration-ledger.json
```

The ledger stores the complete validated receipt, Owner/request idempotency key,
request digest and registration source binding. Enforce uniqueness for project ID,
case-insensitive repository full name **and stable numeric repository ID**. Receipt
times are immutable historical registration observations; fresh verification is
reported separately. Ledger bytes and the linked Markdown files are read from one
catalog commit, never from different branch-head observations.

Initialize a data-only tree containing empty valid registry/index/ledger documents
and `vercel.json` with `{"git":{"deploymentEnabled":false}}`. Include that guard in
the initial tree so no intermediate code-copy branch is exposed to deployment.
The branch has no app sources or GitHub Actions workflow. Its guard is immutable to
the registration API; import commits may touch only the eight path classes above.
Verify the deployment skip before enabling runtime writes. This guard does not
change deployment settings on the canonical code branch.

## One atomic commit is sufficient

Prefer GitHub GraphQL `createCommitOnBranch` with:

```json
{
  "branch": {
    "repositoryNameWithOwner": "JoeyAJ/joey-mission-control",
    "refName": "mc/registry"
  },
  "expectedHeadOid": "<fresh catalog commit SHA>",
  "fileChanges": {
    "additions": "<the eight exact generated file contents, base64 encoded>",
    "deletions": []
  },
  "message": {"headline": "Register verified private project <projectId>"}
}
```

This is explanatory JSON, not a submitted API operation. The adapter reads both
existing file digests and the ledger at that expected commit, revalidates the saved
draft and corrected pinned-tree source proof, and rechecks Owner/policy immediately
before committing. `expectedHeadOid` is the durable CAS boundary. A changed head is
a conflict; never overwrite it by force or silently approve changed targets.
One commit publishes registry, index, five memory documents and ledger together.
Do not issue eight independent Contents writes.

After commit, read the actual branch ref and exact returned commit/tree entries and
ledger receipt. Release `REGISTERED_PRIVATE_PROJECT` only after readback agrees.
If the reply is lost, read the ledger under the original Owner/request key; the same
digest is an identical replay, and a different digest is a conflict. No separate
SQL journal is required because the durable effect and replay record share the
same Git commit. A future external deployment/report action would need its own
effect verification; it is outside this registration transaction.

GitHub documents the commit+branch update and expected head in
[createCommitOnBranch](https://docs.github.com/en/graphql/reference/commits#createcommitonbranch)
and [CreateCommitOnBranchInput](https://docs.github.com/en/graphql/reference/commits#createcommitonbranchinput).
If the connected write transport cannot call that mutation, REST tree+commit
creation followed by GraphQL `updateRefs` with exact `beforeOid` and `force:false`
provides the same visibility/CAS boundary; this is an implementation fallback,
not a decision Joey needs to make.

## Minimum security/access change

Keep the existing source-reader credential and Owner authentication unchanged.
Approve a server-only GitHub write binding scoped to **only the existing private MC
repository**, with Contents write, and enforce the exact data branch and path
allowlist in the server adapter. GitHub Contents permission is repository-wide;
the application branch/path restriction is not a native path-scoped token grant.
Use an already-authorized binding if its exact entitlement and runtime availability
are verified; neither was proven by this read-only inspection. Do not widen the
existing five-source reader to write all five repositories, copy a ChatGPT connector
secret into Vercel, or ask Joey to paste credentials into the UI. Credential setup,
if needed, belongs to the approved integration's normal secret management.

For import, initially permit only an exact Owner-selected **already-created private
repository under JoeyAJ**, recorded in the current saved draft and accessible to
the authorized source reader. A per-project confirmation approves metadata/HEAD,
direct Git ancestor-tree reads and the seven fixed document paths on the selected
source branch. Use the repaired tree-mode/path/blob validator; Contents `type:file`
alone is insufficient. No tree is fetched recursively, symlink target is followed,
or undeclared document is read. Unavailable repository access remains an explicit
access error; it is not replaced by a public or stale source.

No SQL/ACL migration is proposed. Reuse the exact Owner AAL2/live-session verifier
through its existing session realm, without claiming membership in a new project.
Keep the catalog and registration endpoint private, same-Origin, no-store, and
invalidate pending responses on logout/revocation/lease expiry. An unconfigured
writer remains inactive, including before any source collection.

## UI action that actually registers

In the existing **新增專案** flow, after confirming the saved cloud draft, add
**接入已建立私人 repo**. It does not create a repository.

1. The Owner chooses the saved draft's exact repository/ref and requests verification
   of those fixed paths. A private verification handler independently returns repo
   ID/private status, current HEAD, document/profile proof and pending environment,
   deployment and report status. Browser-imported receipts confer no authority.
2. Show a concise summary and one button, **確認並登記私人 repo**. Its confirmation
   names the exact source-read target and private MC catalog destination. The server
   derives its request-specific policy from that deliberate Owner confirmation,
   the current saved draft and the approved fixed catalog policy; it re-reads proof
   immediately before the commit. No additional signing secret or pending-job table
   is needed: the browser preview is untrusted and is verified again.
3. `POST /api/private/project-registration` performs the corrected checks, the durable
   Git CAS commit and readback. The receipt includes catalog commit SHA. Registration
   means durable private metadata, not Agent execution, deployment or delivery.
4. `GET /api/private/project-registrations` reads the private catalog at one current
   commit under the same Owner guards. JoeyView combines these Owner-private cards
   with existing project cards; public snapshot/API data stays unchanged. Record
   new source scopes through this private catalog reader rather than inventing
   database membership or silently extending the five-scope capability response.
5. Resolve new projects' entry/context reads from their approved recorded exact
   source profile, and recheck current repository numeric identity/privacy, freshness
   and regular Git entries. Enable source-backed handoff/copy only after current
   verification. Show **已登記 · 待接 Agent 回報** while reporting is unconnected.

This requires a real catalog GET consumer and source-scope lookup. Merely mounting
the candidate POST or setting a success flag would still leave the app on its old
compiled snapshot. Agent report writes, cloud task/database membership, backend
provisioning and Preview/Production publication remain separately scoped; none is
implicitly granted by registration. Source-only continuation can use the actual
repository HANDOFF and bootstrap first mission, with no invented running Agent.

## Bounded implementation and approval handoff

The canonical writer can now implement the durable Git adapter, private catalog
GET, registration POST/readback and the two Owner UI actions against injected Git
fixtures, without activating live storage. Test concurrent head changes, exact
retry/lost response, logout/revocation, private/public isolation, the seven corrected
tree-verified paths and truthful pending report/delivery states. Use a local Git
fixture for a complete eight-file commit+readback test; no external write is needed.

After those concrete pieces pass independent review, parent should present this
single infrastructure approval question (do not ask Joey to choose a database):

> 是否批准 MC 使用既有私人 `JoeyAJ/joey-mission-control` 的新資料分支
> `mc/registry` 保存新專案登記，關閉該分支部署，並為 MC 伺服器啟用僅此 repo
> 的 Contents 寫入連接？伺服器只可更新上述登記／記憶文件與 receipt ledger；
> 每案由你在「確認並登記私人 repo」確認 `JoeyAJ` 下既有私人 repo 的指定分支及
> 七份文件讀取。這次不建立 repo、變更 SQL／ACL、授予 Agent 回報寫入、建立付費
> 服務或發布網站。

This approval is needed for a new persistent cloud authority, a new data branch and
runtime repository-write access. It is not requested merely to continue reversible
local implementation. No live activation was attempted here.

Primary deployment-guard reference:
[Vercel git.deploymentEnabled](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled).
