# Linux server deployment (ports 7000 + 7001)

Use this when the server already runs other projects and common ports are taken.
Navigator VMS uses **only**:

| Port | Service | Who uses it |
|------|---------|-------------|
| **7000** | Web UI (nginx) | **Clients** — open this in the browser |
| **7001** | Next.js API | Direct API / health / mobile apps |

Postgres and Redis run **inside Docker only** (no host ports).

## Architecture

```
Client browser  →  :7000  frontend (nginx)
                         ├── /        → React app
                         └── /api/*   → web:3000 (internal)

Mobile / tools  →  :7001  web (Next.js API)
```

Browsers should use **port 7000** only. The UI proxies `/api` to the API container automatically.

## Prerequisites

- Linux server with Docker and Docker Compose v2
- Ports **7000** and **7001** free (check: `ss -tulnp | grep -E '7000|7001'`)
- Git

## Deploy

```bash
git clone https://github.com/suvashj8/CSTC-Navigator-ConstructionManagementVMS.git
cd CSTC-Navigator-ConstructionManagementVMS

cp deploy/linux.env.example deploy/linux.env
nano deploy/linux.env   # set passwords, JWT_SECRET, CORS_ORIGINS, your IP/domain
```

Start:

```bash
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up --build -d
```

Verify:

```bash
docker compose -f docker-compose.linux.yml ps
curl -s http://localhost:7000/health
curl -s http://localhost:7001/health
```

Open from any LAN client:

- **http://YOUR_SERVER_IP:7000**
- Or **http://your-domain:7000** (if DNS points to the server)

## Demo login

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| Tenant admin | `admin@vms.local` | `admin123` | `demo` |
| Manager | `manager@vms.local` | `manager123` | `demo` |

Platform console: **http://YOUR_SERVER_IP:7000/platform/login** — `super@vms.local` / `super123`

## Domain + LAN

1. Point DNS (or `/etc/hosts` on clients) to the server IP.
2. Add every client URL to `CORS_ORIGINS` in `deploy/linux.env`, e.g.:

   ```env
   CORS_ORIGINS=http://192.168.1.50:7000,http://navigator.cstc.local:7000
   ```

3. Restart API after env changes:

   ```bash
   docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up -d --build web
   ```

## Operations

```bash
# Logs
docker compose -f docker-compose.linux.yml logs -f web frontend

# Stop
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env down

# Update
git pull
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up --build -d
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port already in use | `ss -tulnp \| grep 7000` — stop conflicting service or change `VMS_UI_PORT` |
| Login fails | Check `SEED_ON_STARTUP=true` on first run; verify `docker compose logs web` |
| API works on :7001 but UI fails | Check `docker compose logs frontend` — nginx must reach `backend:3000` |
