import { Pool } from "pg";
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

const pools = new Map<string, Pool>();

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

async function connect(url: string): Promise<Pool> {
  const u = new URL(url);
  const pool = new Pool({
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    max: 10,
  });
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
  const url = buildConnUrl(row.host || cfg.host, row.port || Number(cfg.port), row.username || cfg.user, row.password_encrypted || cfg.password, row.database_name);
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
      const cached = pools.get(tenantId);
      if (cached) return cached;
      const info = await this.byId(tenantId);
      const p = await connect(info.connUrl);
      await tenantUp(p);
      pools.set(tenantId, p);
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
      pools.set(tenantId, tp);
      return tenantId;
    },

    async listActiveTenants(): Promise<string[]> {
      const res = await main.query(`SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at`);
      return res.rows.map((r) => r.tenant_id as string);
    },
  };
}

export type TenantManager = ReturnType<typeof getTenantManager>;
