# Supervision UI

Supervision UI is a monorepo containing:

- `backend/` — NestJS + TypeScript API, scheduler, probes, WebSocket gateway, migrations, and seed logic
- `frontend/` — React + Vite + TypeScript dashboard and admin UI
- `docker-compose.yml` — MariaDB, backend, and frontend stack

## Features

- Public dashboard with live component and global status
- Transition-only history persistence for components and global environment status
- Dynamic per-component scheduler that picks up CRUD changes without restart
- Cookie-based JWT authentication for admin operations
- Realtime WebSocket updates on status transitions

## Seeded defaults

On startup the backend runs migrations and an idempotent seed:

- Environment: `preprod`
- 7 components wired to the required probes
- Admin user:
  - username: `admin`
  - password: `admin`

## Local development

### Backend

```bash
cd backend
npm install
npm run build
```

Environment variables are documented in `backend/.env.example`.

### Frontend

```bash
cd frontend
npm install
npm run build
```

The frontend uses `VITE_API_URL` when provided, otherwise it targets the same origin.

## Docker

At the repository root:

```bash
docker compose up --build
```

The stack exposes:

- Frontend: `http://localhost`
- Backend API: `http://localhost:3000/api`
- MariaDB: `localhost:3306`

## Public API

- `GET /api/environments`
- `GET /api/status?env=preprod`
- `GET /api/components?env=preprod`
- `GET /api/components/:id/history?from=&to=`
- `GET /api/global-status/history?env=preprod&from=&to=`
- `GET /api/health`
- WebSocket namespace: `/ws/status?env=preprod`

## Admin API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/admin/password`
- `POST /api/components`
- `PUT /api/components/:id`
- `DELETE /api/components/:id`
