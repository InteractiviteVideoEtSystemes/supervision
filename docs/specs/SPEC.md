# Supervision UI Specification

**Status:** Approved  
**Owner:** Hervé Brutin / Elioz Platform Team  
**Created:** 2026-06-25  
**Last Updated:** 2026-06-25

> **Addendum (2026-06-25):** extended with the display-refinement batch
> **AISB-109** (history detail design), **AISB-110** (simplified main page) and
> **AISB-111** (history for the global status). These additions are **Draft**
> pending the items in *Open Questions*; the rest of the spec remains Approved.

## Overview

Provide a centralized **supervision** web interface to visualize, in near
real time, the health status of the key components of the Elioz environment, and
to store these statuses in a database to keep a per-component history.

A backend service periodically (once per minute) determines the status of each
supervised component, derives a **global status**, persists every reading in the
database, and exposes this data to a modern UI showing the current state and the
per-component history.

Components do **not** all share the same status source. The system is built
around **pluggable, autonomous probes** (see Technical Design → Extensibility):

- Several components (Database, Ldap, Statistics, VideoMessaging, Cti) are derived
  from a **single shared call** to the `core-API` REST `/health` endpoint, which
  returns their statuses together in one JSON payload.
- `core-API` itself is supervised by the **reachability** of that same `/health`
  route.
- `Connect` is supervised by an **independent** HTTP probe against its own URL,
  unrelated to core-API.

The application is explicitly designed so that **new components can be added with
their own autonomous checks** (their own URL/protocol and status logic) without
going through core-API, ideally via configuration only.

Supervised components (initial scope):

| Component | Status source | JSON field |
|-----------|---------------|------------|
| Database | core-API health | `isDatabaseUp` |
| Ldap | core-API health | `isLdapUp` |
| Statistics | core-API health | `isStatisticsUp` |
| VideoMessaging | core-API health | `isVideoMessagingUp` |
| Cti | core-API health | `isCtiUp` |
| core-API | HTTP response of `/health` | Any response received ⇒ up, no response ⇒ down |
| Connect | HTTP response of its own URL | `200 OK` ⇒ up, otherwise ⇒ down |

## Goals

- Provide a "state of the art" UI showing each component and its current status
  (up / down / unknown) with a clear color code.
- Display a **global status** derived from the component statuses.
- Persist every status reading in the database, per component, to consult the
  history and its evolution over time.
- Poll the core-API REST `/health` endpoint once per minute, and the `Connect`
  URL once per minute.
- Be independently deployable via **Docker**, with a **MariaDB** database.
- Be **extensible**: allow adding new components with their own autonomous checks
  (not routed through core-API), ideally by configuration only.

## Non-Goals

- No alerting/notification system (email, SMS, webhook) in this version.
- No fine-grained application monitoring (CPU/RAM metrics, traces, logs): scope is
  limited to the up/down/unknown status exposed by the probes.
- No remediation/restart actions on components from the UI.
- No history retention/purge in this version (the history grows unbounded for now).
- The read-only dashboard/history is **public** (no login); only the admin area
  requires authentication.
- For the initial build, only the **preprod** environment is enabled (the model
  supports multiple environments, but prod is out of scope for now).

## User Stories

### As an operator, I want to see the status of each component at a glance so that I immediately detect an outage

**Acceptance Criteria:**
- [ ] Each component is displayed with a label and a colored indicator:
      green (up), red (down), orange (unknown).
- [ ] A global status is displayed prominently, computed according to the rules
      defined in Technical Design.
- [ ] The display refreshes automatically (at least once per minute) without a
      manual page reload.

### As an operator, I want to consult the status history of a component so that I can analyze the frequency and duration of incidents

**Acceptance Criteria:**
- [ ] For a given component, I can consult a timeline of its status transitions.
- [ ] The history can be filtered by date range.
- [ ] Each entry shows the status and the timestamp of the transition.

