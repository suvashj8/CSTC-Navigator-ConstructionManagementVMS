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
        PostgreSQL (:5432)         Node worker (cron)
        vms_main + vms_tenant_*    Daily expiry scans
```

| Service | Port | Role |
|---------|------|------|
| Frontend UI | `5173` | Tenant & platform console |
| Next.js API | `3000` | All `/api/v1/*` + `/health` |
| PostgreSQL | `5432` | Main registry + tenant databases |
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
| `MAIN_DB_*` | Platform registry database |
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
npm run dev:full
```

| Command | Description |
|---------|-------------|
| `npm run dev:full` | Docker (Postgres, Redis, API, worker) + UI |
| `npm run dev:next` | Same as `dev:full` |
| `npm run dev` | UI only — run `npm run docker:up` separately |
| `npm run dev:host` | UI on LAN for mobile device testing |
| `npm run docker:up` | Postgres, Redis, Next.js API, expiry worker |
| `npm run docker:down` | Stop all containers |
| `npm run build` | Production build (frontend + API) |

Open **http://localhost:5173** · API health: **http://localhost:3000/health**

> **After pulling updates:** run `npm run docker:up` (rebuilds API image). If login returns **500**, an old Docker image may still be proxying to the removed Go backend — run `docker compose down && docker compose up --build --remove-orphans -d`.

### Demo accounts

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| Super user | `super@vms.local` | `super123` | — (`/platform/login`) |
| Tenant admin | `admin@vms.local` | `admin123` | `demo` |
| Manager | `manager@vms.local` | `manager123` | `demo` |
| Supervisor | `supervisor@vms.local` | `super123` | `demo` |
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

### Next.js-only backend (current)

- Removed Go API and worker (`backend/` deleted)
- All `/api/v1/*` routes implemented in `web/` via Next.js App Router
- SQL migrations moved to `web/sql/`
- Node worker replaces Go asynq for expiry scans
- Default dev stack: Next.js `:3000` + Vite `:5173`

---

## Support

Internal CSTC Navigator project. Report issues on [GitHub Issues](https://github.com/suvashj8/CSTC-Navigator-ConstructionManagementVMS/issues).
