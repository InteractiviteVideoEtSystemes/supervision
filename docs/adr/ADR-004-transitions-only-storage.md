# ADR-004: Store status as transitions only, and historize the global status

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `SPEC.md`

## Context

The service polls components roughly once per minute, per component. We must keep
a per-component status history (a timeline) and also keep a history of the overall
**global status**. Persisting one row per component per minute would grow the
database quickly and add little value when nothing changes.

## Decision

Persist **only status transitions**:

- A `status_history` row is written for a component **only when its status
  changes** versus its last known status. The current status is the latest row;
  an incident's duration is the gap between two consecutive transitions.
- The **global status is also historized** in a dedicated `global_status_history`
  table (per environment), written **only on change**, giving a full timeline of
  overall health independent of which component caused it.
- For now there is **no retention/purge**; history grows unbounded (a retention
  policy may be added later).

## Consequences

### Positive

- Greatly reduced data volume versus one-row-per-minute.
- The transition model maps directly to a timeline and to downtime-duration
  computation.
- The global status timeline is queryable on its own.

### Negative

- Requires tracking the "last known status" per component and per environment to
  detect changes.
- Without a purge, the tables still grow over time (slowly).
- "Last successful check" timestamp is not stored per reading; if needed, a
  separate current-status table/heartbeat must hold it.

### Neutral

- A `current_status` table (or "latest transition" query) is recommended to serve
  the dashboard efficiently.

## Options Considered

### Option 1: Transitions only — chosen
- **Pros:** low volume, natural timeline, clear durations.
- **Cons:** needs last-status tracking; no per-minute proof-of-life by default.

### Option 2: One row per reading (every minute)
- **Pros:** simplest; records every check including unchanged ones.
- **Cons:** high volume; needs a retention policy early; redundant data.

## Related Decisions

- ADR-003 (MariaDB persistence)
- ADR-005 (global status derivation feeding `global_status_history`)

## Notes

User decisions: "stockage des transitions", "pas de nettoyage pour le moment",
and "il faut que le statut global soit historisé".
