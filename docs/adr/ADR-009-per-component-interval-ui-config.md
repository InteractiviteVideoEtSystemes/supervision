# ADR-009: Per-component polling interval, configured through the admin UI

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `../specs/SPEC.md`

## Context

The baseline requirement is to poll the health source once per minute. However,
different components/routes may warrant different cadences, and the set of
components must be manageable without redeploying the service. We need to decide
where the polling cadence and component definitions live and how they are edited.

## Decision

- Each component has its **own polling interval** (`interval_seconds`, default 60),
  configurable **per route**, rather than a single global interval.
- Components and their probe configuration are **managed via the admin UI** (CRUD)
  and persisted in the database; the scheduler runs each enabled probe on its own
  interval.
- A newly added/edited component is picked up by the scheduler **without
  restarting** the service.

## Consequences

### Positive

- Flexible cadence per component (e.g. cheaper checks more often, heavier ones
  less often).
- Operators onboard new autonomous components at runtime via the UI — no redeploy.

### Negative

- The scheduler must support dynamic, per-component timers and react to config
  changes, which is more complex than a single fixed cron.
- UI-driven configuration must be validated to prevent invalid probe setups.

### Neutral

- Configuration lives in the database, not in environment variables.

## Options Considered

### Option 1: Per-component interval + UI CRUD — chosen
- **Pros:** flexible, runtime-manageable, matches the extensibility goal.
- **Cons:** dynamic scheduler and config validation needed.

### Option 2: Single global interval (fixed 60 s), config via file/env
- **Pros:** simplest scheduler.
- **Cons:** no per-route tuning; requires redeploy to change components;
  contradicts the UI-configuration decision.

## Related Decisions

- ADR-002 (probe configuration drives components)
- ADR-007 (UI configuration lives in the protected admin area)
- ADR-008 (components are scoped per environment)

## Notes

User decisions: per-route interval configuration, and configuration through the UI.
