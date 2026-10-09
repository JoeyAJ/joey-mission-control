# Mission Control product contract

## Current product decision — 2026-10-09

The core delivery is portable project memory and takeover, using each project's canonical repository and handoff. Joey can tell Dots, Cursor, ClaudeCode, Hermes or another development Agent to read that entry and continue. MC does not require choosing an Agent, provider or model, and it does not need to dispatch or execute the receiving Agent.

Each connected project shows its latest verified source version, last development Agent explicitly signed in HANDOFF/completion evidence, completed work, handoff update time, known issues and next steps. Never infer the development Agent from a Git author. Model is optional technical metadata; unknown remains unknown and does not block takeover. Preserve historical run/model/source evidence.

Provide one copyable instruction with canonical repo, branch, HANDOFF and verified background/README/PRD/plan/update-document locations. Resolve branch HEAD before dependent work; read the current stage before history. The receiving Agent uses its own authorized private-repository access, continues the already approved scope, tests the result and updates the handoff with its actual signature and next steps. The entry grants no deployment, SQL, new access or destructive-operation permission. Missing context and unconnected project scopes are shown explicitly.

The earlier runtime/control ambitions below remain historical scope. They do not make model selection or MC dispatch a prerequisite for this core takeover flow.


Mission Control is Joey's Multi-Agent Development OS / control layer, not another product dashboard. Its loop is Joey ↔ Mission Control ↔ Agents ↔ canonical projects, GitHub, deployments and data. Agents can change while project memory and the development chain remain traceable. NexAeon / Dots is the primary operator; Hermes is the backup. This role does not grant execution or external communication authority.

Joey View must answer within 5–10 seconds: where the project stands, who is working, what was confirmed, the next step, blockers, and whether Joey has an explicit decision request. Raw technical records belong in expandable evidence. Facts outrank visual completeness.

Current State requires a fresh execution report. Last Confirmed State requires evidence of a completed result. Git commit events and historical records have their own category; authors and handoff titles are not Agent/model proof. Event time and read time remain separate. Source failure preserves the previous confirmed state with a refresh-failure notice; source conflicts are never silently resolved by choosing the most optimistic or newest file.

Authority is fact-specific: Registry identifies entry points; Git proves commits and branches; completion handoffs/results prove work and operator identity when explicit; live check-ins prove current execution; deployment checks prove deployment state; Joey requests prove decision/approval needs. Plans, prohibitions and blockers alone do not create approval requests. UNKNOWN names missing evidence and the step required to establish it.

Formal project entry: Idea / PoC → Formalize Project → Development Chain Bootstrap (ID, canonical repo, branch rule, deployment, backend if applicable, memory, handoff, Mission Control entry) → Mission #001 → Development. The present version documents this contract; it does not create projects, dispatch agents, add cloud sync or implement universal writeback.

Local authorized records remain local; Production remains read-only. No private paths, tokens or owner payloads are automatically published. Acceptance Fix remains V0.3-C; publication/deployment require the later Joey Acceptance gates.

Every phase must finish with a fresh handoff before the next phase begins. Record project ID, canonical baseline and branch, exact approved scope, actual changes, explicit executed-by and model (or why absent), event time, validation evidence, acceptance state, next action, blockers and submitted decisions. Preserve prior phase history. A Registry reconciliation is a historical confirmed result, not an Agent runtime completion. Machine heartbeat must carry an identity, timestamp, validity window and linked task; a readable repository is not machine-online or Agent-running proof.
