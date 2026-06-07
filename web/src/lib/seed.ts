import bcrypt from "bcryptjs";
import type { TenantManager } from "./tenant-manager";

const superEmail = "super@vms.local";
const superPassword = "super123";
const demoSubdomain = "demo";
const adminEmail = "admin@vms.local";
const adminPassword = "admin123";

const demoRoleAccounts = [
  { name: "Ram Thapa", email: "manager@vms.local", password: "manager123", role: "manager" },
  { name: "Sita Sharma", email: "supervisor@vms.local", password: "super123", role: "supervisor" },
  { name: "Hari KC", email: "employee@vms.local", password: "employee123", role: "employee" },
  { name: "Bikash Rai", email: "driver@vms.local", password: "driver123", role: "driver" },
];

export async function runSeed(tm: TenantManager): Promise<void> {
  await seedSuperUser(tm);
  try {
    const info = await tm.bySubdomain(demoSubdomain);
    await ensureDemoRoleUsers(tm, info.id);
  } catch {
    const id = await tm.provision("Demo Construction Co.", demoSubdomain, adminEmail, adminPassword, "Demo Admin");
    await seedDemoData(tm, id);
  }
}

async function seedSuperUser(tm: TenantManager): Promise<void> {
  const main = tm.main();
  const exists = await main.query(`SELECT 1 FROM super_users WHERE email = $1`, [superEmail]);
  if (exists.rowCount && exists.rowCount > 0) return;
  const hash = await bcrypt.hash(superPassword, 10);
  await main.query(`INSERT INTO super_users (name, email, password_hash) VALUES ($1,$2,$3)`, [
    "Platform Admin",
    superEmail,
    hash,
  ]);
}

