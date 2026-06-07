import { ok, serviceUnavailable } from "@/lib/api-response";
import { getMainPool } from "@/lib/db";

export async function GET() {
  const pool = getMainPool();
  const checks: Record<string, string> = {};
  let overall = "ok";

  try {
    await pool.query("SELECT 1");
    checks.postgres = "ok";
  } catch (e) {
    checks.postgres = (e as Error).message;
    overall = "degraded";
  }

  const redisAddr = process.env.REDIS_ADDR;
  if (redisAddr) {
    try {
      const Redis = (await import("ioredis")).default;
      const rdb = new Redis(redisAddr, { connectTimeout: 2000, maxRetriesPerRequest: 1 });
      await rdb.ping();
      checks.redis = "ok";
      await rdb.quit();
    } catch (e) {
      checks.redis = (e as Error).message;
      overall = "degraded";
    }
  }

  const st = {
    status: overall,
    postgres: checks.postgres,
    redis: checks.redis,
    checks,
  };

  if (overall !== "ok") {
    return serviceUnavailable(st.status);
  }
  return ok(st);
}