### As a standard (anonymous) user, I want the component history detail to be a simple colored timeline so that I can read incidents at a glance without technical noise (AISB-109)

**Acceptance Criteria:**
- [ ] Opening the history detail (via the "view history" button) renders a
      **temporal bar graph** where each segment is colored by status
      (green/orange/red), and **nothing else** — no raw REST/probe payload is
      shown to an anonymous user.
- [ ] The bar graph is ordered chronologically and reflects the stored status
      transitions for the selected component.

### As a logged-in (admin) user, I want to inspect the raw probe answer behind each history segment so that I can diagnose incidents (AISB-109)

**Acceptance Criteria:**
- [ ] On the same history detail view, when authenticated, **hovering the mouse
      over a status-colored bar** displays the corresponding **REST API answer**
      (the stored `raw_payload`) in a **tooltip**.
- [ ] When not authenticated, the tooltip with the raw answer is **not**
      available and the raw payload is not delivered to the client.

### As a standard user, I want a simplified main page so that the supervision overview stays compact and readable (AISB-110)

**Acceptance Criteria:**
- [ ] On the main dashboard, each component box displays **only its label**
      (the status color of the box is kept); no status text, last-transition
      date or other metadata is shown.
- [ ] **Clicking a component box opens that component's history.**
- [ ] The dashboard layout is **narrower** and shows **no more than 4
      components** in a row.

### As a standard user, I want to open the history of the global status so that I can review overall environment health over time (AISB-111)

**Acceptance Criteria:**
- [ ] **Clicking the global status box** opens the **global status history**
      (timeline of global status transitions for the environment).
- [ ] The global status history is reachable from the UI (it consumes the
      existing `GET /api/global-status/history` endpoint).

### As an administrator, I want the admin area to be protected by a login so that only authorized people can change the configuration

**Acceptance Criteria:**
- [ ] The dashboard/history is reachable without login, but the admin area
      requires a valid username/password.
- [ ] Initial credentials are `admin` / `admin`, stored in the database with the
      password **hashed** (bcrypt), never in clear text.
- [ ] I can change the admin password from the admin UI (verifying the current
      one); the new password is re-hashed before storage.
- [ ] Admin API routes reject unauthenticated requests with `401`.

### As an administrator, I want to manage supervised components from the UI so that I can add new autonomous checks without redeploying

**Acceptance Criteria:**
- [ ] I can create, edit and delete a component from the UI (label, criticality,
      probe type, probe parameters, polling interval).
- [ ] A newly added component is picked up by the scheduler and supervised on its
      configured interval without restarting the service.

### As an administrator, I want to deploy the service via Docker so that installation and updates are simple and reproducible

**Acceptance Criteria:**
- [ ] The service (backend + UI) and MariaDB start via `docker compose up`.
- [ ] Infrastructure configuration (DB access, base settings) is provided via
      environment variables; **component/probe configuration is managed in the UI**
      and persisted in the database.

## Technical Design

### Architecture

```
                +-----------------------------+
                |        Supervision UI        |
                |  (React + TypeScript / Vite) |
                +--------------+--------------+
                               | HTTP (REST/WS)
                               v
                +-----------------------------+        +-----------------+
                |     Supervision Backend      |  SQL   |     MariaDB     |
                |  (Node.js + TypeScript /     |------->|  status_history |
                |   NestJS) — Scheduler + API  |        |  components     |
                +-----------------------------+        +-----------------+
                       | runs registered probes (1×/min)
        +--------------+---------------------------+
        v              v                            v
+----------------+  +----------------+     +------------------------+
| CoreApiHealth  |  | HttpReachable  |     |  HttpStatus probe      |
| probe          |  | probe          |     |  (e.g. Connect)        |
| → Database,    |  | → core-API     |     | → 200 ⇒ up else down   |
|   Ldap, Stats, |  +----------------+     +------------------------+
|   VideoMsg,Cti |        |                          |
+----------------+        v                          v
        |          GET .../health           GET <component-specific URL>
        v
   GET .../health (shared, parsed once)
```

