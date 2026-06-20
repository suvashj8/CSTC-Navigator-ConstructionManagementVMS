import { getMainPool, resetMainPool } from "./db";
import { getTenantManager } from "./tenant-manager";

let bootInflight: Promise<void> | null = null;

function isHostDevDb(): boolean {
  const host = process.env.MAIN_DB_HOST ?? "localhost";
  return host === "localhost" || host === "127.0.0.1";
}

async function probePostgres(): Promise<boolean> {
  try {
    await getMainPool().query("SELECT 1");
    return true;
  } catch {
    resetMainPool();
    return false;
  }
}

async function waitForPostgres(maxMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await probePostgres()) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  const port = process.env.MAIN_DB_PORT ?? "5432";
  throw new Error(
    `Postgres not ready at localhost:${port}. Start local PostgreSQL and run scripts/setup-local-postgres.sql as a superuser.`
  );
}

/**
 * Dev-only: ensure host Postgres is reachable before migrations/seed.
 */
export async function ensurePostgresReachable(): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.VMS_SKIP_DOCKER_BOOT === "true") return;
  if (!isHostDevDb()) return;
  if (await probePostgres()) return;

  if (!bootInflight) {
    bootInflight = (async () => {
      await waitForPostgres();

      const tm = getTenantManager();
      await tm.ensureReady();
      const { warmDemoOnStartup } = await import("./ensure-demo");
      await warmDemoOnStartup(tm);
    })().finally(() => {
      bootInflight = null;
    });
  }

  await bootInflight;
}
