# Navigator VMS — Next.js API Gateway

Client-facing API layer built with **Next.js 15 App Router**. The React (Vite) frontend and Capacitor mobile apps call `/api/v1/*` through this service.

## Architecture

```
Mobile / PWA (Vite)  →  Next.js :3000  →  Go services :8080 (legacy routes)
                      ↘  PostgreSQL (fuel-logs, maintenance — native Next handlers)
```

- **Implemented in Next.js:** `fuel-logs`, `maintenance` (work orders only)
- **Proxied to Go (during migration):** auth, assets, allocations, users, reports, etc.

Set `API_PORT=3000` in the Vite dev server (or `VITE_API_URL`) so the UI talks to Next.js instead of Go directly.

## Local development

```powershell
# Terminal 1 — data + Go worker/API
docker compose up -d postgres redis backend worker

# Terminal 2 — Next.js API gateway
cd web
npm install
npm run dev

# Terminal 3 — frontend (proxy to Next.js)
cd frontend
$env:API_PORT="3000"
npm run dev
```

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `GO_API_URL` | `http://localhost:8080` | Upstream Go API for proxied routes |
| `JWT_SECRET` | (required for native handlers) | Must match Go `JWT_SECRET` |
| `MAIN_DB_*` | postgres docker defaults | Main DB for tenant resolution |

## Migration plan

1. ✅ Fuel logs + maintenance work orders (no PM schedules / inspections)
2. Move auth + tenant middleware fully into Next.js
3. Port remaining CRUD routes from Go; retire Go HTTP server when complete
