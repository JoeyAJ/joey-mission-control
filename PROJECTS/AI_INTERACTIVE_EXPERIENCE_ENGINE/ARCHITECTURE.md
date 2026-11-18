# AI_INTERACTIVE_EXPERIENCE_ENGINE — ARCHITECTURE

Project: AI_INTERACTIVE_EXPERIENCE_ENGINE
Status: In Development

Specification (JSON, v0.2) → strict validation against approved models and scene assets → shared Runtime (deterministic simulation, missions, share links) → generic UI with whitelisted SVG scenes plus a lazy original solar Three.js viewer. Next.js 16 + TypeScript on Vercel (Hobby, free). AI (later) only writes specifications through the same validation; generated code is never executed.

## Solar presentation adapter — v0.5.1

SolarStructure → error boundary → Solar3DPanel → imperative WebGL viewer → original grouped geometry. Runtime still owns navigation, teaching state, deterministic models, missions and save/share. No copied Anatomy source/models; methods and pinned references are in docs/DEVELOPMENT_MASTER_RECORD.md in the product repository.

## Registration source

Repository: JoeyAJ/ai-interactive-experience-engine
Branch: main
Verified document baseline: a615f0d38fdba82b6d848a92d8a76bc6fc2cbe95
Entry: HANDOFF.md
Entry SHA256: 3e337e5595d7db8f12a853ac7e81bc0d16520f3f96890ed610299833aec9c3d3
Approval: Sentinel_18f336a6d41c81919379e9483fb7cca8

The registration baseline above is historical. Development progress is synced here by the developing Agent after every accepted version (see the project repository HANDOFF.md, "Mission Control sync rule").
