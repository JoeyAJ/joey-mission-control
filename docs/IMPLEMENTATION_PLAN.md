# Mission Control V0.1 Implementation Plan

> **For Hermes:** Execute this plan task-by-task using strict TDD and independent pre-commit review.

**Goal:** Build an independent, local-first Multi-AI Project Control Center that gives Joey one source-backed view of WHERE each project lives, WHAT its verified state is, WHO/which AI workspace last worked on it, and NEXT where work should continue.

**Architecture:** Mission Control is a separate projection and orchestration layer at `/Users/joeyaj/Documents/Codex/Projects/joey-mission-control`. Existing Canonical Memory, Project Registry, per-entity Current State/Next Actions/Decisions, local Handoff history, and live Git observations remain authoritative. Mission Control reads those sources, builds a disposable projection, and stores only local Inbox items, AI/workspace observations, presentation preferences, and promotion proposals. It never silently creates a second authoritative Project State.

**Tech Stack:** Node.js built-ins (`node:http`, `node:fs`, `node:path`, `node:crypto`, `node:url`, `node:child_process` with fixed read-only Git arguments), vanilla HTML/CSS/ES modules, JSON files, `node:test`, no external runtime dependencies, local loopback server only.

---

## Accepted boundaries

- Mission Control is an independent top-level system, not a NexAeon, Namyoung Web3D, Woosong Buddy, or Joey Asset System feature.
- Do not modify application logic in existing repositories.
- Do not modify Joey Asset System Phase 1 characterization.
- Do not deploy V0.1 publicly.
- Do not create a second authoritative Project Registry, Current State, Decision ledger, or Handoff source.
- Canonical Markdown remains authoritative; generated JSON is a disposable, source-referenced projection.
- Local writable data is limited to Inbox records, AI/workspace sessions, local UI preferences, and proposed promotions.
- Promotion of an Idea or confirmed action into official project lifecycle remains Hermes-mediated and requires Canonical Memory updates after Joey’s decision.
- V0.1 never commits, pushes, deploys, migrates databases, resets worktrees, or invokes arbitrary shell commands from the browser.
- User phase vocabulary is exact: `IDEA → DISCOVERY → SPEC → BUILD → TEST → DEPLOY → MAINTAIN`.
- Dashboard status vocabulary is exact: `Active | Paused | Idea | Planned | Completed`.
- A separate derived attention/control state may be shown, but it must not replace or rewrite canonical status or phase.
- `NAMYOUNG_WEB3D`, `JOEY_ASSET_SYSTEM`, and `CASE_001_NAMYOUNG` remain distinct entities.

## Source-of-truth model

| Domain | Authority | Mission Control policy |
|---|---|---|
| Entity discovery and aliases | `MEMORY_INDEX.md` | Parse read-only; retain source path/fingerprint |
| Local Master, repository, branch, production chain | `PROJECT_REGISTRY_V1.0.md` | Parse/read-only; never independently redefine |
| Verified project state | Per-entity `CURRENT_STATE.md` | Project card/detail source |
| Priorities, blockers, proposed next work | Per-entity `NEXT_ACTIONS.md` | Resume candidate; not automatic authorization |
| Durable decisions and phase gates | Per-entity `DECISIONS.md` | Surface and enforce |
| Formal task outcomes | Local `HANDOFF/LATEST.md` and `HANDOFF/HISTORY/` | Read-only source; private mirror is transport only |
| Current repository reality | Fresh fixed read-only Git probes | Observed fact with timestamp; not durable authority |
| AI/model/workspace association | Mission Control local overlay | Writable local observation |
| New ideas and requests | Mission Control local Inbox | Untrusted intake until interpreted/confirmed |
| Generated dashboard data | Disposable projection/cache | Rebuildable; never manually edited |

## Repository and runtime layout

