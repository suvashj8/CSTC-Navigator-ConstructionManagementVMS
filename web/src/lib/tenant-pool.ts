import { Pool } from "pg";

const mainPool = new Pool({
  host: process.env.MAIN_DB_HOST ?? "localhost",
  port: Number(process.env.MAIN_DB_PORT ?? 5432),
  user: process.env.MAIN_DB_USER ?? "vms",
  password: process.env.MAIN_DB_PASSWORD ?? "vms",
  database: process.env.MAIN_DB_NAME ?? "vms_main",
  max: 5,
});

const tenantPools = new Map<string, Pool>();

export async function tenantPoolBySubdomain(subdomain: string): Promise<Pool> {
  const cached = tenantPools.get(subdomain);
  if (cached) return cached;

  const res = await mainPool.query(
    `SELECT c.host, c.port, c.database_name, c.username, c.password_encrypted, t.status
     FROM tenants t
     JOIN tenant_db_connections c ON c.tenant_id = t.tenant_id
     WHERE t.subdomain = $1`,
    [subdomain]
  );
  const row = res.rows[0];
  if (!row) throw new Error("tenant not found");
  if (row.status === "suspended") throw new Error("tenant suspended");

  const pool = new Pool({
    host: row.host,
    port: row.port,
    user: row.username,
    password: row.password_encrypted,
    database: row.database_name,
    max: 8,
  });
  tenantPools.set(subdomain, pool);
  return pool;
}