async function ensureDemoRoleUsers(tm: TenantManager, tenantId: string): Promise<void> {
  const pool = await tm.pool(tenantId);
  const locRes = await pool.query(`SELECT location_id FROM work_locations ORDER BY created_at LIMIT 1`);
  const loc1 = locRes.rows[0]?.location_id;
  if (!loc1) throw new Error("work location missing");

  const locRows = await pool.query(`SELECT location_id FROM work_locations ORDER BY created_at LIMIT 2`);
  const locIds = locRows.rows.map((r) => r.location_id as string);
  const locationIds = locIds.length > 0 ? locIds : [loc1];

  for (const acct of demoRoleAccounts) {
    const hash = await bcrypt.hash(acct.password, 10);
    let locationId: string | null = null;
    let locIdsArr: string[] = [];
    switch (acct.role) {
      case "manager":
        locationId = loc1;
        break;
      case "supervisor":
        locIdsArr = [...locationIds];
        break;
      case "employee":
      case "driver":
        locIdsArr = [loc1];
        if (acct.role === "driver") locationId = loc1;
        break;
    }
    const ins = await pool.query(
      `INSERT INTO users (name, email, role, password_hash, location_id, location_ids)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [acct.name, acct.email, acct.role, hash, locationId, locIdsArr]
    );
    if (ins.rowCount === 0) {
      await pool.query(
        `UPDATE users SET password_hash = $1, name = $2, role = $3, location_id = $4, location_ids = $5 WHERE email = $6`,
        [hash, acct.name, acct.role, locationId, locIdsArr, acct.email]
      );
    }
  }

  const driverRes = await pool.query(`SELECT user_id FROM users WHERE email = $1`, ["driver@vms.local"]);
  const driverUserId = driverRes.rows[0]?.user_id;
  if (!driverUserId) throw new Error("driver user missing");

  const profExists = await pool.query(`SELECT 1 FROM driver_profiles WHERE user_id = $1`, [driverUserId]);
  if (!profExists.rowCount || profExists.rowCount === 0) {
    await pool.query(
      `INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date)
       VALUES ($1, '01-06-0023456', 'B', '2020-01-15', '2026-08-20')`,
      [driverUserId]
    );
  }
}

async function seedDemoData(tm: TenantManager, tenantId: string): Promise<void> {
  const pool = await tm.pool(tenantId);
  await ensureDemoRoleUsers(tm, tenantId);

  const loc1Res = await pool.query(`SELECT location_id FROM work_locations WHERE name = 'Main Site'`);
  const loc1 = loc1Res.rows[0]?.location_id;

  let loc2: string | null = null;
  try {
    const ins = await pool.query(
      `INSERT INTO work_locations (name, type, address) VALUES ('Pokhara Lakeside Project', 'construction', 'Pokhara')
       RETURNING location_id`
    );
    loc2 = ins.rows[0]?.location_id;
  } catch {
    const r = await pool.query(`SELECT location_id FROM work_locations WHERE name = 'Pokhara Lakeside Project'`);
    loc2 = r.rows[0]?.location_id ?? null;
  }
  await pool.query(
    `INSERT INTO work_locations (name, type, address) VALUES ('Bhaktapur Ring Road Site', 'construction', 'Bhaktapur')
     ON CONFLICT DO NOTHING`
  );

  const driverRes = await pool.query(`SELECT user_id FROM users WHERE email = 'driver@vms.local'`);
  const driverUserId = driverRes.rows[0]?.user_id;

  const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM assets`);
  if (Number(countRes.rows[0]?.c) > 0) return;

  const asset1Res = await pool.query(
    `INSERT INTO assets (location_id, asset_type, reg_serial_no, make, model, year, ownership_type, status, assigned_driver_id,
      vehicle_category, department, rta_office, alert_cell_number, registration_date, bluebook_no, bluebook_issued_at, bluebook_expires_at,
      operation_mode, route_from, route_to, operation_km, operation_place, operation_hours, operation_minutes)
     VALUES ($1, 'vehicle', 'Ba 1 Pa 4521', 'Tata', 'Prima', 2022, 'owned', 'active', $2,
      'Truck', 'Transport', 'Yatayat / Transport Management Office — Kathmandu (Bagmati Province)',
      '9801112233', '2022-01-15', 'BB-4521-2022', '2022-01-15', '2027-01-14',
      'km', 'Kathmandu', 'Pokhara', 200.00, NULL, NULL, NULL) RETURNING asset_id`,
    [loc1, driverUserId]
  );
  const asset1 = asset1Res.rows[0].asset_id;

  const asset2Res = await pool.query(
    `INSERT INTO assets (location_id, asset_type, reg_serial_no, make, model, year, ownership_type, status,
      vehicle_category, department, operation_mode, operation_place, operation_hours, operation_minutes)
     VALUES ($1, 'vehicle', 'DOZ-9901', 'JCB', '3DX', 2020, 'owned', 'active',
      'Dozer', 'Operations', 'hour', 'Bhaktapur Ring Road Site', 6, 30) RETURNING asset_id`,
    [loc1]
  );
  const asset2 = asset2Res.rows[0].asset_id;

  await pool.query(
    `INSERT INTO insurance_policies (asset_id, policy_no, insurer_name, coverage_type, insured_value, premium_amount, start_date, expiry_date)
     VALUES ($1, 'POL-2025-88421', 'Nepal Insurance', 'comprehensive', 3500000, 45000, '2025-07-01', '2026-06-30')`,
    [asset1]
  );

  if (loc2 && driverUserId) {
    await pool.query(
      `INSERT INTO allocations (asset_id, from_location_id, to_location_id, driver_id, state, start_date, expected_return)
       VALUES ($1, $2, $3, $4, 'in_transit', CURRENT_DATE - 2, CURRENT_DATE + 5)`,
      [asset2, loc1, loc2, driverUserId]
    );
  }

  let supplierId: string | null = null;
  const supRes = await pool.query(
    `INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
     VALUES ('Kathmandu Auto Works', 'repair', 'Gopal Thapa', 'service@kaw.np', '9809988776', 5, true)
     RETURNING supplier_id`
  );
  supplierId = supRes.rows[0]?.supplier_id ?? null;
  if (!supplierId) {
    const r = await pool.query(`SELECT supplier_id FROM suppliers WHERE name = 'Kathmandu Auto Works' LIMIT 1`);
    supplierId = r.rows[0]?.supplier_id ?? null;
  }

  await pool.query(
    `INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
     VALUES ('Himalayan Parts Ltd', 'parts', 'Ram Shrestha', 'parts@himalayan.np', '9801234567', 4, true)`
  );

  await pool.query(
    `INSERT INTO fuel_logs (asset_id, fueled_at, odometer_km, liters, total_cost, notes)
     VALUES
       ($1, NOW() - INTERVAL '45 days', 47200, 110, 17800, 'Demo fill — Kathmandu'),
       ($1, NOW() - INTERVAL '15 days', 48500, 95, 15400, 'Demo fill — Pokhara route')`,
    [asset1]
  );

  if (supplierId) {
    await pool.query(
      `INSERT INTO maintenance_jobs (asset_id, supplier_id, scheduled_at, status, description, parts_cost, labor_cost, odometer_at_service, notes)
       VALUES ($1, $2, CURRENT_DATE + 14, 'Scheduled', 'Oil change & filter', 3500, 1500, 48500, 'Demo work order')`,
      [asset1, supplierId]
    );
  }

  await pool.query(
    `INSERT INTO notifications (recipient_id, type, title, message, channel, status, sent_at)
     SELECT user_id, 'insurance', 'Policy expiring soon', 'Insurance for Ba 1 Pa 4521 expires in 30 days', 'in_app', 'sent', NOW()
     FROM users WHERE email = $1`,
    [adminEmail]
  );
}
