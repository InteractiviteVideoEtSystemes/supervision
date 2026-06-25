# ADR-001: Use TypeScript end-to-end (NestJS backend + React/Vite frontend)

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `../specs/SPEC.md`

## Context

We are building a new supervision service: a backend that periodically probes
several components, persists their statuses, and exposes them to a modern web UI.
A language and framework had to be chosen for both the backend and the frontend.
The initial input proposed TypeScript while explicitly inviting a challenge of
that choice.

## Decision

Use **TypeScript end-to-end**:

- **Backend**: Node.js + **NestJS** (built-in scheduler, dependency injection,
  TypeORM/Prisma for MariaDB, guards for auth).
- **Frontend**: **React** with **Vite**.

TypeScript is the selected and final choice for the project.

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive

- A single language across backend and frontend, with **shared DTOs/contracts**
  and strong typing reducing integration bugs.
- Large monitoring/HTTP ecosystem and good Docker integration.
- NestJS provides scheduling, guards and a modular structure that fit the probe
  architecture and the admin authentication needs.

### Negative

- Node.js runtime footprint is larger than a compiled binary (e.g. Go).
- Not aligned with the historical PHP stack of some sibling projects
  (e.g. eliozconnect), so it introduces another runtime to operate.

### Neutral

- Choice of ORM (TypeORM vs Prisma) is left open at implementation time.

## Options Considered

### Option 1: TypeScript (NestJS + React/Vite) — chosen
- **Pros:** shared types front/back, rich ecosystem, fast UI tooling, good fit
  for the required real-time UI.
- **Cons:** heavier runtime than a compiled language.

### Option 2: Go backend
- **Pros:** lightweight single binary, low memory footprint.
- **Cons:** no shared types with a JS/TS frontend; more boilerplate for the UI
  contract; less aligned with the "state of the art UI" goal.

### Option 3: PHP backend (consistent with eliozconnect)
- **Pros:** consistent with existing Elioz stack and packaging conventions.
- **Cons:** weaker fit for a real-time, typed full-stack app; no shared types.

## Related Decisions

- ADR-002 (pluggable probe architecture)
- ADR-003 (MariaDB + Docker deployment)

## Notes

The user explicitly confirmed "stay on TypeScript" after the challenge was raised.
