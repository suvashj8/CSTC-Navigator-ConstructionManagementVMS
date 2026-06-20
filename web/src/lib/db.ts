import { Pool } from "pg";

let mainPool: Pool | null = null;

function poolConfig() {
  return {
    host: process.env.MAIN_DB_HOST ?? "localhost",
    port: Number(process.env.MAIN_DB_PORT ?? 7002),
    user: process.env.MAIN_DB_USER ?? "vms",
    password: process.env.MAIN_DB_PASSWORD ?? "vms",
    database: process.env.MAIN_DB_NAME ?? "vms_main",
    max: 10,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 30_000,
  };
}

export function resetMainPool(): void {
  if (mainPool) {
    void mainPool.end().catch(() => {});
    mainPool = null;
  }
}

export function getMainPool(): Pool {
  if (!mainPool) {
    mainPool = new Pool(poolConfig());
    mainPool.on("error", () => {
      resetMainPool();
    });
  }
  return mainPool;
}