/**
 * Reset all demo accounts (admin, manager, supervisor, employee, driver + super-user).
 * Usage: npm run seed --prefix web
 */
import { getTenantManager } from "../src/lib/tenant-manager";
import { runSeed } from "../src/lib/seed";

async function main() {
  const tm = getTenantManager();
  await runSeed(tm);
  console.log("[vms] Demo accounts ready — subdomain: demo");
  console.log("  admin@vms.local / admin123");
  console.log("  manager@vms.local / manager123");
  console.log("  supervisor@vms.local / super123");
  console.log("  employee@vms.local / employee123");
  console.log("  driver@vms.local / driver123");
  process.exit(0);
}

main().catch((e) => {
  console.error("[vms] seed failed:", e);
  console.error("");
  const msg = String((e as Error).message ?? e);
  if (msg.includes("password authentication") || msg.includes("28P01")) {
    console.error("Cannot connect with MAIN_DB_* credentials.");
    console.error("Set up local PostgreSQL:");
    console.error("  psql -U postgres -f scripts/setup-local-postgres.sql");
    console.error("  npm run doctor");
  } else {
    console.error("Is local PostgreSQL running on localhost:5432?");
    console.error("  psql -U postgres -f scripts/setup-local-postgres.sql");
  }
  process.exit(1);
});
