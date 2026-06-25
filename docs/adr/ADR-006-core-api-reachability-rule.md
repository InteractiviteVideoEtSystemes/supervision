# ADR-006: Determine core-API status from /health reachability, not its HTTP code

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `SPEC.md`

## Context

The `core-API` `/health` endpoint returns a JSON body describing the other
components. Probing it in practice showed it can return **HTTP 503 while still
serving a full body** (observed in prod: `503` with `isServiceApiUp:false`). The
initial idea of mapping `200 ⇒ up / non-200 ⇒ down` for core-API would therefore
flag core-API as down even though the route is clearly reachable and serving data.
We need a robust rule for the `core-API` component itself, and a rule for parsing
the body that powers the other five components.

## Decision

- **core-API status = reachability of `/health`**: if **any** HTTP response is
  received (regardless of status code: 200, 503, …) ⇒ **up**; if **no response**
  at all (timeout, network error, unreachable host) ⇒ **down**. core-API is never
  `unknown`. The `isServiceApiUp` body field is **not** used.
- **Always parse the body when present**, even on a non-200 code: the five
  components (Database, Ldap, Statistics, VideoMessaging, Cti) are read from the
  JSON booleans.
- If there is **no response at all**, those five components become **unknown**
  (orange), while core-API becomes **down**.

## Consequences

### Positive

- Robust to the known `503-with-body` behavior; avoids false "core-API down".
- Maximizes useful information: component statuses are still read from a 503 body.

### Negative

- core-API "up" no longer implies a healthy 200; it only means "reachable". This
  is intentional but must be understood by operators.

### Neutral

- Implemented as the `http-reachable` probe type (see ADR-002).

## Options Considered

### Option 1: Reachability-based (any response ⇒ up) — chosen
- **Pros:** matches observed behavior; never falsely down when serving data.
- **Cons:** decouples "up" from HTTP 200 semantics.

### Option 2: HTTP 200 ⇒ up, else down
- **Pros:** stricter health semantics.
- **Cons:** flags core-API down on the real `503-with-body` case; rejected by the
  user after observing the endpoint.

### Option 3: Use the `isServiceApiUp` body field
- **Pros:** uses the API's own self-assessment.
- **Cons:** the user chose reachability instead; the field can be `false` while
  the route is reachable and serving the other statuses.

## Related Decisions

- ADR-002 (probe types, incl. `http-reachable` and `core-api-health`)
- ADR-005 (how core-API feeds the global status)

## Notes

User decision after testing the route: if it responds, whatever the return code,
core-API is up; if it does not respond, it is down.
