# ADR-003: Deploy as a Docker service backed by MariaDB

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `SPEC.md`

## Context

The supervision service is a new, self-contained application that must store
per-component status history and be simple to install and update. The deployment
target and persistence technology had to be defined.

## Decision

- Deploy the service (backend + built UI) and its database via **Docker** /
  `docker-compose`, with a persistent volume.
- Use **MariaDB** as the database.
- Infrastructure configuration (DB access, base settings) is provided via
  **environment variables**; component/probe configuration lives in the database.

## Consequences

### Positive

- Reproducible install/upgrade with `docker compose up`.
- MariaDB is already used across the Elioz ecosystem, so it is familiar to operate.
- Clear separation: infra config in env vars, business config in DB.

### Negative

- Requires a Docker host and a persistent volume to avoid losing history.
- One more database instance to back up and monitor.

### Neutral

- Packaging may additionally follow IVES RPM conventions (`*.spec`, `ives-*`
  macros) if required by the existing deployment pipeline.

## Options Considered

### Option 1: Docker + MariaDB — chosen
- **Pros:** matches the explicit technical constraints; consistent with the
  ecosystem; reproducible.
- **Cons:** needs container hosting and volume management.

### Option 2: PostgreSQL
- **Pros:** rich feature set (JSONB, etc.).
- **Cons:** not the ecosystem default; contradicts the stated MariaDB constraint.

### Option 3: SQLite (embedded)
- **Pros:** zero external DB to operate.
- **Cons:** weaker for concurrent writes/history growth; not aligned with the
  MariaDB constraint.

## Related Decisions

- ADR-004 (transitions-only storage in MariaDB)
- ADR-007 (admin credentials stored in MariaDB)

## Notes

Technical constraints from the input: "New service to be deployed docker",
"Database to be deployed is mariadb".
