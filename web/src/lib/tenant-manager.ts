import { Pool, PoolConfig } from "pg";
import bcrypt from "bcryptjs";
import { getMainPool } from "./db";
import { mainUp, tenantUp } from "./migrate";

export type TenantInfo = {
  id: string;
  subdomain: string;
  dbName: string;
  name: string;
  connUrl: string;
};

interface CachedPool {
  pool: Pool;
  createdAt: number;
  lastUsed: number;
}

const pools = new Map<string, CachedPool>();
let ensureReadyInflight: Promise<void> | null = null;

const POOL_MAX_AGE_MS = 30 * 60 * 1000;
const POOL_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const POOL_HEALTH_CHECK_INTERVAL_MS = 60 * 1000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startPoolCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [tenantId, cached] of pools.entries()) {
      const age = now - cached.createdAt;
      const idle = now - cached.lastUsed;
      if (age > POOL_MAX_AGE_MS || idle > POOL_IDLE_TIMEOUT_MS) {
        void cached.pool.end().catch(() => {});
        pools.delete(tenantId);
      }
    }
  }, POOL_HEALTH_CHECK_INTERVAL_MS);
  cleanupInterval.unref?.();
}

function stopPoolCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

function clearTenantPoolCache(): void {
  stopPoolCleanup();
  for (const cached of pools.values()) {
    void cached.pool.end().catch(() => {});
  }
  pools.clear();
}

export function shutdownPools(): void {
  clearTenantPoolCache();
}

async function healthCheckPool(pool: Pool): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

function dbConfig() {
  return {
    host: process.env.MAIN_DB_HOST ?? "localhost",
    port: process.env.MAIN_DB_PORT ?? "5432",
    user: process.env.MAIN_DB_USER ?? "vms",
    password: process.env.MAIN_DB_PASSWORD ?? "vms",
  };
}

function buildConnUrl(host: string, port: number, user: string, pass: string, database: string): string {
  return `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/${database}`;
}

/**
 * Tenant DBs always live on the same Postgres as the main registry.
 * Use runtime MAIN_DB_HOST/PORT — never stale rows from host-vs-Docker switches
 * (e.g. localhost:5432 vs host.docker.internal:5432 from Docker API).
 */
function resolveTenantDbEndpoint(
  _storedHost: string | null | undefined,
  _storedPort: number | null | undefined
): { host: string; port: number } {
  const cfg = dbConfig();
  return { host: cfg.host, port: Number(cfg.port) };
}

