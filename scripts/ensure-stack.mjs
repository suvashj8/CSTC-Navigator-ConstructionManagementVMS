/**
 * Prepare local dev stack: Docker infra, wait for Postgres, seed demo accounts.
 */
import { execSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("Navigator VMS — preparing dev stack\n");

run("node", ["scripts/free-api-port.mjs"]);
run("node", ["scripts/check-docker.mjs"]);

for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    execSync("docker compose up -d postgres redis", {
      cwd: root,
      stdio: "inherit",
      timeout: 120_000,
    });
    break;
  } catch (e) {
    if (attempt === 2) {
      console.error("\nFailed to start Postgres/Redis containers.");
      console.error("Quit Docker Desktop completely, reopen it, then run: npm run dev\n");
      process.exit(1);
    }
    console.warn("docker compose failed — retrying in 3s...");
    await new Promise((r) => setTimeout(r, 3000));
  }
}

run("node", ["scripts/wait-postgres.mjs"]);
run("npm", ["run", "seed"]);

console.log("\nStack ready — starting API and UI...");
console.log("Login: subdomain demo | admin@vms.local / admin123\n");
