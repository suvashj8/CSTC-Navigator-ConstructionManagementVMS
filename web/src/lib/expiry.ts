import type { Pool } from "pg";
import type { TenantManager } from "./tenant-manager";

const insuranceLeadDays = [90, 60, 30, 7];
const licenseLeadDays = [60, 30, 7];

async function adminUserIds(pool: Pool): Promise<string[]> {
  const res = await pool.query(`SELECT user_id FROM users WHERE role IN ('admin','manager') AND status = 'active'`);
  return res.rows.map((r) => r.user_id as string);
}

async function insertNotificationIfNew(
  pool: Pool,
  recipientId: string | null,
  typ: string,
  title: string,
  message: string
): Promise<void> {
  const exists = await pool.query(
    `SELECT 1 FROM notifications
     WHERE recipient_id IS NOT DISTINCT FROM $1
       AND type = $2 AND title = $3 AND message = $4
       AND created_at > NOW() - INTERVAL '23 hours'
     LIMIT 1`,
    [recipientId, typ, title, message]
  );
  if (exists.rowCount && exists.rowCount > 0) return;
  await pool.query(
    `INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at)
     VALUES ($1,$2,$3,$4,'in_app','sent',NOW())`,
    [recipientId, typ, title, message]
  );
}

async function scanInsuranceExpiries(pool: Pool, adminIds: string[]): Promise<void> {
  for (const days of insuranceLeadDays) {
    const res = await pool.query(
      `SELECT ip.policy_id, a.reg_serial_no, ip.policy_no, ip.expiry_date
       FROM insurance_policies ip
       JOIN assets a ON a.asset_id = ip.asset_id
       WHERE ip.status = 'active' AND ip.expiry_date = CURRENT_DATE + $1`,
      [days]
    );
    for (const row of res.rows) {
      const title = `Insurance expires in ${days} days`;
      const msg = `Policy ${row.policy_no} for asset ${row.reg_serial_no} expires on ${row.expiry_date}`;
      for (const rid of adminIds) {
        await insertNotificationIfNew(pool, rid, "insurance", title, msg);
      }
    }
  }
}

async function scanLicenseExpiries(pool: Pool, adminIds: string[]): Promise<void> {
  for (const days of licenseLeadDays) {
    const res = await pool.query(
      `SELECT d.user_id, u.name, d.license_no, d.expiry_date
       FROM driver_profiles d
       JOIN users u ON u.user_id = d.user_id
       WHERE u.status = 'active' AND d.expiry_date = CURRENT_DATE + $1`,
      [days]
    );
    for (const row of res.rows) {
      const title = `Driver license expires in ${days} days`;
      const msg = `${row.name} (license ${row.license_no}) expires on ${row.expiry_date}`;
      await insertNotificationIfNew(pool, row.user_id, "license", title, msg);
      for (const rid of adminIds) {
        await insertNotificationIfNew(pool, rid, "license", title, msg);
      }
    }
  }
}

async function scanOverdueAllocations(pool: Pool, adminIds: string[]): Promise<void> {
  const res = await pool.query(
    `SELECT al.alloc_id, a.reg_serial_no, al.expected_return
     FROM allocations al
     JOIN assets a ON a.asset_id = al.asset_id
     WHERE al.state IN ('active','in_transit') AND al.expected_return < CURRENT_DATE`
  );
  for (const row of res.rows) {
    const title = "Overdue asset return";
    const msg = `Asset ${row.reg_serial_no} was expected back by ${row.expected_return} (allocation ${row.alloc_id})`;
    for (const rid of adminIds) {
      await insertNotificationIfNew(pool, rid, "allocation", title, msg);
    }
  }
}

export async function scanTenantExpiries(tm: TenantManager, tenantId: string): Promise<void> {
  const pool = await tm.pool(tenantId);
  const adminIds = await adminUserIds(pool);
  await scanInsuranceExpiries(pool, adminIds);
  await scanLicenseExpiries(pool, adminIds);
  await scanOverdueAllocations(pool, adminIds);
}

export async function scanAllTenants(tm: TenantManager): Promise<void> {
  const tenants = await tm.listActiveTenants();
  for (const tid of tenants) {
    try {
      await scanTenantExpiries(tm, tid);
    } catch (e) {
      console.error(`expiry scan tenant ${tid}:`, e);
    }
  }
}
