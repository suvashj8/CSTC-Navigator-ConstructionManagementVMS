# Linux server deployment (ports 5000 + 6000)

Use this when the server already runs other projects and common ports are taken
(`:80`, `:5432`, `:5173`, etc.). Navigator VMS uses **only**:

| Port | Service | Who uses it |
|------|---------|-------------|
| **5000** | Web UI (nginx) | **Clients** — open this in the browser |
| **6000** | Next.js API | Direct API / health / mobile apps |

Postgres and Redis run **inside Docker only** (no host ports), so they do not conflict with an existing Postgres on `:5432`.

## Architecture

```
Client browser  →  :5000  frontend (nginx)
                         ├── /        → React app
                         └── /api/*   → web:3000 (internal)

Mobile / tools  →  :6000  web (Next.js API)
```

Browsers should use **port 5000** only. The UI proxies `/api` to the API container automatically.

## Prerequisites

- Linux server with Docker and Docker Compose v2
- Ports **5000** and **6000** free (check: `ss -tulnp | grep -E '5000|6000'`)
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
curl -s http://localhost:5000/health
curl -s http://localhost:6000/health
```

Open from any LAN client:

- **http://YOUR_SERVER_IP:5000**
- Or **http://your-domain:5000** (if DNS points to the server)

## Demo login

| Role | Email | Password | Subdomain |
|------|-------|----------|-----------|
| Tenant admin | `admin@vms.local` | `admin123` | `demo` |
| Manager | `manager@vms.local` | `manager123` | `demo` |

Platform console: **http://YOUR_SERVER_IP:5000/platform/login** — `super@vms.local` / `super123`

## Domain + LAN

1. Point DNS (or `/etc/hosts` on clients) to the server IP.
2. Add every client URL to `CORS_ORIGINS` in `deploy/linux.env`, e.g.:

   ```env
   CORS_ORIGINS=http://192.168.1.50:5000,http://navigator.cstc.local:5000
   ```

3. Restart API after env changes:

   ```bash
   docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up -d --build web
   ```

## Firewall (Ubuntu)

```bash
sudo ufw allow 5000/tcp comment 'Navigator VMS UI'
sudo ufw allow 6000/tcp comment 'Navigator VMS API'
```

## Updates

```bash
git pull
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env up --build -d
```

## Production checklist

- [ ] Change `POSTGRES_PASSWORD` and `JWT_SECRET` in `deploy/linux.env`
- [ ] Set `SEED_ON_STARTUP=false` after first successful login
- [ ] `deploy/linux.env` is **not** committed (add to `.gitignore` if needed)
- [ ] Back up volume `vms_pg` periodically

## Stop / remove

```bash
docker compose -f docker-compose.linux.yml --env-file deploy/linux.env down
# data kept in volume vms_pg
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port already in use | `ss -tulnp \| grep 5000` — stop conflicting service or change `VMS_UI_PORT` |
| Login 500 | Rebuild: `docker compose ... up --build -d` |
| CORS error in browser | Add exact origin (with port) to `CORS_ORIGINS` and restart `web` |
| API works on :6000 but UI fails | Check `docker compose logs frontend` — nginx must reach `backend:3000` |
