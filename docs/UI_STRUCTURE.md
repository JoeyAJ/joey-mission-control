# UI Structure

## Navigation

- Dashboard
- Inbox
- Workspaces
- Handoffs
- Project detail

Desktop uses a fixed rail, tablet a compact rail, and mobile a bottom navigation bar.

## Dashboard

Status filters appear in exact order:

`Active | Paused | Idea | Planned | Completed`

Cards and desktop table view expose the same essential fields. Attention is a derived condition, not a project status.

## Project card

Shows Project Name, Status, Phase, Version, Last Completed, Current Task, Next Action, Blocker, Last AI, Model, Workspace, Last Updated, and a primary Continue action.

## Continue

Shows Last Known State, Next Action, Workspace, Open Questions, Relevant Handoff, conflicts, freshness, and a copyable Hermes continuation context. It never executes a raw command.

## Inbox

A natural-language composer creates an Inbox record. Interpretation preview identifies entity, proposed action, side effects, approval requirements, and ambiguity. Raw input never executes directly.

## Workspaces

Shows actual path, repository, branch, full commit, working-tree classification, upstream/ahead/behind when available, last observed time, AI/model/session, and permission boundary.

## Handoffs

Shows per-entity latest and history. Task completion is visually separate from project status.

## Accessibility

Semantic landmarks, keyboard operation, visible focus, text/icon status indicators, polite live regions, reduced motion, at least 44px touch targets, and responsive layouts at 360/768/1024/1440px.
