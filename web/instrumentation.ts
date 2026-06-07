export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getTenantManager } = await import("./src/lib/tenant-manager");
    const { runSeed } = await import("./src/lib/seed");

    const tm = getTenantManager();
    try {
      await tm.initMain();
      if (process.env.SEED_ON_STARTUP === "true") {
        await runSeed(tm);
        console.log("[vms] seed completed");
      }
    } catch (e) {
      console.error("[vms] startup migration/seed failed:", e);
    }
  }
}