- **Scheduler**: triggers each registered **probe** on its **own configurable
  interval** (per component, default 60 s). Probes run independently of each other.
- **Probes (pluggable status providers)**: each probe knows how to obtain the
  status of one or more components from its own source. See *Extensibility*.
- **Status evaluator**: collects each probe's per-component result, computes the
  **global status**, and persists a row **only on status transitions** — both for
  each component (`status_history`) and for the **global status**
  (`global_status_history`).
- **Read API**: exposes current status, global status and history to the UI.
- **UI**: real-time dashboard + per-component history views.

> **Language: TypeScript (selected and final choice).** Strong typing shared
> between backend and frontend (common DTOs/contracts), a large monitoring
> ecosystem, and good Docker integration. Selected stack: **NestJS** (backend,
> built-in scheduler, TypeORM/Prisma for MariaDB) + **React/Vite** (frontend).

### Extensibility (pluggable probes)

The core design principle: **adding a new component must not require changing the
evaluation engine**. Each component is attached to a **probe** — a small unit
responsible for producing that component's status from an autonomous source.

A probe implements a common interface, e.g.:

```ts
type ComponentStatus = 'up' | 'down' | 'unknown';

interface ProbeResult {
  componentCode: string;
  status: ComponentStatus;
  rawPayload?: unknown;
}

interface Probe {
  // Returns one result per component this probe is responsible for.
  check(): Promise<ProbeResult[]>;
}
```

Initial probe types (each new component picks one, or a new probe type is added):

| Probe type | Behavior | Used by |
|------------|----------|---------|
| `core-api-health` | One shared HTTP call to `/health`; maps boolean fields to component statuses; on no response ⇒ those components `unknown` | Database, Ldap, Statistics, VideoMessaging, Cti |
| `http-reachable` | `up` if any HTTP response is received (any code), `down` if no response | core-API |
| `http-status` | `up` if response code is `200`, otherwise `down` | Connect |

Design rules for extensibility:

- Components and their probes are **configuration-driven** (DB rows and/or a
  config file): adding a component means adding a row + selecting a probe type and
  its parameters (URL, expected code, criticality), **not** editing core logic.
- Probes are **isolated**: one probe failing or timing out must not affect the
  others. Each probe has its own timeout.
- The `core-api-health` probe is a **shared/multi-component** probe (one call,
  several components). All other probes are typically **single-component** and
  fully autonomous (their own URL/protocol), not routed through core-API.
- New protocols (TCP check, gRPC, custom JSON field extraction, etc.) are added by
  implementing a new `Probe` type, with no change to the evaluator, persistence,
  API or UI.

### Data Model

Main entities:

**`environment`** (target environments — preprod, prod, …)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | Internal identifier |
| `code` | VARCHAR(32) UNIQUE | Environment key (`preprod`, `prod`, …) |
| `label` | VARCHAR(128) | Displayed label |
| `enabled` | BOOLEAN | Whether this environment is active (initially only `preprod`) |

> Multi-environment is modeled from the start, but only `preprod` is enabled for
> the initial build.

**`component`** (reference list of supervised components, per environment)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | Internal identifier |
| `environment_id` | INT FK → environment.id | Environment this component belongs to |
| `code` | VARCHAR(64) | Technical key (`database`, `ldap`, `statistics`, `video_messaging`, `cti`, `core_api`, `connect`) — unique per environment |
| `label` | VARCHAR(128) | Displayed label |
| `criticality` | ENUM('critical','degraded') | `degraded` for Statistics, VideoMessaging & Connect, `critical` for the others (drives the global status) |
| `probe_type` | VARCHAR(64) | Probe used to obtain the status (`core-api-health`, `http-reachable`, `http-status`, …) |
| `probe_config` | JSON | Probe parameters (e.g. URL, expected code, JSON field, timeout) — enables adding a component by configuration only |
| `interval_seconds` | INT | **Per-component** polling interval (default 60), configurable per route |
| `enabled` | BOOLEAN | Whether supervision of the component is active |

