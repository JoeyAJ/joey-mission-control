# Mission Control product contract

Mission Control is Joey's Multi-Agent Development OS / control layer, not another product dashboard. Its loop is Joey ↔ Mission Control ↔ Agents ↔ canonical projects, GitHub, deployments and data. Agents can change while project memory and the development chain remain traceable. NexAeon / Dots is the primary operator; Hermes is the backup. This role does not grant execution or external communication authority.

Joey View must answer within 5–10 seconds: where the project stands, who is working, what was confirmed, the next step, blockers, and whether Joey has an explicit decision request. Raw technical records belong in expandable evidence. Facts outrank visual completeness.

Current State requires a fresh execution report. Last Confirmed State requires evidence of a completed result. Git commit events and historical records have their own category; authors and handoff titles are not Agent/model proof. Event time and read time remain separate. Source failure preserves the previous confirmed state with a refresh-failure notice; source conflicts are never silently resolved by choosing the most optimistic or newest file.

Authority is fact-specific: Registry identifies entry points; Git proves commits and branches; completion handoffs/results prove work and operator identity when explicit; live check-ins prove current execution; deployment checks prove deployment state; Joey requests prove decision/approval needs. Plans, prohibitions and blockers alone do not create approval requests. UNKNOWN names missing evidence and the step required to establish it.

Formal project entry: Idea / PoC → Formalize Project → Development Chain Bootstrap (ID, canonical repo, branch rule, deployment, backend if applicable, memory, handoff, Mission Control entry) → Mission #001 → Development. The present version documents this contract; it does not create projects, dispatch agents, add cloud sync or implement universal writeback.

Local authorized records remain local; Production remains read-only. No private paths, tokens or owner payloads are automatically published. Acceptance Fix remains V0.3-C; publication/deployment require the later Joey Acceptance gates.

Every phase must finish with a fresh handoff before the next phase begins. Record project ID, canonical baseline and branch, exact approved scope, actual changes, explicit executed-by and model (or why absent), event time, validation evidence, acceptance state, next action, blockers and submitted decisions. Preserve prior phase history. A Registry reconciliation is a historical confirmed result, not an Agent runtime completion. Machine heartbeat must carry an identity, timestamp, validity window and linked task; a readable repository is not machine-online or Agent-running proof.
