# ADR-007: Public dashboard with a database-backed, bcrypt-protected admin area

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Hervé Brutin / Elioz Platform Team  
**Technical Story:** Supervision UI — see `../specs/SPEC.md`

## Context

The supervision dashboard should be freely viewable (a public status page), but
the **administration area** — where components/probes are configured and the
password is changed — must be restricted to authorized users. A simple
authentication mechanism with database-stored credentials is required, with the
password stored securely.

## Decision

- The **dashboard, history and global timeline are public** (read-only, no login).
- The **admin area is protected by username/password** stored in the database in
  an `admin_user` table. The password is stored as a **bcrypt hash** (per-password
  salt, cost ≈ 10–12); plaintext is never stored or logged.
- Seed an initial user **`admin`** with password **`admin`**; the password is
  **changeable from the admin UI** (verify current, re-hash new).
- Login (`POST /api/auth/login`) verifies with `bcrypt.compare` and issues a
  short-lived session (HTTP-only cookie) or signed JWT; admin routes are protected
  by a guard returning `401` when unauthenticated.

## Consequences

### Positive

- Status visibility for everyone; configuration changes restricted.
- Simple, self-contained auth with no external IdP dependency.
- Passwords are never stored in clear; standard, well-understood hashing.

### Negative

- The default `admin`/`admin` is insecure until changed; operators must change it.
- A homegrown auth (vs SSO) means no central account/password policy management.

### Neutral

- Single admin account initially; multi-user/roles can be added later.
- LDAP/SSO integration remains a possible future evolution.

## Options Considered

### Option 1: DB-backed user/password with bcrypt — chosen
- **Pros:** simple, self-contained, meets the requirement; secure hashing.
- **Cons:** another credential to manage; no SSO.

### Option 2: No authentication (fully public, incl. admin)
- **Pros:** simplest.
- **Cons:** anyone could change configuration; rejected.

### Option 3: LDAP/SSO (reuse existing directory)
- **Pros:** central account management, no local passwords.
- **Cons:** more integration effort than requested for a "simple" mechanism;
  deferred.

## Related Decisions

- ADR-003 (admin_user stored in MariaDB)
- ADR-009 (admin area is where components are configured)

## Notes

User decisions evolved from "no login (public page)" to "the admin part should be
protected by user/password, stored in DB, hashed; user `admin`, initial password
`admin`, changeable in the admin UI".
