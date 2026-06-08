export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getTenantManager } = await import("./src/lib/tenant-manager");
    const { runSeed } = await import("./src/lib/seed");

    try {
      if (process.env.SEED_ON_STARTUP === "true") {
        const tm = getTenantManager();
        await runSeed(tm);
        console.log("[vms] demo accounts seeded (subdomain: demo)");
      } else {
        const tm = getTenantManager();
        await tm.initMain();
        await tm.syncConnectionHosts();
      }
    } catch (e) {
      console.error("[vms] startup migration/seed failed:", e);
    }
  }
}