```text
/Users/joeyaj/Documents/Codex/Projects/joey-mission-control/
  package.json
  README.md
  .gitignore
  docs/
    ARCHITECTURE.md
    DATA_SCHEMA.md
    INFORMATION_FLOW.md
    UI_STRUCTURE.md
    IMPLEMENTATION_PLAN.md
  src/
    config.mjs
    canonical/
      markdown.mjs
      index-adapter.mjs
      registry-adapter.mjs
      memory-adapter.mjs
      handoff-adapter.mjs
      fingerprint.mjs
    projection/
      project-projection.mjs
      lifecycle.mjs
      conflict-detector.mjs
      projection-service.mjs
    workspace/
      git-observer.mjs
      session-service.mjs
    inbox/
      inbox-service.mjs
      interpretation.mjs
      promotion-service.mjs
    continue/
      continue-composer.mjs
      policy-guard.mjs
      redaction.mjs
    storage/
      json-store.mjs
    api/
      validation.mjs
      routes.mjs
    server.mjs
    cli.mjs
  public/
    index.html
    app.js
    styles.css
  schemas/
    project-projection.schema.json
    inbox-item.schema.json
    ai-workspace-session.schema.json
    continue-payload.schema.json
    handoff-projection.schema.json
  data/
    .gitkeep
  tests/
    fixtures/
    markdown.test.mjs
    index-adapter.test.mjs
    registry-adapter.test.mjs
    handoff-adapter.test.mjs
    projection.test.mjs
    lifecycle.test.mjs
    git-observer.test.mjs
    json-store.test.mjs
    inbox.test.mjs
    continue.test.mjs
    security.test.mjs
    api.test.mjs
    ui-contract.test.mjs
```

Runtime files default to:

```text
/Users/joeyaj/Library/Application Support/JoeyMissionControl/
  inbox.v1.json
  sessions.v1.json
  overlay.v1.json
  cache/projection.v1.json
```

Tests must override this with temporary directories under the repository or Hermes scratch directory.

---

### Task 1: Freeze architecture and contracts

**Objective:** Create the independent repository, record the accepted authority boundaries, and define implementation contracts before feature code.

