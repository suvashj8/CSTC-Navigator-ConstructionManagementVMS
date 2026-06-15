import net from "node:net";
import { execSync } from "node:child_process";

const VMS_PORT = Number(process.env.MAIN_DB_PORT ?? 15432);
const VMS_USER = process.env.MAIN_DB_USER ?? "vms";
const VMS_PASS = process.env.MAIN_DB_PASSWORD ?? "vms";
const VMS_DB = process.env.MAIN_DB_NAME ?? "vms_main";

function probe(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (v) => {
      s.destroy();
      resolve(v);
    };
    s.setTimeout(2000);
    s.on("connect", () => done(true));
    s.on("error", () => done(false));
    s.on("timeout", () => done(false));
  });
}

async function main() {
  console.log("Navigator VMS — health check\n");

  let dockerOk = false;
  for (let i = 0; i < 3 && !dockerOk; i++) {
    try {
      execSync("docker info", { stdio: "ignore", timeout: 20_000 });
      dockerOk = true;
    } catch {
      if (i < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (dockerOk) {
    console.log("Docker:           engine responding");
  } else {
    console.log("Docker:           engine NOT responding — quit Docker Desktop fully, reopen, wait for Engine running");
  }

  const p5432 = await probe("localhost", 5432);
  const p5434 = await probe("localhost", VMS_PORT);
  console.log(`Port 5432:        ${p5432 ? "in use (often another Postgres — not VMS)" : "free"}`);
  console.log(`Port ${VMS_PORT} (VMS):  ${p5434 ? "in use" : "NOT listening — run: npm run docker:infra"}`);

  if (p5434) {
    try {
      const { createRequire } = await import("node:module");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const root = join(dirname(fileURLToPath(import.meta.url)), "..");
      const require = createRequire(join(root, "web/package.json"));
      const pg = require("pg");
      const pool = new pg.Pool({
        host: "localhost",
        port: VMS_PORT,
        user: VMS_USER,
        password: VMS_PASS,
        database: VMS_DB,
        connectionTimeoutMillis: 3000,
      });
      await pool.query("SELECT 1");
      const tenants = await pool.query(`SELECT subdomain FROM tenants WHERE subdomain = 'demo'`);
      console.log(`VMS database:     connected (${VMS_USER}@${VMS_PORT}/${VMS_DB})`);
      console.log(`Demo tenant:      ${tenants.rowCount ? "yes" : "missing — run: npm run seed"}`);
      if (tenants.rowCount) {
        const conn = await pool.query(
          `SELECT c.host, c.port FROM tenant_db_connections c
           JOIN tenants t ON t.tenant_id = c.tenant_id WHERE t.subdomain = 'demo'`
        );
        const row = conn.rows[0];
        const expectHost = "localhost";
        const expectPort = VMS_PORT;
        if (row && (row.host !== expectHost || Number(row.port) !== expectPort)) {
          console.log(
            `Tenant DB link:   stale (${row.host}:${row.port}) — run: npm run seed  (login auto-fixes after API restart)`
          );
        } else if (row) {
          console.log(`Tenant DB link:   ok (${row.host}:${row.port})`);
        }
        const tdb = await pool.query(
          `SELECT c.database_name FROM tenant_db_connections c
           JOIN tenants t ON t.tenant_id = c.tenant_id WHERE t.subdomain = 'demo'`
        );
        const demoDb = tdb.rows[0]?.database_name;
        if (demoDb) {
          const tenantPool = new pg.Pool({
            host: "localhost",
            port: VMS_PORT,
            user: VMS_USER,
            password: VMS_PASS,
            database: demoDb,
            connectionTimeoutMillis: 3000,
          });
          try {
            const admin = await tenantPool.query(
              `SELECT 1 FROM users WHERE email = 'admin@vms.local' AND status = 'active' LIMIT 1`
            );
            console.log(`Demo admin user:  ${admin.rowCount ? "yes" : "missing — run: npm run docker:reseed"}`);
          } finally {
            await tenantPool.end();
          }
        }
      }
      await pool.end();
    } catch (e) {
      console.log(`VMS database:     FAILED — ${(e).message}`);
      if (String(e.message).includes("password authentication")) {
        console.log("");
        console.log("  Wrong Postgres on this port. Run:");
        console.log("    docker compose down");
        console.log("    docker compose up -d postgres redis");
        console.log("    npm run seed");
      }
    }
  }

  const api = await probe("localhost", 3000);
  console.log(`API :3000:        ${api ? "in use" : "not running — run: npm run dev"}`);
  if (!api && p5434) {
    console.log("                  (Postgres is up but API is missing — UI alone cannot sign in)");
  }

  console.log("\nRecommended dev flow (fewest login issues):");
  console.log("  npm run dev");
  console.log("  Login: subdomain demo | admin@vms.local / admin123");
  console.log("\nIf login still fails:");
  console.log("  npm run docker:reseed");
  console.log("\nFull Docker (API in containers) — after code changes:");
  console.log("  npm run docker:reset");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
