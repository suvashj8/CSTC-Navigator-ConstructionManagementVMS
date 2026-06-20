export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getTenantManager } = await import("./src/lib/tenant-manager");

    try {
      const { ensurePostgresReachable } = await import("./src/lib/ensure-postgres");
      await ensurePostgresReachable();

      const tm = getTenantManager();
      await tm.ensureReady();

      const { warmDemoOnStartup } = await import("./src/lib/ensure-demo");
      await warmDemoOnStartup(tm);

      if (process.env.SEED_ON_STARTUP === "true") {
        console.log("[vms] demo data seeded (subdomain: demo)");
      }
    } catch (e) {
      console.error("[vms] startup migration/seed failed:", e);
      console.error("[vms] Fix: quit Docker Desktop, reopen, wait for Engine running, then run npm run dev");
    }
  }
}
