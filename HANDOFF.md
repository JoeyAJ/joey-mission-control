# Mission Control development handoff

Project: MISSION_CONTROL
Timestamp: 2026-10-09T07:11:45Z
Task: Private workspace source synchronization and replacement-agent handoff
Status: LOCAL_VERIFIED_PENDING_PUBLICATION
Executed by: Codex
Baseline: bd89889155c9532462dde0c40a060dc23daa5f34

## Summary

The local candidate connects the repository reader to the actual MC workspace. The fixed Preview adds an MC navigation entry alongside the existing four projects, without fabricating project progress. Current Owner verification starts private source synchronization; every read resolves the configured branch and pins file bytes to that immutable SHA. Source metadata, document-reported progress and raw Markdown remain private and distinct from execution telemetry. The current runtime agent and model remain unknown.

## Changes

- Current Owner identity is checked through the existing NEXAEON session bridge. A separate exact-Owner MC repository read policy authorizes this source without opening MC database membership or decisions.
- The server uses only the dedicated runtime repository Secret. Browser transport sends the current Owner session to the same-origin private endpoint; repository credentials never enter browser code or handoff packets.
- MC-only workspace entry, initial authenticated read, 30-second synchronization, refresh/pause/resume, source failure and recovery, and private source inspection.
- Missing root HANDOFF.md uses only the explicit historical mapping. Missing, denied, unavailable, malformed, conflicting and stale evidence retain their qualifications.
- Navigation, hidden-page lifecycle, logout, revocation and expiry purge private source, late results, handoff packets and Owner model choices. Other project views retain their own scoped data.
- Agent, provider and model are replaceable text identifiers. Owner choices are carried as explicit intent in a portable, source-bound handoff packet, with no execution or write grant. An unspecified model remains an Owner decision.

## Verification

Portable tests, module build, canonical schema validation and static checks pass locally. Chromium exercises the actual workspace, official Supabase Auth SDK, same-origin HTTP transport, immutable SHA changes, outage recovery and private lifecycle clearing at desktop and mobile widths in English, Traditional Chinese and Korean.

Auth, GitHub and MFA provider responses in these browser tests are local synthetic fixtures. They do not prove a real Joey session, token permissions, remote repository update or deployed execution. No private source contents are compiled into the public browser bundle or stored in browser persistence.

## Decision Required

This is a local release candidate awaiting explicit publication and fixed-Preview deployment approval. Read-only Vercel metadata confirms the repository Secret is scoped only to the fixed Preview branch; its GitHub repository and Contents permissions are not independently verified. The deployed workspace has not received this candidate.

The MC-specific database scope migration and temporary executor inheritance remain excluded and unapplied. No new grant, database write, job or deployment is part of this slice.

## Next Action

Review the exact candidate manifest and approve publication to the existing private branch and fixed Preview if appropriate. After release, verify the server's real repository read through the Owner workspace, without extracting the Secret. Before any replacement agent performs dependent work, reconcile the current source SHA, content digest and permissions. Keep all project context and handoffs provider-neutral; Owner chooses the agent and model for execution.
