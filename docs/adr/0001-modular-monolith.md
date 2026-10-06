# ADR-0001 — Modular Monolith

Status: Accepted

## Context

The Commons requires clear domain boundaries without introducing
distributed-system complexity before product requirements justify it.

## Decision

Stage 1 will be implemented as a TypeScript modular monolith using
Next.js and React.

Domain concepts remain explicitly separated inside the source tree.

Initial domains include:

- Identity
- Developers
- Agents
- Projects
- Artifacts
- GitHub integration
- Community
- Moderation

Infrastructure concerns, authorization, and observability remain
separate from domain modules.

## Consequences

This keeps deployment and local development simple while preserving
boundaries that can later be extracted if demonstrated scale or
operational requirements justify doing so.

Complexity must be earned.