async function connect(url: string): Promise<Pool> {
  const u = new URL(url);
  const config: PoolConfig = {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
  const pool = new Pool(config);
  return pool;
}

function scanTenantRow(row: {
  tenant_id: string;
  subdomain: string;
  db_name: string;
  name: string;
  status: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password_encrypted: string;
}): TenantInfo {
  if (row.status === "suspended") throw new Error("tenant suspended");
  const cfg = dbConfig();
  const { host, port } = resolveTenantDbEndpoint(row.host, row.port);
  const url = buildConnUrl(
    host,
    port,
    row.username || cfg.user,
    row.password_encrypted || cfg.password,
    row.database_name
  );
  return {
    id: row.tenant_id,
    subdomain: row.subdomain,
    dbName: row.db_name,
    name: row.name,
    connUrl: url,
  };
}

export function getTenantManager() {
  const main = getMainPool();

  return {
    main() {
      return main;
    },

    async initMain() {
      await mainUp(main);
    },

    /** Align registry host/port with current runtime (host vs Docker API). */
    async syncConnectionHosts() {
      const cfg = dbConfig();
      await main.query(`UPDATE tenant_db_connections SET host = $1, port = $2`, [
        cfg.host,
        Number(cfg.port),
      ]);
      clearTenantPoolCache();
    },

    /** Migrate main DB and sync tenant connection registry once per process (retries after failure). */
    async ensureReady() {
      if (!ensureReadyInflight) {
        ensureReadyInflight = (async () => {
          await mainUp(main);
          const cfg = dbConfig();
          await main.query(`UPDATE tenant_db_connections SET host = $1, port = $2`, [
            cfg.host,
            Number(cfg.port),
          ]);
          clearTenantPoolCache();
        })().catch((e) => {
          ensureReadyInflight = null;
          throw e;
        });
      }
      await ensureReadyInflight;
    },

    async bySubdomain(subdomain: string): Promise<TenantInfo> {
      const res = await main.query(
        `SELECT t.tenant_id, t.subdomain, t.db_name, t.name, t.status,
                c.host, c.port, c.database_name, c.username, c.password_encrypted
         FROM tenants t
         JOIN tenant_db_connections c ON c.tenant_id = t.tenant_id
         WHERE t.subdomain = $1`,
        [subdomain.toLowerCase()]
      );
      if (!res.rows[0]) throw new Error("tenant not found");
      return scanTenantRow(res.rows[0]);
    },

    async byId(id: string): Promise<TenantInfo> {
      const res = await main.query(
        `SELECT t.tenant_id, t.subdomain, t.db_name, t.name, t.status,
                c.host, c.port, c.database_name, c.username, c.password_encrypted
         FROM tenants t
         JOIN tenant_db_connections c ON c.tenant_id = t.tenant_id
         WHERE t.tenant_id = $1`,
        [id]
      );
      if (!res.rows[0]) throw new Error("tenant not found");
      return scanTenantRow(res.rows[0]);
    },

    async pool(tenantId: string): Promise<Pool> {
      await this.ensureReady();
      startPoolCleanup();
      const now = Date.now();
      const cached = pools.get(tenantId);
      
      if (cached) {
        const healthy = await healthCheckPool(cached.pool);
        if (healthy) {
          cached.lastUsed = now;
          return cached.pool;
        }
        await cached.pool.end().catch(() => {});
        pools.delete(tenantId);
      }
      
      const info = await this.byId(tenantId);
      const p = await connect(info.connUrl);
      await tenantUp(p);
      pools.set(tenantId, { pool: p, createdAt: now, lastUsed: now });
      return p;
    },

    async createDatabase(dbName: string): Promise<void> {
      const cfg = dbConfig();
      const adminUrl = buildConnUrl(cfg.host, Number(cfg.port), cfg.user, cfg.password, "postgres");
      const admin = await connect(adminUrl);
      try {
        const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
        if (exists.rowCount === 0) {
          await admin.query(`CREATE DATABASE "${dbName}"`);
        }
      } finally {
        await admin.end();
      }
    },

    async provision(
      name: string,
      subdomain: string,
      adminEmail: string,
      adminPassword: string,
      adminName: string
    ): Promise<string> {
      const dbName = `vms_tenant_${subdomain}`;
      await this.createDatabase(dbName);
      const cfg = dbConfig();
      const tenantUrl = buildConnUrl(cfg.host, Number(cfg.port), cfg.user, cfg.password, dbName);
      const tp = await connect(tenantUrl);
      await tenantUp(tp);

      const client = await main.connect();
      let tenantId: string;
      try {
        await client.query("BEGIN");
        const ins = await client.query(
          `INSERT INTO tenants (name, subdomain, db_name) VALUES ($1,$2,$3) RETURNING tenant_id`,
          [name, subdomain, dbName]
        );
        tenantId = ins.rows[0].tenant_id;
        await client.query(
          `INSERT INTO tenant_db_connections (tenant_id, host, port, database_name, username, password_encrypted)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [tenantId, cfg.host, Number(cfg.port), dbName, cfg.user, cfg.password]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        await tp.end();
        throw e;
      } finally {
        client.release();
      }

      const hash = await bcrypt.hash(adminPassword, 10);
      await tp.query(`INSERT INTO work_locations (name, type, address) VALUES ('Main Site', 'construction', 'Head office')`);
      await tp.query(`INSERT INTO users (name, email, role, password_hash) VALUES ($1,$2,'admin',$3)`, [
        adminName,
        adminEmail.toLowerCase(),
        hash,
      ]);
      const now = Date.now();
      pools.set(tenantId, { pool: tp, createdAt: now, lastUsed: now });
      return tenantId;
    },

    async listActiveTenants(): Promise<string[]> {
      const res = await main.query(`SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at`);
      return res.rows.map((r) => r.tenant_id as string);
    },
  };
}

export type TenantManager = ReturnType<typeof getTenantManager>;
