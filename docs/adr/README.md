# Architecture Decision Records — Supervision UI

This directory contains the Architecture Decision Records (ADRs) for the
Supervision UI service, derived from `../specs/SPEC.md` and following
`../../../accelerator-resources/ADR_TEMPLATE.md`.

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-language-and-stack.md) | Use TypeScript end-to-end (NestJS + React/Vite) | Accepted |
| [ADR-002](ADR-002-pluggable-probe-architecture.md) | Pluggable probe architecture for autonomous component checks | Accepted |
| [ADR-003](ADR-003-mariadb-and-docker.md) | Deploy as a Docker service backed by MariaDB | Accepted |
| [ADR-004](ADR-004-transitions-only-storage.md) | Store status as transitions only, and historize the global status | Accepted |
| [ADR-005](ADR-005-global-status-derivation.md) | Derive the global status from per-component criticality | Accepted |
| [ADR-006](ADR-006-core-api-reachability-rule.md) | Determine core-API status from /health reachability, not its HTTP code | Accepted |
| [ADR-007](ADR-007-public-dashboard-protected-admin.md) | Public dashboard with a database-backed, bcrypt-protected admin area | Accepted |
| [ADR-008](ADR-008-multi-environment-preprod-first.md) | Model multiple environments from the start, build preprod-first | Accepted |
| [ADR-009](ADR-009-per-component-interval-ui-config.md) | Per-component polling interval, configured through the admin UI | Accepted |