Components are created/edited/removed **via the UI** (CRUD), persisted here.
`UNIQUE(environment_id, code)`.

**`status_history`** (status transitions)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT PK AUTO_INCREMENT | Transition identifier |
| `component_id` | INT FK → component.id | Component concerned |
| `status` | ENUM('up','down','unknown') | New status entered at this transition |
| `changed_at` | DATETIME(3) | Timestamp of the transition (first reading with the new status) |
| `raw_payload` | JSON NULL | Raw probe response at the transition (audit/debug) |

> **Storage = transitions only.** A row is inserted **only when the status
> changes** versus the component's last known status. A minute reading that
> yields the same status does **not** create a row. The current status of a
> component is its **latest** `status_history` row; an incident's duration is the
> gap between two consecutive transitions.

**`global_status_history`** (global status transitions, per environment)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT PK AUTO_INCREMENT | Transition identifier |
| `environment_id` | INT FK → environment.id | Environment concerned |
| `status` | ENUM('green','orange','red') | New global status entered at this transition |
| `changed_at` | DATETIME(3) | Timestamp of the global-status transition |

> **The global status is historized too.** After each evaluation cycle, the
> derived global status is compared to the environment's last recorded global
> status; a row is inserted **only on change** (transitions only, same principle
> as components). This gives a full timeline of the environment's overall health,
> independent of which component caused a change. The current global status is the
> **latest** `global_status_history` row for the environment.

Recommended index: `(environment_id, changed_at)` for the global timeline.

**`admin_user`** (admin credentials for the protected configuration area)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK AUTO_INCREMENT | Internal identifier |
| `username` | VARCHAR(64) UNIQUE | Login (seeded with `admin`) |
| `password_hash` | VARCHAR(255) | **bcrypt** hash of the password (never stored in clear) |
| `updated_at` | DATETIME(3) | Last password/account change |

> **Password storage.** Passwords are **hashed with bcrypt** (per-password salt,
> cost factor ≈ 10–12); the plaintext is never stored or logged. The table is
> seeded at first startup with `admin` / `admin` (hash computed at seed time). The
> password is **changeable from the admin UI** (which re-hashes the new value).
> Operators should change the default password after first login.

To serve the dashboard efficiently, keep the **current status per component**
readily available — either a dedicated `current_status` table (one row per
component, updated each cycle) or a "latest transition per component" query.

Recommended index: `(component_id, changed_at)` for history/timeline queries.

> **No retention/purge for now**: `status_history` grows unbounded in this
> version; a retention policy may be added later.

### API Design

**Consumed source — core-API health**

`GET https://core-api.elioz.fr/health` (prod) or
`https://core-api-preprod.elioz.fr/health` (preprod). Example body:
```json
{
  "isDatabaseUp": true,
  "isLdapUp": true,
  "isStatisticsUp": true,
  "isVideoMessagingUp": true,
  "isCtiUp": true,
  "isServiceApiUp": true
}
```

**Consumed source — Connect**

`GET https://connect-preprod.elioz.fr/2.0.0-5/index.php?hash=220d54f7e118460a573a3a940d46b5fd`
(the version segment and hash are configurable). This is a **separate** poll,
independent of the core-API health endpoint, performed once per minute.

**Per-component status derivation rules:**

- `Database` ← `isDatabaseUp`, `Ldap` ← `isLdapUp`, `Statistics` ←
  `isStatisticsUp`, `VideoMessaging` ← `isVideoMessagingUp`, `Cti` ← `isCtiUp`.
  - `true` ⇒ **up (green)**, `false` ⇒ **down (red)**.
