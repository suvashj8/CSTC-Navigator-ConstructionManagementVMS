# Navigator VMS — Next.js API

Full REST API for Navigator VMS. All `/api/v1/*` routes are handled here (no Go proxy).

## Architecture

```
Mobile / PWA (Vite)  →  Next.js :3000  →  PostgreSQL (main + tenant DBs)
                                    ↘  Redis (optional health check)
Expiry worker (node-cron)  →  PostgreSQL
```

## Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

API: http://localhost:3000  
Health: http://localhost:3000/health

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `MAIN_DB_*` | localhost/vms | Platform registry database |
| `JWT_SECRET` | (dev default) | HS256 signing secret |
| `SEED_ON_STARTUP` | `false` | Run demo seed on server start |
| `EXPORT_DIR` | `./exports` | Report file output directory |
| `REDIS_ADDR` | — | Optional Redis for health checks |
| `CORS_ORIGINS` | localhost:5173 | Comma-separated allowed origins |

## Worker

Daily expiry scan (06:00 UTC):

```bash
npm run worker
```

## Production

```bash
npm run build
npm start
```

Docker: see root `docker-compose.yml` (`web` + `worker` services).
