import fs from "fs";
import path from "path";
import type { Pool } from "pg";

function sqlDir(kind: "main" | "tenant"): string {
  return path.join(process.cwd(), "sql", kind);
}

async function ensureMigrationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _vms_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runSqlFiles(pool: Pool, dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;
  await ensureMigrationTable(pool);
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const name of names) {
    const applied = await pool.query(`SELECT 1 FROM _vms_migrations WHERE filename = $1`, [name]);
    if (applied.rowCount && applied.rowCount > 0) continue;
    const sql = fs.readFileSync(path.join(dir, name), "utf8");
    await pool.query(sql);
    await pool.query(`INSERT INTO _vms_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [name]);
  }
}

export async function mainUp(pool: Pool): Promise<void> {
  await runSqlFiles(pool, sqlDir("main"));
}

export async function tenantUp(pool: Pool): Promise<void> {
  await runSqlFiles(pool, sqlDir("tenant"));
}
