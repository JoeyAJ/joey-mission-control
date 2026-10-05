# Architecture

## Role

Mission Control is a local-only read/projection/orchestration layer above Joey's projects and systems. It is not a child feature of NexAeon, Woosong Buddy, Namyoung Web3D, or Joey Asset System.

## Authority

1. Joey's current instruction.
2. Live source appropriate to the claim, checked before consequential work.
3. `/Users/joeyaj/JOEY_CANONICAL_MEMORY/MEMORY_INDEX.md` and `PROJECT_REGISTRY_V1.0.md`.
4. Per-entity `PROJECT_MEMORY.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CURRENT_STATE.md`, and `NEXT_ACTIONS.md`.
5. Local canonical `HANDOFF/`.
6. Historical evidence only after the sources above.

The private Handoff repository is a sanitized transport projection, not authority.

## Components

- **Canonical adapters:** read and fingerprint Canonical Memory.
- **Projection engine:** produces disposable Project projections with provenance.
- **Git observer:** executes fixed read-only Git probes against canonical Local Masters.
- **Local overlay:** atomically stores Inbox records and AI/workspace sessions outside Canonical Memory.
- **Continue composer:** builds a bounded Resume Context and blocks stale/conflicting continuation.
- **Policy guard:** exposes approval gates and prevents browser-driven canonical writes or external side effects.
- **Loopback API/UI:** serves the Dashboard only on `127.0.0.1`.

## Invariants

- Canonical state is never silently copied into an editable second database.
- Generated projections are disposable and source-referenced.
- Unknown or contradictory facts remain Unknown/Conflict.
- `NAMYOUNG_WEB3D`, `JOEY_ASSET_SYSTEM`, and `CASE_001_NAMYOUNG` are distinct entities.
- Phase and Dashboard status are independent fields.
- No browser input becomes a shell command or arbitrary filesystem path.
- V0.1 cannot commit, push, deploy, migrate, reset, or clean repositories.

## Stop conditions

Continuation is blocked when canonical and observed workspaces diverge, a repository is dirty without an acknowledged checkpoint, an entity reference is ambiguous, a source fingerprint is stale, or a Joey decision/approval gate is active.