- `core-API`: derived from the **presence of an HTTP response** to `/health`,
  **regardless of the returned status code**:
  - a response received (`200`, `503`, etc.) ⇒ **up (green)**;
  - no response (timeout, network error, unreachable host) ⇒ **down (red)**.
  - Note: the `isServiceApiUp` body field is **not** used for this status; only
    the reachability of the route matters (the route has a known behavior: it can
    return `503` while still being reachable).
- **Important — body present even on a non-200 code**: the endpoint returns the
  components JSON **even with an HTTP error code** (e.g. observed in prod:
  `HTTP 503` with a full body and `isServiceApiUp:false`). The poller must
  therefore **always attempt to parse the body** if present: the 5 other
  components' statuses come from the JSON, and `core-API` is `up` as soon as a
  response has been received.
- **No response** from the REST API (timeout, network error, **no body / no
  response at all**):
  - the 5 components derived from the JSON (Database, Ldap, Statistics,
    VideoMessaging, Cti) ⇒ **unknown (orange)**;
  - **core-API exception** ⇒ **down (red)** (never `unknown`).
- `Connect`: derived from the **HTTP response** of its own URL:
  - `200 OK` ⇒ **up (green)**;
  - any other code, or no response (timeout, network error) ⇒ **down (red)**.

**Global status:**

- **Green (up)**: all components are green.
- **Red (down)**: at least one of the "critical" components — Database, Ldap,
  Cti, core-API — is not green (down or unknown).
- **Orange (degraded)**: otherwise, if Statistics, VideoMessaging or Connect is
  not green.

Precedence: `red > orange > green`. Thus, when there is no REST response,
core-API becomes down ⇒ global status **red**.

**API exposed by the supervision backend (REST + WebSocket for push):**

All routes are scoped to an environment (initially only `preprod`).
**Public** routes require no authentication; **🔒 admin** routes require a valid
admin session/token.

| Method | Route | Auth | Response |
|--------|-------|------|----------|
| `GET` | `/api/environments` | public | List of environments (only `preprod` enabled initially) |
| `GET` | `/api/status?env=preprod` | public | Current status of each component + global status + `checkedAt` |
| `GET` | `/api/components?env=preprod` | public | List of components and their probe config |
| `GET` | `/api/components/:id/history?from=&to=` | public | Status transitions of a component over a range |
| `GET` | `/api/global-status/history?env=preprod&from=&to=` | public | **Global status** transitions over a range |
| `GET` | `/api/health` | public | Liveness/readiness of the supervision service itself |
| `WS` | `/ws/status?env=preprod` | public | Push of the current status on each transition |
| `POST` | `/api/auth/login` | public | Authenticate (`username`+`password`); returns a session cookie / JWT |
| `POST` | `/api/auth/logout` | 🔒 admin | Invalidate the current session |
| `POST` | `/api/admin/password` | 🔒 admin | Change the admin password (`currentPassword`, `newPassword`) |
| `POST` | `/api/components` | 🔒 admin | **Create** a component: label, criticality, probe_type, probe_config, interval, environment |
| `PUT` | `/api/components/:id` | 🔒 admin | **Update** a component |
| `DELETE` | `/api/components/:id` | 🔒 admin | **Delete** a component |

**Authentication mechanism (simple):** the admin logs in via
`POST /api/auth/login`; the backend looks up `admin_user`, verifies the password
with **bcrypt.compare**, and on success issues a short-lived **session** (HTTP-only
cookie) or a signed **JWT**. Admin routes are guarded by a middleware/guard that
rejects unauthenticated requests with `401`. Password change re-hashes the new
value with bcrypt after verifying the current one.

**Role-based history detail (AISB-109).** `GET /api/components/:id/history`
stays public and returns the status transitions (status + timestamp) for the
colored bar graph. The per-transition **`raw_payload`** (the REST API answer) is
**only included when the request is authenticated** as admin; anonymous
responses omit it entirely, so the raw answer is never delivered to the public
client. The frontend therefore only renders the hover tooltip when a payload is
present (i.e. for logged-in admins).

Example `GET /api/status`:

