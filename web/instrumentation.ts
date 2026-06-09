export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getTenantManager } = await import("./src/lib/tenant-manager");
    const { runSeed } = await import("./src/lib/seed");

    try {
      const tm = getTenantManager();
      if (process.env.SEED_ON_STARTUP === "true") {
        await runSeed(tm);
        console.log("[vms] demo accounts seeded (subdomain: demo)");
      } else {
        await tm.initMain();
        await tm.syncConnectionHosts();
        const { warmDemoOnStartup } = await import("./src/lib/ensure-demo");
        await warmDemoOnStartup(tm);
      }
    } catch (e) {
      console.error("[vms] startup migration/seed failed:", e);
    }
  }
}
