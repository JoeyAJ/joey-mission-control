# Data Schema

## Claim classification

Every source-backed claim is classified as one of:

- `canonical`
- `derived`
- `observed`
- `local_overlay`
- `proposal`
- `unknown`

Canonical/derived/observed claims include source path, section, SHA-256 fingerprint, read time, optional `asOf`, and verification status.

## Project Projection

Generated and disposable. Required Dashboard fields:

- Project Name
- Status
- Current Phase
- Version
- Last Completed
- Current Task
- Next Action
- Blocker
- Last AI
- Model
- Workspace
- Last Updated

WHERE fields include Local Path, Repository, Branch, Last Commit, Production, Database, and Relevant Docs.

## Lifecycle

Exact phase vocabulary:

`IDEA`, `DISCOVERY`, `SPEC`, `BUILD`, `TEST`, `DEPLOY`, `MAINTAIN`

Exact Dashboard status vocabulary:

`Active`, `Paused`, `Idea`, `Planned`, `Completed`

A derived attention state may be `needs_decision`, `awaiting_approval`, `ready_to_continue`, `verification_needed`, `paused_by_boundary`, or `unknown`. It never overwrites canonical state.

## Inbox

Types: `Request`, `Decision`, `Notice`, `Problem`.

States: `Needs review`, `Ready to confirm`, `In progress`, `Resolved`.

Raw input is untrusted. Interpretation creates a proposal only. Formal project promotion requires Joey's explicit decision and a later Hermes canonical update.

## AI workspace session

Records AI, model, associated entity, declared task, repository, path, branch, starting/current commit, permission boundary, state, and timestamps. It is a local observation, not project authority.

## Continue payload

Contains Last AI, Last Completed, Current Task, blocker, Next Action, Latest Commit, Recommended Workspace, Handoff Context, source fingerprints, approval gates, conflicts, and a copyable Hermes context.
