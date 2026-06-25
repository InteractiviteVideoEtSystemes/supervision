# ADR-005: Derive the global status from per-component criticality

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `../specs/SPEC.md`

## Context

Beyond each component's individual status (up/down/unknown), the UI must show a
single **global status** that reflects the overall health of the environment.
Some components are more critical than others: an outage of Statistics,
VideoMessaging or Connect should be treated as a degradation, while an outage of
Database, Ldap, Cti or core-API is a major incident.

## Decision

Classify each component by **criticality** (`critical` or `degraded`) and derive
the global status with this precedence (`red > orange > green`):

- **Green (up):** all components are green.
- **Red (down):** at least one **critical** component (Database, Ldap, Cti,
  core-API) is not green (down or unknown).
- **Orange (degraded):** otherwise, if a **degraded-class** component (Statistics,
  VideoMessaging, Connect) is not green.

Criticality is stored on each component, so adding a component just requires
choosing its class.

## Consequences

### Positive

- Operators get an at-a-glance severity that distinguishes "degraded" from "major".
- Criticality is data-driven, so new components plug into the rule automatically.

### Negative

- The mapping of each component to a criticality class is a judgment call that may
  need revisiting as the platform evolves.

### Neutral

- `unknown` is treated as "not green" and therefore contributes like a non-up
  status when computing the global status.

## Options Considered

### Option 1: Criticality-based aggregation (critical/degraded) — chosen
- **Pros:** matches the requested rules; extensible via per-component class.
- **Cons:** requires maintaining the classification.

### Option 2: Worst-status wins (any non-green ⇒ red)
- **Pros:** trivial to implement.
- **Cons:** cannot express "degraded" (orange) for less critical components;
  contradicts the requirements.

## Related Decisions

- ADR-002 (probes provide per-component status)
- ADR-004 (global status is historized as transitions)
- ADR-006 (core-API status rule)

## Notes

Rules from the input and follow-ups: orange if Statistics or VideoMessaging is not
green; Connect added to the degraded class (down ⇒ orange); red if a critical
component is not green.
