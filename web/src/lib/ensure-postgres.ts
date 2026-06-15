import { execSync } from "node:child_process";
import path from "node:path";
import { getMainPool, resetMainPool } from "./db";
import { getTenantManager } from "./tenant-manager";

let bootInflight: Promise<void> | null = null;

function isHostDevDb(): boolean {
  const host = process.env.MAIN_DB_HOST ?? "localhost";
  return host === "localhost" || host === "127.0.0.1";
}

function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
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
  throw new Error("Postgres not ready after Docker start");
}

/**
 * Dev-only: if host API cannot reach localhost Postgres, start docker compose postgres/redis.
 */
export async function ensurePostgresReachable(): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.VMS_SKIP_DOCKER_BOOT === "true") return;
  if (!isHostDevDb()) return;
  if (await probePostgres()) return;

  if (!bootInflight) {
    bootInflight = (async () => {
      try {
        execSync("docker info", { stdio: "ignore", timeout: 15_000 });
      } catch {
        throw new Error(
          "Docker engine not responding — quit Docker Desktop fully, reopen it, wait for Engine running, then run npm run dev"
        );
      }

      const root = repoRoot();
      try {
        execSync("docker compose stop web worker", { cwd: root, stdio: "ignore", timeout: 60_000 });
      } catch {
        /* ignore */
      }
      execSync("docker compose up -d postgres redis", {
        cwd: root,
        stdio: "pipe",
        timeout: 120_000,
      });

      resetMainPool();
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