```json
{
  "environment": "preprod",
  "global": "red",
  "checkedAt": "2026-06-25T13:00:00.000Z",
  "components": [
    { "code": "database", "label": "Database", "status": "up" },
    { "code": "core_api", "label": "core-API", "status": "down" }
  ]
}
```

### UI/UX Design

- **Dashboard (simplified — AISB-110)**: a highly visible global status banner
  (green/orange/red), then a compact grid of **component boxes** showing **only
  the component label** over the box's status color — no status text, date or
  other metadata. The layout is **narrower** and lays out **at most 4 components
  per row**. **Clicking a component box opens that component's history.**
- **Real-time refresh**: updates via WebSocket (or fallback polling on
  `/api/status`); a box's color is updated whenever a transition is pushed.
- **Component history detail (AISB-109)**: opened via the "view history" button
  (or by clicking a component box). It renders a **temporal bar graph** whose
  segments are colored by status (green/orange/red).
  - For a **standard / anonymous** user: colors only, **no** raw REST/probe
    answer is shown or sent to the client.
  - For a **logged-in (admin)** user: **hovering a colored bar** shows the
    corresponding **REST API answer** (the stored `raw_payload`) in a **tooltip**.
- **Global status history (AISB-111)**: **clicking the global status box/banner**
  opens the **global status timeline** (global status transitions over time),
  backed by `GET /api/global-status/history`.
- **Public area**: the dashboard, real-time refresh and history/timeline views
  (colors only) are accessible without login. The raw-payload tooltip is
  admin-only.
- **Admin login**: a login form (username/password) gates the admin area. On
  success the session is kept (cookie/JWT); a logout action is available.
- **Configuration (CRUD) — admin only**: a protected view to **add/edit/remove
  components** — label, criticality, probe type, probe parameters (URL, expected
  code…) and **per-component polling interval** — persisted via the API. This is
  the primary way to onboard new autonomous components.
- **Password change — admin only**: a form to change the admin password (current
  + new password), re-hashed server-side with bcrypt.
- **Accessibility**: do not rely on color alone (add an up/down/unknown
  icon/text) for color-blind users.

## Implementation Plan

### Phase 1: Supervision backend (probes + persistence)
- [ ] Initialize the TypeScript project (NestJS) and env-based configuration.
- [ ] Define the `Probe` interface and a probe registry driven by `component`
      rows (`probe_type` + `probe_config`).
- [ ] Implement the initial probe types: `core-api-health` (shared `/health`
      call), `http-reachable` (core-API), `http-status` (Connect) — each with its
      own timeout and isolated error/no-response handling.
- [ ] Implement the status evaluator (aggregates probe results) + global status,
      writing a transition row for **each component** (`status_history`) and for
      the **global status** (`global_status_history`).
- [ ] MariaDB data model (`environment`, `component`, `status_history`,
      `global_status_history`, `admin_user`) + migrations; seed the `preprod`
      environment, its components, and the `admin`/`admin` user (bcrypt hash).
- [ ] Scheduler running each enabled probe on its **per-component interval**.

### Phase 2: API (read + admin: auth + component CRUD)
- [ ] Read (public) endpoints `/api/status`, `/api/components`,
      `/api/environments`, `/api/components/:id/history`,
      `/api/global-status/history`.
- [ ] **Auth**: `POST /api/auth/login` (bcrypt verify → session cookie/JWT),
      `POST /api/auth/logout`, and an admin guard returning `401`.
- [ ] **Admin** endpoints: component CRUD (create/update/delete) and
      `POST /api/admin/password` (change password, re-hash with bcrypt).
- [ ] `/api/health` endpoint (liveness/readiness) of the service.
- [ ] Real-time push via WebSocket `/ws/status`.

### Phase 3: UI
- [ ] Real-time dashboard (global status + component cards) — public.
- [ ] Per-component history view (transitions) with a date filter, plus a
      **global status timeline**.
