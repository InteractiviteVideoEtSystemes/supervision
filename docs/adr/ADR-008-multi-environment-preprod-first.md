# ADR-008: Model multiple environments from the start, build preprod-first

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `SPEC.md`

## Context

The same set of components exists across several environments (preprod, prod, …).
The supervision tool should eventually cover multiple environments, but the
initial build is for tuning and should focus on **preprod** only. We must avoid a
data model that hard-codes a single environment and would later require a redesign.

## Decision

- Introduce an **`environment`** entity. Components, the global status history and
  the API/UI are **scoped per environment**.
- Enable **only `preprod`** for the initial build; `prod` and others are modeled
  but disabled.
- Enabling another environment later is an **onboarding/configuration step** (add
  the environment and its components), not a code redesign.

## Consequences

### Positive

- Future multi-environment support requires no schema redesign.
- Per-environment global status and history are naturally supported.

### Negative

- Slightly more complexity now (environment foreign keys, `env` query scoping)
  for a feature only partly used initially.

### Neutral

- API routes carry an `env` parameter (defaulting to `preprod` during the build).

## Options Considered

### Option 1: Multi-environment model, preprod-first — chosen
- **Pros:** no future redesign; matches the stated long-term need.
- **Cons:** minor upfront complexity.

### Option 2: Single environment (preprod only), add multi-env later
- **Pros:** simplest now.
- **Cons:** likely schema/API rework when prod is added; rejected given the
  explicit future requirement.

## Related Decisions

- ADR-004 (global status history is per environment)
- ADR-006 (preprod/prod health URLs)

## Notes

User decision: multiple environments must eventually be supported, but for now,
during tuning, we work only on preprod.
