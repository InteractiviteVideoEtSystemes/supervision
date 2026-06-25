# ADR-002: Pluggable probe architecture for autonomous component checks

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `../specs/SPEC.md`

## Context

Components do not share a single status source. Five components (Database, Ldap,
Statistics, VideoMessaging, Cti) are obtained from one shared call to the
`core-API` `/health` endpoint, `core-API` is judged by the reachability of that
route, and `Connect` is checked by an **independent** HTTP request to its own URL.
The system must allow adding more components later, each with its **own autonomous
check** (its own URL/protocol and status logic), ideally without code changes to
the evaluation engine.

## Decision

Introduce a **pluggable probe** abstraction. Each component is attached to a
**probe** that produces that component's status from its own source:

```ts
type ComponentStatus = 'up' | 'down' | 'unknown';
interface ProbeResult { componentCode: string; status: ComponentStatus; rawPayload?: unknown; }
interface Probe { check(): Promise<ProbeResult[]>; }
```

Initial probe types: `core-api-health` (shared, multi-component), `http-reachable`
(core-API), `http-status` (Connect). Components are **configuration-driven** via
`probe_type` + `probe_config` rows; probes are isolated (own timeout) and a new
protocol is added by implementing a new `Probe` type, with no change to the
evaluator, persistence, API or UI.

## Consequences

### Positive

- New components are onboarded by **configuration** (a row + probe parameters),
  not by editing core logic.
- Probes are isolated: one failing/timing-out probe does not affect others.
- Clear separation between "how we obtain a status" (probe) and "how we aggregate
  and store it" (evaluator).

### Negative

- More upfront abstraction than hard-coding the two or three current sources.
- Probe configuration (`probe_config` JSON) must be validated to avoid misconfig.

### Neutral

- The `core-api-health` probe is special (one call → several components), so the
  probe interface returns a list of results rather than a single one.

## Options Considered

### Option 1: Pluggable probes (registry + interface) — chosen
- **Pros:** extensible, config-driven, isolates sources, future-proof.
- **Cons:** more initial design effort.

### Option 2: Hard-coded checks per component
- **Pros:** simplest to implement for the current 7 components.
- **Cons:** every new component requires code changes and redeploy; poor fit for
  the stated extensibility goal.

## Related Decisions

- ADR-004 (transitions-only storage)
- ADR-005 (global status derivation)
- ADR-006 (core-API reachability rule)
- ADR-009 (per-component interval & UI-driven configuration)

## Notes

The extensibility requirement was explicitly stated: the application must be
designed to allow adding other components with autonomous requests (i.e. not
going through core-API).