- [ ] **Admin login** + protected area; **component configuration (CRUD)** view
      (add/edit/remove components, probe type & parameters, per-component
      interval) and **password change** form.
- [ ] WebSocket integration + polling fallback, loading/error state handling.

### Phase 4: Containerization & deployment
- [ ] Backend `Dockerfile` + UI build (multi-stage).
- [ ] `docker-compose.yml`: supervision service + MariaDB + persistent volume.
- [ ] Documented environment variables (DB access, base settings). Component and
      probe configuration lives in the database (managed via the UI), not in env vars.

### Phase 5: Display refinements (AISB-109 / AISB-110 / AISB-111)
- [ ] **AISB-110** — Simplify the main dashboard: each component box shows only
      its label over the status color; remove status text/date/extra metadata;
      narrow the layout to **≤ 4 components per row**; make the whole box
      clickable to open that component's history.
- [ ] **AISB-109** — Rework the component history detail into a **temporal bar
      graph** colored by status; expose the raw `raw_payload` only to
      authenticated requests and render an **on-hover tooltip** with the REST API
      answer for logged-in admins only.
- [ ] **AISB-111** — Make the **global status box clickable** to open the global
      status history, wired to the existing `GET /api/global-status/history`.

## Testing Strategy

- **Unit tests**: status evaluator (all per-component combinations and global
  status rules, including the "no response" case and core-API reachable on a
  non-200 code) and **transition detection** (a row is written only on change),
  for both per-component and **global** status.
- **Integration tests**: scheduler ↔ MariaDB (transition persistence), component
  **CRUD** endpoints, **auth** (login success/failure, admin guard `401`, password
  change re-hash), probe clients (with a mock returning
  200 / 503-with-body / timeout-no-response).
- **E2E tests**: public flow (status display, refresh, history) and admin flow
  (login, add a component via the config UI, change password).
- **Security tests**: passwords stored only as bcrypt hashes; admin routes
  unreachable without a valid session; **`GET /api/components/:id/history`
  omits `raw_payload` for anonymous requests and includes it only for
  authenticated admins (AISB-109)**.
- **UI tests (AISB-109/110/111)**: dashboard renders each component box with the
  label only and at most 4 per row (AISB-110); clicking a component box opens its
  history; the history detail renders a colored bar graph; the raw-answer tooltip
  appears on hover **only when authenticated** and is absent for anonymous users
  (AISB-109); clicking the global status box opens the global status history
  (AISB-111).
- **Performance tests**: pagination of history/transition queries.

## Rollout Plan

- **Initial build targets preprod only.** Deploy via `docker compose` in preprod,
  with only the `preprod` environment enabled, and validate over a few days.
- Multi-environment support is built into the model; enabling **prod** later is a
  configuration/onboarding step (add the `prod` environment and its components),
  not a redesign.
- Packaging compliant with IVES conventions if needed (RPM `*.spec` /
  `ives-*` macros) for integration into the existing deployment pipeline.

## Metrics & Success Criteria

- The current status of the 7 components and the global status are visible and
  correct.
- Status **transitions** are persisted and consultable as a per-component
  timeline, **and the global status transitions are persisted** as their own
  timeline.
- The delay between a real state change and its UI display is ≤ the component's
  configured interval (default ≤ 60 s).
- Availability of the supervision service itself ≥ 99% over the pilot period.

## Dependencies

- Availability and stability of the core-API `/health` API contract.
- Availability of the `Connect` URL used as a health probe.
- MariaDB provisioned (container or dedicated instance) with a persistent volume.
- A Docker host for deployment.
- `bcrypt` library (e.g. `bcrypt`/`bcryptjs`) for admin password hashing.
- Network access allowed from the supervision service to the health endpoint and
  the `Connect` URL.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Unversioned change of the `/health` contract | High | Medium | Validate the payload, log `raw_payload`, contract tests |
