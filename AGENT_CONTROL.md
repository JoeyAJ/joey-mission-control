# Mission Control — Agent entry

Joey's overview: https://joey-mission-control-one.vercel.app/#joey (the only address with Owner sign-in).
Repository: `JoeyAJ/joey-mission-control`. There are two kinds of Agent work here; do only the one you were asked for.

## A. Register a new project in MC ("登記到 MC")

You are NOT changing or deploying MC itself. You only add data to the `mc/registry` branch.

1. Prepare the project's own private repository `JoeyAJ/<repo>` on `main` with `HANDOFF.md`, `PRD.md`, `README.md`, `docs/PRODUCT_CHARTER.md`, `docs/PHASE_PLAN.md` and `.mission-control/bootstrap.json`. Use only access Joey granted you.
2. Register it on the `mc/registry` branch of `JoeyAJ/joey-mission-control` (data-only branch, deployments disabled) in the existing catalog format: a block in `PROJECT_REGISTRY_V1.0.md`, a row in `MEMORY_INDEX.md` (Production Development Registry and Systems Registry tables), one ledger entry in `.mission-control/registration-ledger.json`, and `PROJECTS/<PROJECT_ID>/{PROJECT_MEMORY,CURRENT_STATE,DECISIONS,NEXT_ACTIONS,ARCHITECTURE}.md`. `AI_INTERACTIVE_EXPERIENCE_ENGINE` is the reference example. The catalog must pass `validateRegistrationCatalog` in `src/onboarding/project-registration-catalog.mjs`; an invalid catalog hides every registered project.
3. Set `Status: Pending Development` in `CURRENT_STATE.md`. Do not start product development, change other projects, MC application code, deployments, environment variables or credentials.
4. Report to Joey: project ID, repository and the overview link. The project appears under "Your call" (等你決定) with Start development / Reject; Joey decides when and to which Agent it is handed off. Do not propose publishing MC changes for this.

### Sync progress (registered projects)

Registered projects have no live report connection, so MC shows their version, Agent, date and work log from the catalog record. The developing Agent updates it when it takes over (MC then marks the handoff as picked up), at the end of every work session, and after every version Joey accepts. Data only; never MC code, `main` or deployments.

1. On the `mc/registry` branch edit `PROJECTS/<PROJECT_ID>/CURRENT_STATE.md`: the yaml fence `version`, `current_agent` (your name, e.g. `Claude Code`), `agent_model`, `as_of` (today, `YYYY-MM-DD`), and `## Current Stage`. To show Active, describe the stage as accepted/building and avoid the words test, production, deployed, maintenance, complete(d), idea, paused, blocked there; they change the derived status. `## Recommended Next Step` in `NEXT_ACTIONS.md` is the card's next step.
   Add one line at the top of `## Work log` in the same file for every work session (newest first, max 20 shown): `- <ISO time with offset> | <Agent> | completed|in_progress|blocked | <one sentence, max 200 chars>`, for example `- 2026-10-15T15:22:29+09:00 | Claude Code | completed | v0.5 interaction core (accepted by Joey)`. MC shows these as the project's work log and uses the newest time as "updated".
2. Refresh that project's `entries[].memoryHashes` in `.mission-control/registration-ledger.json` (SHA-256 of each changed file's bytes). Do not edit the ledger `receipt`, `PROJECT_REGISTRY_V1.0.md` or `MEMORY_INDEX.md`.
3. Validate with `validateRegistrationCatalog` from the latest `main` before pushing; an invalid catalog hides every registered project. Fast-forward push only, never force.

A worked example is `docs/MC_SYNC.md` in `JoeyAJ/ai-interactive-experience-engine`.

## B. Develop Mission Control itself (only when Joey asks for MC changes)

Read [HANDOFF](HANDOFF.md) first, then [PRODUCT_CHARTER](docs/PRODUCT_CHARTER.md). `main` is the current version and Vercel's production branch: a push to `main` deploys https://joey-mission-control-one.vercel.app. Work on a feature branch from the latest `main` and merge only with Joey's approval. Never push or deploy an older base over it. Keep three locales (zh-TW/ko/en) in sync, keep the CSP, and run tests from a copy outside `~/Documents/Codex/Projects` (portability guard).

Older protocols (Mac check-in, V0.2/V0.3 branches, branch-preview sign-in) were removed on 2026-10-15; they are only in Git history and are not instructions.
