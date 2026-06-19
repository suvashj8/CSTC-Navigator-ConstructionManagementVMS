import { ok, serviceUnavailable } from "@/lib/api-response";
import { getMainPool } from "@/lib/db";
import { getTenantManager } from "@/lib/tenant-manager";

async function checkRedis(addr: string): Promise<string> {
  const Redis = (await import("ioredis")).default;
  const rdb = new Redis(addr, {
    connectTimeout: 2000,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    enableOfflineQueue: false,
    family: 4,
    retryStrategy: () => null,
  });
  rdb.on("error", () => {});
  try {
    await rdb.connect();
    await rdb.ping();
    return "ok";
  } catch (e) {
    return (e as Error).message;
  } finally {
    try {
      rdb.disconnect();
    } catch {
      /* ignore */
    }
  }
}

async function runHealthChecks(): Promise<{ body: Record<string, unknown>; postgresOk: boolean }> {
  const checks: Record<string, string> = {};
  const warnings: string[] = [];
  let postgresOk = false;

  try {
    await getMainPool().query("SELECT 1");
    checks.postgres = "ok";
    postgresOk = true;
  } catch (e) {
    checks.postgres = (e as Error).message;
  }

  const redisAddr = process.env.REDIS_ADDR?.trim();
  if (redisAddr && process.env.VMS_REDIS_REQUIRED === "true") {
    checks.redis = await checkRedis(redisAddr);
    if (checks.redis !== "ok") {
      warnings.push("Redis is down — background jobs may not run. Run: npm run docker:infra");
    }
  } else if (redisAddr) {
    const redisStatus = await checkRedis(redisAddr);
    checks.redis = redisStatus === "ok" ? "ok" : "optional";
    if (redisStatus !== "ok") {
      warnings.push("Redis is optional for login.");
    }
  }

  if (postgresOk) {
    try {
      const tm = getTenantManager();
      await tm.ensureReady();
      const demo = await tm.main().query(`SELECT tenant_id FROM tenants WHERE subdomain = 'demo' LIMIT 1`);
      checks.demo_tenant = demo.rowCount ? "ok" : "missing";
      if (!demo.rowCount) {
        warnings.push("Demo tenant missing — login will auto-seed, or run: npm run docker:reseed");
      }

      if (demo.rowCount) {
        try {
          const info = await tm.bySubdomain("demo");
          const pool = await tm.pool(info.id);
          const admin = await pool.query(
            `SELECT 1 FROM users WHERE email = 'admin@vms.local' AND status = 'active' LIMIT 1`
          );
          checks.demo_admin = admin.rowCount ? "ok" : "missing";
          if (!admin.rowCount) {
            warnings.push("Demo admin will be created on first sign-in, or run: npm run docker:reseed");
          }
        } catch (e) {
          checks.demo_admin = (e as Error).message;
          warnings.push("Demo tenant DB issue — run: npm run docker:reseed");
        }
      }

      checks.db_endpoint = `${process.env.MAIN_DB_HOST ?? "localhost"}:${process.env.MAIN_DB_PORT ?? "15432"}`;
    } catch (e) {
      checks.tenant_registry = (e as Error).message;
      warnings.push("Tenant registry issue — run: npm run docker:reseed");
    }
  }

  const body = {
    status: postgresOk ? "ok" : "degraded",
    api: "ok",
    postgres: checks.postgres,
    redis: checks.redis,
    demo_tenant: checks.demo_tenant,
    demo_admin: checks.demo_admin,
    db_endpoint: checks.db_endpoint,
    warnings,
    checks,
    hint: postgresOk
      ? undefined
      : "Database not ready — run: npm run dev (stops conflicting Docker API and starts DB + API + UI)",
  };

  return { body, postgresOk };
}

export async function GET() {
  const { body, postgresOk } = await runHealthChecks();
  if (!postgresOk) {
    return serviceUnavailable(body);
  }
  return ok(body);
}

export async function HEAD() {
  const { postgresOk } = await runHealthChecks();
  return new Response(null, {
    status: postgresOk ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
}
