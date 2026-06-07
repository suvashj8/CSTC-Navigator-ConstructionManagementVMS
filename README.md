# CSTC Navigator — Construction Management VMS

**Vehicle Management System** for construction sites. Multi-tenant fleet tracking, site operations, allocations, insurance, suppliers, fuel logs, maintenance work orders, notifications, and report exports — web, PWA, and mobile (Android/iOS).

---

## Repository

| Item | Value |
|------|-------|
| **GitHub** | [CSTC-Navigator-ConstructionManagementVMS](https://github.com) *(update URL after first push)* |
| **Stack** | Go · PostgreSQL · Redis · React · Next.js · Capacitor |
| **License** | Private / internal CSTC project |

---

## Architecture

```
frontend/     React + Vite + TypeScript + Capacitor (web, PWA, Android, iOS)
web/          Next.js 15 API gateway (fuel & maintenance native; rest proxied to Go)
backend/      Go (Gin) + PostgreSQL (main + per-tenant DBs) + Redis + asynq worker
```

| Service | Port | Role |
|---------|------|------|
| Frontend UI | `5173` | Tenant & platform console |
| Go API | `8080` | Core REST API |
| Next.js gateway | `3000` | Client-facing API (recommended for production) |
| PostgreSQL | `5432` | Main + tenant databases |
| Redis | `6379` | Queues & caching |

Use **Next.js on port 3000** as the API entry point in production. Set `API_PORT=3000` when running the Vite dev server, or point `VITE_API_URL` at your deployed Next.js host.

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Go](https://go.dev/) 1.22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres, Redis, backend)
- Git

### 1. Clone & install

```powershell
git clone https://github.com/YOUR_USERNAME/CSTC-Navigator-ConstructionManagementVMS.git
cd CSTC-Navigator-ConstructionManagementVMS

npm install
npm run install:all
```

### 2. Environment files

```powershell
copy backend\.env.example backend\.env
```

Optional frontend config (`frontend/.env.development`):

```env
VITE_USE_MOCK=false
VITE_API_URL=
```

### 3. Run (recommended — full stack)

**Docker Desktop must be running** before `docker:up` or `dev:full`.

```powershell
npm run dev:full
```

| Command | Description |
|---------|-------------|
| `npm run dev` | UI only (`:5173`) — start Docker separately with `npm run docker:up` |
| `npm run dev:full` | Docker (Postgres, Redis, API, worker) + UI |
| `npm run dev:next` | Docker + Next.js gateway (`:3000`) + UI |
| `npm run dev:host` | UI on LAN (mobile testing) |
| `npm run docker:up` | Start Postgres, Redis, backend, worker |
| `npm run docker:down` | Stop containers |

Windows shortcut: `.\scripts\dev.ps1`

Open **http://localhost:5173** and sign in with subdomain **`demo`**.

### Demo accounts

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| Super user | `super@vms.local` | `super123` | — (platform login) |
| Tenant admin | `admin@vms.local` | `admin123` | `demo` |

---

## Project structure

```
CSTC-Navigator-ConstructionManagementVMS/
├── backend/           Go API, migrations, worker, smoke tests
│   ├── cmd/server/    HTTP server entrypoint
│   ├── cmd/worker/    asynq background jobs
│   └── pkg/migrate/   SQL migrations (main + tenant)
├── frontend/          React SPA + Capacitor mobile shells
├── web/               Next.js API gateway
├── scripts/           Dev helpers (PowerShell, Docker check)
├── docker-compose.yml Infrastructure & services
└── package.json       Root run scripts
```

---

## Features

### Backend (Go)

- **Multi-tenant** — database-per-tenant with main registry DB
- **JWT auth** — tenant login + platform super-user login
- **Platform API** — tenants, suspend/activate, impersonate
- **Tenant API** — assets, allocations, locations, users, drivers, insurance, suppliers, fuel logs, maintenance work orders, dashboard, notifications
- **Async jobs** — report export (PDF/Excel) and notification delivery via asynq + Redis
- **Expiry scans** — daily insurance/license/overdue allocation checks (worker cron 06:00 UTC)

### Frontend

- Dashboard, fleet assets, allocations, locations, insurance, suppliers
- **Operations** — fuel logs (km/L insights), maintenance work orders
- **Platform console** — `/platform/login` → tenant management
- Mobile-friendly UI, PWA, Capacitor Android/iOS (`frontend/MOBILE.md`)
- Report export with native share sheet on mobile

---

## Manual setup (without root scripts)

### Infrastructure

```bash
docker compose up -d postgres redis
```

### Backend + worker

```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/server
```

Second terminal:

```bash
cd backend
go run ./cmd/worker
```

API: http://localhost:8080 · Health: http://localhost:8080/health

### Next.js gateway

```bash
cd web
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Docker (all services)

```bash
docker compose up --build
```

Runs Postgres, Redis, Go API (`8080`), and the asynq worker. Add the `web` service for the Next.js gateway.

---

## API highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Tenant login (`X-Tenant-Subdomain` header) |
| POST | `/api/v1/platform/auth/login` | Super-user login |
| GET | `/api/v1/platform/tenants` | List tenants |
| POST | `/api/v1/platform/tenants` | Provision tenant + DB |
| POST | `/api/v1/platform/tenants/:id/switch` | Impersonate tenant |
| GET/POST | `/api/v1/fuel-logs` | Fuel log list & create |
| GET/POST | `/api/v1/maintenance` | Maintenance work orders |
| POST | `/api/v1/reports/jobs` | Start async report (`json` / `pdf` / `xlsx`) |
| GET | `/api/v1/reports/jobs/:id/download` | Download export |

List endpoints support SQL pagination via `page` and `per_page` query parameters.

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

## Smoke test

With the Docker stack running:

```powershell
cd backend
go run ./cmd/smoke
```

Or:

```powershell
.\backend\scripts\smoke.ps1
```

Verifies health, auth, dashboard, pagination, CRUD, report jobs, platform login, and expiry scan enqueue.

---

## Contributing & push workflow

```powershell
git checkout -b feature/your-change
# ... make changes ...
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change
```

Open a pull request on GitHub against `main`.

---

## Security notes

- **Never commit** `.env` files — use `.env.example` as templates
- Change `JWT_SECRET` and database passwords in production
- Set `SEED_ON_STARTUP=false` in production after initial provisioning

---

## Support

Internal CSTC Navigator project. For issues, use GitHub Issues on this repository.
