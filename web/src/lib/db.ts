import { Pool } from "pg";

let mainPool: Pool | null = null;

export function getMainPool(): Pool {
  if (!mainPool) {
    mainPool = new Pool({
      host: process.env.MAIN_DB_HOST ?? "localhost",
      port: Number(process.env.MAIN_DB_PORT ?? 5432),
      user: process.env.MAIN_DB_USER ?? "vms",
      password: process.env.MAIN_DB_PASSWORD ?? "vms",
      database: process.env.MAIN_DB_NAME ?? "vms_main",
      max: 10,
    });
  }
  return mainPool;
}
