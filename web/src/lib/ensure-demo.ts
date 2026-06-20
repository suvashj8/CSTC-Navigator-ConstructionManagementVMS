import { runSeed, seedDemoSampleDataIfEmpty, syncDemoAccounts, syncPlatformSuperUser } from "./seed";
import type { TenantManager } from "./tenant-manager";
import { DEMO_SUBDOMAIN } from "./demo-accounts";

let seedInflight: Promise<void> | null = null;
let demoReady = false;
let platformReady = false;

function isDemoSeedEnabled(): boolean {
  return process.env.SEED_ON_STARTUP === "true";
}

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
      const info = await tm.bySubdomain(DEMO_SUBDOMAIN);
      await seedDemoSampleDataIfEmpty(tm, info.id);
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
  try {
    await syncDemoAccounts(tm);
  } catch {
    /* fall through to full seed */
  }
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
  if (isDemoSeedEnabled()) {
    await runSeedOnce(tm);
    demoReady = true;
    platformReady = true;
    return;
  }

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
