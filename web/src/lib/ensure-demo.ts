import { runSeed, syncDemoAccounts, syncPlatformSuperUser } from "./seed";
import type { TenantManager } from "./tenant-manager";

let seedInflight: Promise<void> | null = null;
let demoReady = false;
let platformReady = false;

async function runSeedOnce(tm: TenantManager): Promise<void> {
  if (!seedInflight) {
    seedInflight = runSeed(tm).finally(() => {
      seedInflight = null;
    });
  }
  await seedInflight;
}

type EnsureOpts = { force?: boolean };

/**
 * Ensure demo tenant accounts exist with correct passwords before login.
 * Always syncs passwords when the demo tenant is present (fixes hash drift).
 */
export async function ensureDemoSeeded(tm: TenantManager, opts?: EnsureOpts): Promise<void> {
  // Always re-sync demo passwords on login — demoReady must not skip hash repair.
  try {
    const synced = await syncDemoAccounts(tm);
    if (synced && !opts?.force) {
      demoReady = true;
      platformReady = true;
      return;
    }
  } catch {
    // tenant missing or DB not ready — full seed below
  }

  await runSeedOnce(tm);
  demoReady = true;
  platformReady = true;
}

/** Force full demo repair on login failure (re-sync + seed if needed). */
export async function repairDemoSeeded(tm: TenantManager): Promise<void> {
  demoReady = false;
  platformReady = false;
  await tm.refreshConnections();
  await runSeedOnce(tm);
  demoReady = true;
  platformReady = true;
}

/** Ensure platform super-user exists with the documented password. */
export async function ensurePlatformSeeded(tm: TenantManager, opts?: EnsureOpts): Promise<void> {
  if (platformReady && !opts?.force) return;

  try {
    await syncPlatformSuperUser(tm);
    platformReady = true;
    return;
  } catch {
    // main DB not ready — full seed below
  }

  await runSeedOnce(tm);
  demoReady = true;
  platformReady = true;
}

export async function repairPlatformSeeded(tm: TenantManager): Promise<void> {
  platformReady = false;
  await ensurePlatformSeeded(tm, { force: true });
}

/** Best-effort sync on API boot (no-op when demo tenant is absent). */
export async function warmDemoOnStartup(tm: TenantManager): Promise<void> {
  try {
    const synced = await syncDemoAccounts(tm);
    if (synced) {
      demoReady = true;
      platformReady = true;
    }
    await syncPlatformSuperUser(tm);
    platformReady = true;
  } catch {
    // Docker/DB may not be up yet — login path will self-heal
  }
}
