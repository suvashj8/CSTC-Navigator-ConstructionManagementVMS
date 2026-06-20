/**
 * Create local VMS Postgres role/database using a temporary Docker psql client.
 * Requires PostgreSQL running on the host (default localhost:5432).
 *
 * Usage:
 *   npm run setup:db
 *   set PGPASSWORD=your_postgres_superuser_password && npm run setup:db
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = join(root, "scripts", "setup-local-postgres.sql");
const host = process.env.MAIN_DB_HOST ?? "host.docker.internal";
const port = process.env.MAIN_DB_PORT ?? "5432";
const superuser = process.env.PG_SUPERUSER ?? "postgres";

console.log(`Setting up VMS database via ${superuser}@${host}:${port}\n`);

const args = [
  "run",
  "--rm",
  "--add-host=host.docker.internal:host-gateway",
  "-v",
  `${sql}:/setup.sql:ro`,
  "-e",
  `PGPASSWORD=${process.env.PGPASSWORD ?? ""}`,
  "postgres:15-alpine",
  "psql",
  "-h",
  host,
  "-p",
  port,
  "-U",
  superuser,
  "-f",
  "/setup.sql",
];

const result = spawnSync("docker", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("\nSetup failed.");
  console.error("Ensure PostgreSQL is running on the host and set the superuser password:");
  console.error("  set PGPASSWORD=your_postgres_password");
  console.error("  npm run setup:db");
  process.exit(result.status ?? 1);
}

console.log("\nVMS database ready (user vms / password vms / database vms_main).");
console.log("Next: npm run seed && npm run docker:up");