| Unbounded history growth (no purge in this version) | Medium | Medium | Transitions-only storage keeps volume low; add a retention policy later |
| Default admin password left unchanged (`admin`/`admin`) | Medium | High | Prompt to change on first login; passwords stored as bcrypt hashes; document the requirement |
| Public dashboard exposes status data | Low | High | Read-only by design; only the admin area is authenticated |
| False "unknown" due to network latency | Medium | Medium | Suitable timeout + optional short retry before concluding `unknown` |
| Health endpoint reachable but erroring (503 with body) | Medium | High | core-API ⇒ up (route reachable), components read from the JSON body; clear display |
| Health endpoint unreachable (no response) | Medium | Medium | core-API ⇒ down, other components ⇒ unknown; clear display |

## Design Decisions (resolved)

These were previously open questions; they are now decided:

- **History storage = transitions only.** A row is written only when a component's
  status **changes** (transition), not on every minute reading. This bounds the
  data volume and naturally yields the timeline.
- **No history cleanup/retention for now.** No purge job in this version; a
  retention policy may be added later.
- **Public dashboard, protected admin.** The supervision **dashboard/history is
  public** (read-only, no login). The **admin/configuration area** (component
  CRUD, password change) is **protected by a username/password** stored in the
  database. Initial credentials: user `admin`, password `admin`, changeable from
  the admin UI.
- **Multi-environment: designed for, preprod-first.** The data model and probes
  account for multiple environments (preprod/prod), but for the initial build we
  work **only on preprod**.
- **Polling interval is per component/route** (configurable), not a single global
  value.
- **Component configuration via the UI.** Components and their probes are managed
  through the UI (CRUD), persisted in the database.

> `core-API` rule clarified: **route reachable (any HTTP code) ⇒ up**, **no
> response ⇒ down** (never `unknown`). The `isServiceApiUp` field is not used.

## Open Questions

These items come from the AISB-109/110/111 refinement batch and need
confirmation before/while implementing:

- [x] **AISB-110 — "only the label" (confirmed 2026-06-25):** the component box
      **keeps its status color** (the color is the core signal); only the textual
      metadata (status text, last-transition date, criticality) is removed. So a
      box = colored background + label only.
- [x] **AISB-110 — "no more than 4 components" (confirmed 2026-06-25):** means
      **≤ 4 components per row**; extra components wrap to following rows. It is
      not a hard cap of 4 components total.
- [x] **AISB-109 — "standard user" (confirmed 2026-06-25):** means an
      **anonymous / not logged-in** user. There is no intermediate non-admin
      authenticated role: the raw REST answer tooltip is reserved for
      authenticated admins, everyone else sees colors only.
- [ ] **AISB-109 — content of the tooltip:** assumed to be the stored
      `raw_payload` of the relevant transition. Confirm whether the tooltip
      should show the full raw JSON or a formatted subset.

## References

- `docs\INPUTS.txt` — source requirements.
- `..\..\accelerator-resources\SPEC_TEMPLATE.md` — specification template.
- Jira **AISB-109** (Story, *US - History detail design*):
  https://ives-group.atlassian.net/browse/AISB-109
- Jira **AISB-110** (Story, *US - Simplification du design de la page
  principale*): https://ives-group.atlassian.net/browse/AISB-110
- Jira **AISB-111** (Bug, *There is no history for the global status*):
  https://ives-group.atlassian.net/browse/AISB-111
- Parent epic **AISB-62** (*Supervision 1.0.0*):
  https://ives-group.atlassian.net/browse/AISB-62
- Health endpoint: `https://core-api.elioz.fr/health` (prod, reachable) /
  `https://core-api-preprod.elioz.fr/health` (preprod). NB: returns the JSON body
  even with an HTTP code ≠ 200 (503 observed in prod).
- Connect health probe:
  `https://connect-preprod.elioz.fr/2.0.0-5/index.php?hash=220d54f7e118460a573a3a940d46b5fd`
  (`200 OK` ⇒ up, otherwise down).
- IVES packaging conventions (`eliozconnect.spec`, `ives-*` macros).
