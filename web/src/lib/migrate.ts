import fs from "fs";
import path from "path";
import type { Pool } from "pg";

function sqlDir(kind: "main" | "tenant"): string {
  return path.join(process.cwd(), "sql", kind);
}

async function runSqlFiles(pool: Pool, dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const name of names) {
    const sql = fs.readFileSync(path.join(dir, name), "utf8");
    await pool.query(sql);
  }
}

export async function mainUp(pool: Pool): Promise<void> {
  await runSqlFiles(pool, sqlDir("main"));
}

export async function tenantUp(pool: Pool): Promise<void> {
  await runSqlFiles(pool, sqlDir("tenant"));
}
