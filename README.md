# CSTC Navigator — Construction Management VMS

**Vehicle Management System** for construction sites. Multi-tenant fleet tracking, site operations, allocations, insurance, suppliers, fuel logs, maintenance work orders, notifications, and report exports — web, PWA, and mobile (Android/iOS).

---

## Repository

| Item | Value |
|------|-------|
| **GitHub** | [suvashj8/CSTC-Navigator-ConstructionManagementVMS](https://github.com/suvashj8/CSTC-Navigator-ConstructionManagementVMS) |
| **API** | Next.js 15 (App Router) — **no Go backend** |
| **UI** | React + Vite + Capacitor |
| **Data** | PostgreSQL (main + per-tenant DBs) |
| **License** | Private / internal CSTC project |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  frontend/  React + Vite + Capacitor  (:5173)               │
│  Dashboard, fleet, operations, platform console, PWA/mobile │
└───────────────────────────┬─────────────────────────────────┘
                            │  /api/v1/*  (proxied in dev)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  web/  Next.js 15 API  (:3000)                            │
│  Auth · multi-tenant CRUD · reports · notifications       │
│  instrumentation.ts → migrations + optional demo seed     │
└───────────────┬─────────────────────────┬─────────────────┘
                │                         │
                ▼                         ▼
        PostgreSQL (:15432 host)   Node worker (cron)
        vms_main + vms_tenant_*    Daily expiry scans
```

| Service | Port | Role |
|---------|------|------|
| Frontend UI | `5173` | Tenant & platform console |
| Next.js API | `3000` | All `/api/v1/*` + `/health` |
| PostgreSQL (Docker dev) | `15432` | Main registry + tenant DBs on host ([`5432` inside container]) |
| Redis | `6379` | Optional (health check) |

The Vite dev server proxies `/api` to Next.js on port **3000** by default. In production, set `VITE_API_URL` to your deployed Next.js host.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Postgres, Redis, API, worker)
- Git

### 1. Clone & install

```powershell
git clone https://github.com/suvashj8/CSTC-Navigator-ConstructionManagementVMS.git
cd CSTC-Navigator-ConstructionManagementVMS

npm install
npm run install:all
```

### 2. Environment

```powershell
copy web\.env.example web\.env.local
```

Key variables (`web/.env.local`):

| Variable | Purpose |
|----------|---------|
| `MAIN_DB_*` | Platform registry database (`MAIN_DB_PORT=15432` for local Docker) |
| `JWT_SECRET` | HS256 token signing (change in production) |
| `SEED_ON_STARTUP` | `true` seeds demo tenant on first API start |
| `EXPORT_DIR` | Report export files directory |

Optional frontend (`frontend/.env.development`):

```env
VITE_USE_MOCK=false
VITE_API_URL=
```

### 3. Run

**Docker Desktop must be running** for `docker:up` and `dev:full`.

```powershell
npm run dev:full:host
```

| Command | Description |
|---------|-------------|
| `npm run dev:full:host` | **Recommended** — DB + seed + API + UI (LAN-friendly) |
| `npm run dev:full` | Same stack, localhost only |
| `npm run dev:next` | Same as `dev:full` |
| `npm run docker:infra` | Start Postgres + Redis only (port **15432**) |
| `npm run seed` | Reset all demo accounts (admin, manager, driver, etc.) |
| `npm run doctor` | Diagnose DB port, demo tenant, and API |
| `npm run docker:reseed` | `docker:infra` + wait + `seed` |
| `npm run dev` / `dev:host` | UI only — **no API** (login will fail) |
| `npm run docker:up` | Full Docker stack (API + worker + DB) |
| `npm run docker:down` | Stop all containers |
| `npm run build` | Production build (frontend + API) |

Open **http://localhost:5173** · API health: **http://localhost:3000/health**

**LAN / phone testing:** `npm run dev:full:host` — open the **Network** URL Vite prints (e.g. `http://192.168.x.x:5173`). Docker Desktop must be running first.

**Login fails or `password authentication failed for user vms`?** Your PC likely has **another Postgres on port 5432**. VMS uses Docker Postgres on host port **15432**. From the repo root:

```powershell
npm run doctor
npm run docker:infra
npm run seed
npm run dev:full:host
```

Do **not** use UI-only `npm run dev:host`. Subdomain: `demo`. Tap a role on the login page to auto-fill.

> **After pulling updates:** run `npm run docker:up` (rebuilds API image). If login returns **500**, an old Docker image may still be proxying to the removed Go backend — run `docker compose down && docker compose up --build --remove-orphans -d`.

### Demo accounts

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| Super user | `super@vms.local` | `super123` | — (`/platform/login`) |
| Tenant admin | `admin@vms.local` | `admin123` | `demo` |
| Manager | `manager@vms.local` | `manager123` | `demo` |
| Supervisor | `supervisor@vms.local` | `super123` | `demo` |
| Employee | `employee@vms.local` | `employee123` | `demo` |
| Driver | `driver@vms.local` | `driver123` | `demo` |

---

## Project structure

```
CSTC-Navigator-ConstructionManagementVMS/
├── frontend/              React SPA + Capacitor (Android/iOS)
├── web/                   Next.js API — single backend for all routes
│   ├── sql/               PostgreSQL migrations (main + tenant)
│   ├── scripts/           Expiry scan worker (node-cron)
│   ├── instrumentation.ts Startup migrations + seed
│   └── src/
│       ├── app/api/v1/    Catch-all API dispatcher
│       └── lib/           Auth, tenant manager, handlers, reports
├── scripts/               Docker check, dev helpers
├── docker-compose.yml     Postgres, Redis, web, worker
└── package.json           Root run scripts
```

---

## Features

### API (Next.js)

- **Multi-tenant** — database-per-tenant with main registry DB
- **JWT auth** — tenant login, platform super-user, tenant impersonation
- **Platform** — tenant provisioning, suspend/activate, expiry scan trigger
- **Tenant CRUD** — assets, allocations, locations, users, drivers, insurance, suppliers, fuel logs, maintenance
- **Dashboard** — fleet stats, expiring insurance/licenses, overdue returns
- **Reports** — sync export (`json`, `xlsx`, simplified `pdf`)
- **Notifications** — in-app list + mark read
- **Background worker** — daily expiry scans at 06:00 UTC

### Frontend

- Dashboard, fleet assets, allocations, locations, insurance, suppliers
- **Operations** — fuel logs (km/L insights), maintenance work orders
- **Platform console** — `/platform/login` → tenant management
- Mobile-friendly UI, PWA, Capacitor (`frontend/MOBILE.md`)

---

## API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Postgres + Redis health |
| POST | `/api/v1/auth/login` | Tenant login (`X-Tenant-Subdomain`) |
| POST | `/api/v1/platform/auth/login` | Super-user login |
| GET | `/api/v1/platform/tenants` | List tenants |
| POST | `/api/v1/platform/tenants` | Provision tenant + database |
| PUT | `/api/v1/platform/tenants/:id/status` | Suspend / activate |
| POST | `/api/v1/platform/tenants/:id/switch` | Impersonate tenant |
| GET | `/api/v1/dashboard/stats` | Dashboard aggregates |
| GET/POST/PUT/DELETE | `/api/v1/assets` | Fleet assets |
| GET/POST/PUT | `/api/v1/allocations` | Allocation workflow |
| GET/POST/PUT | `/api/v1/locations` | Work locations |
| GET/POST/PUT | `/api/v1/users` | Tenant users (admin) |
| GET/POST/PUT | `/api/v1/drivers` | Driver profiles |
| GET/POST/PUT | `/api/v1/insurance` | Insurance policies |
| GET/POST/PUT | `/api/v1/suppliers` | Suppliers |
| GET/POST/PUT/DELETE | `/api/v1/fuel-logs` | Fuel logs |
| GET/POST/PUT/DELETE | `/api/v1/maintenance` | Maintenance work orders |
| GET/PUT | `/api/v1/notifications` | Notifications |
| POST/GET | `/api/v1/reports/jobs` | Report jobs |
| GET | `/api/v1/reports/jobs/:id/download` | Download export |

List endpoints support `page` and `per_page` query parameters.

See `web/README.md` for API-specific environment and worker details.

---

## Docker (production-like)

```bash
docker compose up --build
```

Services: **postgres**, **redis**, **web** (Next.js API on `:3000`), **worker** (expiry cron).

### Linux server (ports 5000 + 6000)

When the host already uses `:80`, `:5432`, `:5173`, etc., deploy with dedicated client ports:

| Port | Service |
|------|---------|
| **5000** | Web UI (what clients open in the browser) |
| **6000** | API (direct access / health / mobile) |

Postgres and Redis stay internal (no host ports). Full guide: **[deploy/LINUX.md](deploy/LINUX.md)**

```bash
cp deploy/linux.env.example deploy/linux.env
# edit deploy/linux.env — passwords, domain, CORS_ORIGINS
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up --build -d
```

---

## Mobile builds

```bash
cd frontend
npm run cap:sync
npm run cap:android   # Windows / Linux
npm run cap:ios       # macOS + Xcode
```

Set `VITE_API_URL=https://your-api.example.com` for device builds.

---

## Development workflow

```powershell
git checkout -b feature/your-change
# make changes
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change
```

Open a pull request on GitHub against `main`.

---

## Security notes

- **Never commit** `.env` or `.env.local` — use `web/.env.example`
- Change `JWT_SECRET` and database passwords in production
- Set `SEED_ON_STARTUP=false` after initial provisioning in production

---

## Changelog

### UI, ops, and deployment (latest)

- Asset operations for all asset types; fuel log white-screen fix; horizontal dialog forms
- Nepal (NPT) date formatting for allocations, drivers, and insurance
- Dev Postgres on host port **15432** (avoids conflict with other Postgres on `:5432`)
- `npm run doctor`, `npm run seed`, `docker-compose.linux.yml` (client ports **5000** / **6000**)
- Demo login auto-seed on first sign-in; driver role sees dashboard, fleet, allocations
- LAN dev via `npm run dev:full:host` with CORS for `192.168.x.x`

### Next.js-only backend

- Removed Go API and worker (`backend/` deleted)
- All `/api/v1/*` routes implemented in `web/` via Next.js App Router
- SQL migrations moved to `web/sql/`
- Node worker replaces Go asynq for expiry scans
- Default dev stack: Next.js `:3000` + Vite `:5173`

---

## Support

Internal CSTC Navigator project. Report issues on [GitHub Issues](https://github.com/suvashj8/CSTC-Navigator-ConstructionManagementVMS/issues).
