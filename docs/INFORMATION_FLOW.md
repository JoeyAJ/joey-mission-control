# Information Flow

## Dashboard projection

`Canonical Memory → read-only adapters → fingerprints → normalized projection → optional fresh Git observation → local Dashboard`

The projection cache can be deleted and rebuilt without losing authority.

## Inbox

`Joey natural language → local Inbox record → deterministic safety/ambiguity checks → Hermes interpretation preview → Joey confirmation when required → proposal`

V0.1 does not write the proposal into Canonical Memory automatically. Hermes performs a verified canonical update only after the instruction is sufficiently explicit.

## Continue

`Project selection → reload canonical sources → compare fingerprints → refresh Git observation → merge latest Handoff + local AI session → policy gates → Resume Context`

A stale or divergent workspace blocks blind continuation and shows the difference.

## Handoff

`AI work result → structured minimum handoff → canonical local Handoff → Mission Control projection`

Minimum information: Completed, Decisions, Changed, Commit, Known Issues, Current State, Next Action, Recommended Next AI/Workspace.

Durable architecture/product decisions belong in `DECISIONS.md`; small changes do not create decision noise.

## AI tracking

AI/model/workspace data is stored as local observation. Repository facts come from fresh fixed Git probes. Stored observations never prove current repository state without a timestamped recheck.