**Files:**
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/DATA_SCHEMA.md`
- Create: `docs/INFORMATION_FLOW.md`
- Create: `docs/UI_STRUCTURE.md`
- Create: `docs/IMPLEMENTATION_PLAN.md`
- Create: `package.json`
- Create: `.gitignore`

**Steps:**
1. Create the repository directory and initialize local Git only; do not create a GitHub repository or remote.
2. Copy this implementation plan into `docs/IMPLEMENTATION_PLAN.md`.
3. Document the source-of-truth matrix, local-overlay boundary, phase/status vocabularies, stop conditions, and privacy model.
4. Define npm scripts: `test`, `test:watch`, `validate`, `sync`, `start`, `check`.
5. Verify the docs explicitly separate Namyoung Web3D, Joey Asset System, and Case 001.

**Verification:**
- Search docs for prohibited claims such as Mission Control owning canonical Current State or auto-deploying.
- Confirm no existing application repository changed.

---

### Task 2: Define schemas and validation primitives

**Objective:** Establish versioned contracts for generated projections and local writable records.

**Files:**
- Create: `schemas/project-projection.schema.json`
- Create: `schemas/inbox-item.schema.json`
- Create: `schemas/ai-workspace-session.schema.json`
- Create: `schemas/continue-payload.schema.json`
- Create: `schemas/handoff-projection.schema.json`
- Create: `src/api/validation.mjs`
- Test: `tests/schema.test.mjs`

**TDD cycle:**
1. Write tests that reject missing schema versions, unknown phase/status values, canonical fields without source references, arbitrary properties, unsafe absolute paths where disallowed, and invalid session/Inbox transitions.
2. Run the specific test and confirm expected failures because validation is absent.
3. Add minimal schema files and a small internal validator supporting the used schema subset; do not add a dependency.
4. Run tests and confirm pass.
5. Refactor repeated checks only while green.

**Acceptance:**
- Every projected claim can carry `classification`, source path, source section, SHA-256 fingerprint, `asOf`, verification status, and read timestamp.
- The exact phase and dashboard status vocabularies are enforced.

---

### Task 3: Parse Canonical Memory safely

**Objective:** Resolve entities and source sections from the existing canonical chain without duplicating it.

**Files:**
- Create: `src/canonical/markdown.mjs`
- Create: `src/canonical/fingerprint.mjs`
- Create: `src/canonical/index-adapter.mjs`
- Create: `src/canonical/registry-adapter.mjs`
- Create: `src/canonical/memory-adapter.mjs`
- Test: `tests/markdown.test.mjs`
- Test: `tests/index-adapter.test.mjs`
- Test: `tests/registry-adapter.test.mjs`

**TDD tracer bullets:**
1. Parse YAML-like fenced metadata and named Markdown sections from fixtures.
2. Parse `MEMORY_INDEX.md` table rows into project/system references and preserve linked paths.
3. Parse explicit command aliases and the Case 001 parent relationship.
4. Parse registered chain fields from `PROJECT_REGISTRY_V1.0.md` without treating historical/external entries as canonical-managed projects.
5. Load `CURRENT_STATE.md`, `NEXT_ACTIONS.md`, `PROJECT_MEMORY.md`, `ARCHITECTURE.md`, and `DECISIONS.md` only from resolved canonical directories.
6. Reject path traversal and symlink escape outside `/Users/joeyaj/JOEY_CANONICAL_MEMORY`.

**Acceptance:**
- Finds exactly three canonical production projects, one development system, and the nested Case 001 relationship from current sources.
- Does not maintain a hand-authored duplicate project list.

---

### Task 4: Add Handoff projection

**Objective:** Derive global and per-entity formal task history from local canonical Handoff files.

**Files:**
- Create: `src/canonical/handoff-adapter.mjs`
- Test: `tests/handoff-adapter.test.mjs`

**TDD cycle:**
1. Test extraction of timestamp, entity, task, status, summary, changes, verification, commit, decision required, and next action.
2. Test that `LATEST.md` remains global latest while per-project latest is derived from `HISTORY/`.
3. Test that a report with project-neutral or historical `Hermes → NexAeon Handoff` title is classified by body/entity evidence rather than title alone.
4. Test malformed or ambiguous reports fail closed into a visible conflict rather than being assigned to the wrong project.
5. Implement the adapter and verify pass.

---

### Task 5: Build Project Projection and lifecycle mapping

**Objective:** Generate the Dashboard read model with source-backed WHERE/WHAT/WHO/NEXT fields.

**Files:**
- Create: `src/projection/project-projection.mjs`
- Create: `src/projection/lifecycle.mjs`
- Create: `src/projection/conflict-detector.mjs`
- Create: `src/projection/projection-service.mjs`
- Test: `tests/projection.test.mjs`
- Test: `tests/lifecycle.test.mjs`

**TDD tracer bullets:**
1. Generate required Dashboard fields: Project Name, Status, Current Phase, Version, Last Completed, Current Task, Next Action, Blocker, Last AI, Model, Workspace, Last Updated.
2. Keep user lifecycle phase separate from status and separate again from derived attention state.
3. Map existing canonical projects conservatively with explicit derivation reasons and source links.
4. Enforce phase gates: Asset System Phase 2 blocked; NexAeon privileged canary blocked; Woosong migration/auth changes blocked; Namyoung verified-asset work blocked without source decision.
5. Detect stale or contradictory production/Git claims and mark them `unknown/conflict` rather than selecting a winner.
6. Preserve project/system/case entity types.

**Acceptance:**
- Every visible canonical/derived value has provenance.
- A missing or ambiguous field renders as Unknown, not fabricated content.

---

### Task 6: Implement fixed read-only Git observations

**Objective:** Show actual workspace/repository/branch/commit/path state without browser-controlled shell execution.

**Files:**
- Create: `src/workspace/git-observer.mjs`
- Test: `tests/git-observer.test.mjs`

**TDD cycle:**
1. Test clean repository observation.
2. Test modified/untracked/conflicted classifications.
3. Test branch, upstream, full HEAD, origin, ahead/behind, and observed timestamp.
4. Test missing path, non-Git path, and symlink/realpath mismatch.
5. Test no user input can become an executable command or arbitrary Git argument.
6. Implement using `spawnSync('git', [fixed, args], {cwd, shell:false})` with canonical allowlisted roots only.

**Acceptance:**
- No Git mutation command exists.
- Stored canonical SHA and fresh observed SHA are displayed separately.

---

### Task 7: Implement atomic local overlay storage

**Objective:** Persist Inbox items and AI/workspace sessions without touching canonical files.

**Files:**
- Create: `src/storage/json-store.mjs`
- Create: `src/workspace/session-service.mjs`
- Test: `tests/json-store.test.mjs`
- Test: `tests/session-service.test.mjs`

**TDD cycle:**
1. Test first-run initialization.
2. Test read/write round-trip and schema validation.
3. Test atomic temp-write + rename.
4. Test corrupted JSON recovery without silent data loss.
5. Test path containment and symlink escape rejection.
6. Test session transitions: starting, running, waiting_for_joey, stopped, failed.
7. Implement minimal storage and service.

**Acceptance:**
- Canonical Memory remains byte-unchanged during all local store tests.

---

### Task 8: Implement Mission Control Inbox

**Objective:** Capture natural-language ideas/requests and produce Hermes-readable interpretation proposals without direct execution.

**Files:**
- Create: `src/inbox/inbox-service.mjs`
- Create: `src/inbox/interpretation.mjs`
- Create: `src/inbox/promotion-service.mjs`
- Test: `tests/inbox.test.mjs`

**TDD tracer bullets:**
1. Capture raw text, optional entity hint, created time, type, state, and idempotency key.
2. Support only Request, Decision, Notice, Problem and Needs review, Ready to confirm, In progress, Resolved.
3. Distinguish an uncommitted Idea from a formal project promotion.
4. Reject automatic promotion when Joey has not explicitly decided “要做”.
5. Detect ambiguous “Namyoung” references and require resolution.
6. Detect duplicate submissions by normalized content/idempotency window.
7. Produce a structured interpretation preview containing affected entity, proposed action, expected canonical files, side effects, and approval boundary.
8. Never update Canonical Memory directly in V0.1.

**Acceptance:**
- Joey can add a new idea/request with natural language; Hermes remains the gatekeeper for interpretation and promotion.

---

### Task 9: Implement Resume / Continue composer

**Objective:** Produce a safe bounded context payload so Joey can resume without searching chat history.

**Files:**
- Create: `src/continue/redaction.mjs`
- Create: `src/continue/policy-guard.mjs`
- Create: `src/continue/continue-composer.mjs`
- Test: `tests/continue.test.mjs`
- Test: `tests/security.test.mjs`

**Required payload:**
- Last AI
- Last Completed
- Current Task
- Known Problem or Blocker
- Next Action
- Latest Commit
- Recommended Workspace
- Handoff Context
- Source fingerprints and generated time
- Approval gates and conflicts

**TDD tracer bullets:**
1. Compose payload from canonical state, latest project Handoff, fresh Git observation, and local AI session overlay.
2. Mark stale fingerprints and block blind continuation.
3. Block continuation when branch/commit/path/dirty state differs from stored context until inspected.
4. Redact secrets, authorization headers, private keys, data URLs/photo payloads, and unnecessary personal data.
5. Ensure approval-required actions are displayed but cannot be represented as authorized.
6. Generate a copyable Hermes prompt and a human-readable Continue panel model.

---

### Task 10: Build local API and loopback security

**Objective:** Expose projection, Inbox, Continue, Handoff, and workspace observations to the local UI safely.

**Files:**
- Create: `src/config.mjs`
- Create: `src/api/routes.mjs`
- Create: `src/server.mjs`
- Create: `src/cli.mjs`
- Test: `tests/api.test.mjs`
- Test: `tests/security.test.mjs`

**Endpoints:**
- `GET /api/state`
- `GET /api/projects/:id`
- `GET /api/workspaces`
- `POST /api/workspaces/:id/recheck`
- `GET /api/handoffs`
- `POST /api/inbox`
- `POST /api/inbox/:id/interpret`
- `POST /api/inbox/:id/confirm` (confirmation changes only local proposal state)
- `POST /api/projects/:id/continue`
- `GET /api/health`

**Security TDD:**
1. Bind to `127.0.0.1` only.
2. Reject non-loopback Host headers.
3. Require JSON content type and same-origin token for writes.
4. Apply body-size limits.
5. Escape/encode untrusted text.
6. Reject path traversal, arbitrary paths, arbitrary Git arguments, and command injection.
7. Set CSP, `X-Content-Type-Options`, `Referrer-Policy`, and frame restrictions.

---

### Task 11: Build Dashboard UI shell

**Objective:** Implement the responsive local Mission Control interface.

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`
- Test: `tests/ui-contract.test.mjs`

