import { DEMO_SUBDOMAIN } from "./demo-accounts";
import { runSeed } from "./seed";
import type { TenantManager } from "./tenant-manager";

let inflight: Promise<void> | null = null;

function shouldAutoSeed(): boolean {
  if (process.env.SEED_ON_STARTUP === "true") return true;
  return process.env.NODE_ENV === "development";
}

/** Ensure demo tenant + admin exist before login (fixes race when API starts before Postgres). */
export async function ensureDemoSeeded(tm: TenantManager): Promise<void> {
  if (!shouldAutoSeed()) return;

  try {
    await tm.initMain();
    await tm.syncConnectionHosts();
    const info = await tm.bySubdomain(DEMO_SUBDOMAIN);
    const pool = await tm.pool(info.id);
    const r = await pool.query(
      `SELECT 1 FROM users WHERE email = $1 AND status = 'active' LIMIT 1`,
      ["admin@vms.local"]
    );
    if (r.rowCount && r.rowCount > 0) return;
  } catch {
    // missing tenant or DB not ready — seed below
  }

  if (!inflight) {
    inflight = runSeed(tm).finally(() => {
      inflight = null;
    });
  }
  await inflight;
}
