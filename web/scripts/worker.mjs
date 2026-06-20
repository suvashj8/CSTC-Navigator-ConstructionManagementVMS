import cron from "node-cron";
import pg from "pg";

const { Pool } = pg;

function dbConfig() {
  return {
    host: process.env.MAIN_DB_HOST ?? "localhost",
    port: Number(process.env.MAIN_DB_PORT ?? 5432),
    user: process.env.MAIN_DB_USER ?? "vms",
    password: process.env.MAIN_DB_PASSWORD ?? "vms",
    database: process.env.MAIN_DB_NAME ?? "vms_main",
  };
}

/** Tenant DBs share MAIN_DB_HOST/PORT — ignore stale registry from host/Docker mode switches. */
function resolveTenantDbEndpoint(_storedHost, _storedPort) {
  const cfg = dbConfig();
  return { host: cfg.host, port: cfg.port };
}

async function ensureReady(main) {
  const cfg = dbConfig();
  await main.query(`UPDATE tenant_db_connections SET host = $1, port = $2`, [cfg.host, cfg.port]);
}

function getMainPool() {
  return new Pool({ ...dbConfig(), max: 5 });
}

async function listActiveTenants(main) {
  const res = await main.query(`SELECT tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at`);
  return res.rows.map((r) => r.tenant_id);
}

async function tenantPool(main, tenantId) {
  const res = await main.query(
    `SELECT c.host, c.port, c.database_name, c.username, c.password_encrypted
     FROM tenant_db_connections c WHERE c.tenant_id = $1`,
    [tenantId]
  );
  const row = res.rows[0];
  if (!row) throw new Error("tenant connection missing");
  const { host, port } = resolveTenantDbEndpoint(row.host, row.port);
  return new Pool({
    host,
    port,
    user: row.username,
    password: row.password_encrypted,
    database: row.database_name,
    max: 5,
  });
}

const insuranceLeadDays = [90, 60, 30, 7];
const licenseLeadDays = [60, 30, 7];

async function insertNotificationIfNew(pool, recipientId, typ, title, message) {
  const exists = await pool.query(
    `SELECT 1 FROM notifications WHERE recipient_id IS NOT DISTINCT FROM $1 AND type = $2 AND title = $3 AND message = $4 AND created_at > NOW() - INTERVAL '23 hours' LIMIT 1`,
    [recipientId, typ, title, message]
  );
  if (exists.rowCount > 0) return;
  await pool.query(
    `INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at) VALUES ($1,$2,$3,$4,'in_app','sent',NOW())`,
    [recipientId, typ, title, message]
  );
}

async function scanTenant(pool) {
  const admins = await pool.query(`SELECT user_id FROM users WHERE role IN ('admin','manager') AND status = 'active'`);
  const adminIds = admins.rows.map((r) => r.user_id);

  for (const days of insuranceLeadDays) {
    const res = await pool.query(
      `SELECT ip.policy_id, a.reg_serial_no, ip.policy_no, ip.expiry_date FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id WHERE ip.status = 'active' AND ip.expiry_date = CURRENT_DATE + $1`,
      [days]
    );
    for (const row of res.rows) {
      const title = `Insurance expires in ${days} days`;
      const msg = `Policy ${row.policy_no} for asset ${row.reg_serial_no} expires on ${row.expiry_date}`;
      for (const rid of adminIds) await insertNotificationIfNew(pool, rid, "insurance", title, msg);
    }
  }

  for (const days of licenseLeadDays) {
    const res = await pool.query(
      `SELECT d.user_id, u.name, d.license_no, d.expiry_date FROM driver_profiles d JOIN users u ON u.user_id = d.user_id WHERE u.status = 'active' AND d.expiry_date = CURRENT_DATE + $1`,
      [days]
    );
    for (const row of res.rows) {
      const title = `Driver license expires in ${days} days`;
      const msg = `${row.name} (license ${row.license_no}) expires on ${row.expiry_date}`;
      await insertNotificationIfNew(pool, row.user_id, "license", title, msg);
      for (const rid of adminIds) await insertNotificationIfNew(pool, rid, "license", title, msg);
    }
  }

  const overdue = await pool.query(
    `SELECT al.alloc_id, a.reg_serial_no, al.expected_return FROM allocations al JOIN assets a ON a.asset_id = al.asset_id WHERE al.state IN ('active','in_transit') AND al.expected_return < CURRENT_DATE`
  );
  for (const row of overdue.rows) {
    const title = "Overdue asset return";
    const msg = `Asset ${row.reg_serial_no} was expected back by ${row.expected_return} (allocation ${row.alloc_id})`;
    for (const rid of adminIds) await insertNotificationIfNew(pool, rid, "allocation", title, msg);
  }
}

async function runScan() {
  console.log("[worker] expiry scan started");
  const main = getMainPool();
  try {
    await ensureReady(main);
    const tenants = await listActiveTenants(main);
    for (const tid of tenants) {
      const pool = await tenantPool(main, tid);
      try {
        await scanTenant(pool);
      } catch (e) {
        console.error(`[worker] tenant ${tid}:`, e);
      } finally {
        await pool.end();
      }
    }
  } finally {
    await main.end();
  }
  console.log("[worker] expiry scan finished");
}

process.on("unhandledRejection", (e) => console.error("[worker] unhandled rejection:", e));
process.on("uncaughtException", (e) => console.error("[worker] uncaught exception:", e));

void (async () => {
  const main = getMainPool();
  try {
    await ensureReady(main);
    console.log("[worker] tenant DB connections synced to", `${dbConfig().host}:${dbConfig().port}`);
  } catch (e) {
    console.error("[worker] startup sync failed:", e);
  } finally {
    await main.end();
  }
})();

console.log("[worker] scheduling daily expiry scan at 06:00 UTC");
cron.schedule("0 6 * * *", () => {
  runScan().catch((e) => console.error("[worker] scan error:", e));
});

if (process.env.WORKER_RUN_ON_START === "true") {
  runScan().catch((e) => console.error("[worker] initial scan error:", e));
}

console.log("[worker] ready");