**UI structure:**
- Persistent desktop rail / compact tablet rail / mobile bottom nav.
- Routes/views: Dashboard, Inbox, Workspaces, Handoffs, Project detail.
- Dashboard filters in exact order: Active, Paused, Idea, Planned, Completed.
- Card and desktop table modes.
- Project cards display all required fields and explicit provenance/freshness.
- Status includes text/icon, not color alone.
- Project phase uses exact lifecycle vocabulary.
- Attention panel shows blockers, stale workspaces, and pending Joey decisions.

**TDD/UI contract checks:**
1. Semantic landmarks, headings, buttons, labels, and live regions exist.
2. Filter ordering and required field labels exist.
3. No Gantt/KPI/time/team/calendar/enterprise-role controls exist.
4. All technical values are selectable/copyable.
5. Reduced-motion CSS and focus-visible styles exist.
6. 360/768/1024/1440 responsive rules exist.

---

### Task 12: Build Continue, Inbox, Handoff, and AI tracking UI flows

**Objective:** Complete the five required V0.1 modules in the browser.

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/ui-contract.test.mjs`
- Test: `tests/api.test.mjs`

**Flows:**
1. Continue panel shows Last AI, last completed, current task, blocker, next action, commit, workspace, and handoff context.
2. Inbox composer saves raw natural language, then displays an interpretation preview; no raw text executes directly.
3. Handoffs view displays per-project latest and history, clearly distinguishing task status from project lifecycle.
4. Workspaces view shows actual path/repository/branch/commit/dirty state/last checked and local AI/model/session information.
5. Project details expose Overview, Context, Workspaces, and Handoffs sections.
6. Ambiguity/conflict/approval states are visible and block unsafe Continue.

---

### Task 13: Seed from current canonical projects and verify real data

**Objective:** Run the real projection against current Canonical Memory and confirm Dashboard accuracy.

**Commands:**
- `npm run sync`
- `npm run validate`
- `npm test`

**Required entities:**
- NexAeon
- Woosong Buddy
- Namyoung Web3D
- Joey Asset System
- Case 001 as nested system case, not an independent top-level project card unless explicitly included in a Cases view
- Mission Control itself after its canonical entry is established

**Verification:**
- Compare displayed Local Master, repository, branch, and full commit with fresh Git output.
- Verify Asset System remains blocked before Phase 2.
- Verify ambiguous Namyoung input is not auto-resolved.
- Verify no existing repository changed.

---

### Task 14: Browser smoke and accessibility verification

**Objective:** Exercise the real local app, not just unit tests.

**Steps:**
1. Start server on a loopback test port.
2. Open Dashboard in a real browser.
3. Verify all five status filters, project cards/table, Continue panel, Inbox submission/interpretation, Workspaces refresh, Handoffs, and project detail.
4. Capture browser console errors.
5. Test viewport widths 360, 768, 1024, and 1440.
6. Verify keyboard navigation and visible focus.
7. Verify a malicious Inbox HTML string renders as text.
8. Stop the test server.

---

### Task 15: Full quality gate and independent review

**Objective:** Prove security, logic, scope, and factual accuracy before committing.

**Commands:**
- `npm test`
- `npm run validate`
- `npm run check`
- secret-pattern scan across repository and generated fixtures
- `git diff --check`

**Independent review:**
- Dispatch a fresh reviewer with the complete diff split by file if needed.
- Fail closed for hardcoded secrets, command injection, path traversal, XSS, canonical-write paths, incorrect authority claims, wrong lifecycle mapping, unsafe Git operations, missing error handling, and scope violations.
- Fix only validated findings, rerun all checks, and repeat review until passed or report blocker.

---

### Task 16: Update Canonical Memory and registry

**Objective:** Register Mission Control as an independent system after implementation is verified.

**Canonical files:**
- Create: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/SYSTEMS/MISSION_CONTROL/PROJECT_MEMORY.md`
- Create: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/SYSTEMS/MISSION_CONTROL/ARCHITECTURE.md`
- Create: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/SYSTEMS/MISSION_CONTROL/DECISIONS.md`
- Create: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/SYSTEMS/MISSION_CONTROL/CURRENT_STATE.md`
- Create: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/SYSTEMS/MISSION_CONTROL/NEXT_ACTIONS.md`
- Modify: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/MEMORY_INDEX.md`
- Modify: `/Users/joeyaj/JOEY_CANONICAL_MEMORY/PROJECT_REGISTRY_V1.0.md`
- Create/replace formal local Handoff `LATEST.md` and timestamped history report.

**Rules:**
- Register it as a system/management layer, not a production application child.
- Record local repo and current commit.
- Do not claim GitHub alignment or production deployment unless actually created and verified.
- Sanitize Handoff content before mirror sync.
- Handoff mirror may be committed/pushed only under its existing repository-specific standing authorization.

---

### Task 17: Create verified local commit

**Objective:** Produce the requested Mission Control V0.1 commit SHA without unapproved remote publication.

**Steps:**
1. Verify exact repository root, branch, staged files, and no unrelated artifacts.
2. Confirm tests/build/check/review all pass.
3. Stage only Mission Control repository files.
4. Commit with a concise verified message, for example:
   `feat: establish Mission Control V0.1`
5. Verify commit file list, local HEAD, and clean working tree.
6. Do not create/push a GitHub repository unless Joey separately authorizes it.
7. Update Canonical Memory/Handoff with the final local commit SHA; sync only the sanitized Handoff mirror under existing authorization.

---

## Final acceptance criteria

Mission Control V0.1 is accepted when Joey can:

1. Open one local Dashboard and view projects by Active, Paused, Idea, Planned, or Completed.
2. See Project Name, Status, Current Phase, Version, Last Completed, Current Task, Next Action, Blocker, Last AI, Model, Workspace, and Last Updated.
3. See actual Local Path, Repository, Branch, Last Commit, Production, Database, and Relevant Docs with source/freshness context.
4. Open Continue and receive a source-backed Resume Context without reading old chat history.
5. Add a natural-language Idea/Project/request to the Inbox without filling a management form.
6. Keep an Idea in Idea/Discussion until Joey explicitly decides to do it.
7. See structured Handoff data across Hermes, ChatGPT, Claude Code, Codex, and other AI workspaces without relying on shared chat memory.
8. Preserve Canonical Memory/Registry/Handoff as the authoritative state chain.
9. Preserve all existing project repositories and Joey Asset System Phase 1 unchanged.
10. Pass full automated tests, browser smoke, security checks, and independent review.
11. Produce a verified local Git commit SHA and concise start instructions.

## Known V0.1 limitations to document

- No public deployment, cloud sync, mobile push, multi-user collaboration, calendar, Gantt, KPI, time tracking, or enterprise permissions.
- No direct AI-provider API orchestration; Hermes remains the operating gatekeeper.
- Inbox interpretation is a Hermes workflow plus deterministic local proposal support, not an autonomous LLM embedded in the web server.
- Canonical state promotion remains a verified Hermes file operation, not a browser write.
- Git observations are snapshots and must be refreshed before consequential work.
- Production/database verification remains project/provider-specific and is not inferred from repository state.
