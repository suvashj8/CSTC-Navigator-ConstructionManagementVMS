import type { Pool } from "pg";
import { derefStr, datePtr, floatPtr, intPtr, uuidToStr } from "../utils";

const assetRegistrySelect = `, a.vehicle_category, a.department, a.rta_office, a.alert_cell_number,
  a.registration_date, a.bluebook_no, a.bluebook_issued_at, a.bluebook_expires_at,
  a.operation_mode, a.operation_mode_label, a.operation_custom_fields,
  a.route_from, a.route_to, a.operation_km,
  a.operation_place, a.operation_hours, a.operation_minutes`;

function assetRegistryMap(row: Record<string, unknown>) {
  return {
    vehicle_category: row.vehicle_category,
    department: row.department,
    rta_office: row.rta_office,
    alert_cell_number: row.alert_cell_number,
    registration_date: row.registration_date,
    bluebook_no: row.bluebook_no,
    bluebook_issued_at: row.bluebook_issued_at,
    bluebook_expires_at: row.bluebook_expires_at,
    operation_mode: row.operation_mode,
    operation_mode_label: row.operation_mode_label,
    operation_custom_fields:
      row.operation_custom_fields && typeof row.operation_custom_fields === "object"
        ? row.operation_custom_fields
        : {},
    route_from: row.route_from,
    route_to: row.route_to,
    operation_km: row.operation_km != null ? Number(row.operation_km) : null,
    operation_place: row.operation_place,
    operation_hours: row.operation_hours,
    operation_minutes: row.operation_minutes,
  };
}

export async function fetchAsset(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT a.asset_id, a.asset_type, a.reg_serial_no, a.make, a.model, a.year, a.ownership_type, a.status,
            a.location_id, wl.name AS location_name, a.assigned_driver_id, u.name AS assigned_driver_name${assetRegistrySelect}
     FROM assets a
     LEFT JOIN work_locations wl ON wl.location_id = a.location_id
     LEFT JOIN users u ON u.user_id = a.assigned_driver_id
     WHERE a.asset_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.asset_id,
    asset_type: r.asset_type,
    reg_serial_no: r.reg_serial_no,
    make: r.make,
    model: r.model,
    year: r.year,
    ownership_type: r.ownership_type,
    status: r.status,
    location_id: r.location_id,
    location_name: r.location_name,
    assigned_driver_id: r.assigned_driver_id,
    assigned_driver_name: r.assigned_driver_name,
    ...assetRegistryMap(r),
  };
}

export function scanAssetRow(r: Record<string, unknown>) {
  return {
    id: r.asset_id,
    asset_type: r.asset_type,
    reg_serial_no: r.reg_serial_no,
    make: r.make,
    model: r.model,
    year: r.year,
    ownership_type: r.ownership_type,
    status: r.status,
    location_id: r.location_id,
    location_name: r.location_name,
    assigned_driver_id: r.assigned_driver_id,
    assigned_driver_name: r.assigned_driver_name,
    ...assetRegistryMap(r),
  };
}

const allocationFromSql = ` FROM allocations al
     JOIN assets a ON a.asset_id = al.asset_id
     JOIN work_locations fl ON fl.location_id = al.from_location_id
     JOIN work_locations tl ON tl.location_id = al.to_location_id
     LEFT JOIN users d ON d.user_id = al.driver_id
     LEFT JOIN users recv ON recv.user_id = al.receiver_user_id`;

const allocationSelectSql = `SELECT al.alloc_id, al.group_id, al.asset_id,
    a.reg_serial_no || ' — ' || a.make || ' ' || a.model AS asset_label,
    al.from_location_id, fl.name AS from_location_name, al.to_location_id, tl.name AS to_location_name,
    al.driver_id, COALESCE(d.name, al.external_driver_name) AS driver_name,
    al.external_driver_name, al.external_driver_contact,
    al.receiver_user_id, al.receiver_role,
    COALESCE(recv.name, al.receiver_name) AS receiver_name,
    al.receiver_contact, al.approved_by, al.state, al.start_date, al.expected_return, al.actual_return`;

function mapAllocationRow(r: Record<string, unknown>) {
  return {
    id: r.alloc_id,
    group_id: r.group_id ?? null,
    asset_id: r.asset_id,
    asset_label: r.asset_label,
    from_location_id: r.from_location_id,
    from_location_name: r.from_location_name,
    to_location_id: r.to_location_id,
    to_location_name: r.to_location_name,
    driver_id: r.driver_id ?? null,
    driver_name: r.driver_name ?? null,
    external_driver_name: r.external_driver_name ?? null,
    external_driver_contact: r.external_driver_contact ?? null,
    receiver_user_id: r.receiver_user_id ?? null,
    receiver_role: r.receiver_role ?? null,
    receiver_name: r.receiver_name ?? null,
    receiver_contact: r.receiver_contact ?? null,
    approved_by: r.approved_by ?? null,
    state: r.state,
    start_date: datePtr(r.start_date),
    expected_return: datePtr(r.expected_return),
    actual_return: datePtr(r.actual_return),
  };
}

export async function fetchAllocation(pool: Pool, id: string) {
  const res = await pool.query(`${allocationSelectSql}${allocationFromSql} WHERE al.alloc_id = $1`, [id]);
  const r = res.rows[0];
  if (!r) return null;
  return mapAllocationRow(r);
}

export function scanAllocationRow(r: Record<string, unknown>) {
  const mapped = mapAllocationRow(r);
  return {
    id: mapped.id,
    group_id: mapped.group_id,
    asset_id: mapped.asset_id,
    asset_label: mapped.asset_label,
    from_location_id: mapped.from_location_id,
    from_location_name: mapped.from_location_name,
    to_location_id: mapped.to_location_id,
    to_location_name: mapped.to_location_name,
    driver_id: mapped.driver_id,
    driver_name: mapped.driver_name,
    receiver_user_id: mapped.receiver_user_id,
    receiver_role: mapped.receiver_role,
    receiver_name: mapped.receiver_name,
    state: mapped.state,
    start_date: mapped.start_date,
    expected_return: mapped.expected_return,
  };
}

export async function fetchLocation(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT wl.location_id, wl.name, wl.type, wl.address, wl.manager_id, u.name AS manager_name, wl.is_custom
     FROM work_locations wl LEFT JOIN users u ON u.user_id = wl.manager_id
     WHERE wl.location_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.location_id,
    name: r.name,
    type: r.type,
    address: r.address,
    manager_id: r.manager_id,
    manager_name: r.manager_name,
    is_custom: r.is_custom,
  };
}

export async function fetchUser(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.role, u.status, u.location_id, wl.name AS location_name
     FROM users u LEFT JOIN work_locations wl ON wl.location_id = u.location_id
     WHERE u.user_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.user_id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    location_id: r.location_id,
    location_name: r.location_name,
  };
}

export async function fetchDriver(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT d.driver_id, d.user_id, u.name, u.email, d.license_no, d.license_class, d.issue_date, d.expiry_date,
      d.contact_phone, d.endorsements,
      CASE WHEN d.expiry_date < CURRENT_DATE THEN 'expired' WHEN d.expiry_date <= CURRENT_DATE + 60 THEN 'expiring' ELSE 'valid' END AS status
     FROM driver_profiles d JOIN users u ON u.user_id = d.user_id WHERE d.driver_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.driver_id,
    user_id: r.user_id,
    name: r.name,
    email: r.email,
    license_no: r.license_no,
    license_class: r.license_class,
    issue_date: datePtr(r.issue_date),
    expiry_date: datePtr(r.expiry_date),
    contact_phone: r.contact_phone ?? "",
    endorsements: r.endorsements ?? "",
    status: r.status,
  };
}

export async function fetchInsurance(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT ip.policy_id, ip.asset_id, a.reg_serial_no AS asset_label, ip.policy_no, ip.insurer_name, ip.coverage_type,
            ip.insured_value, ip.premium_amount, ip.start_date, ip.expiry_date, ip.status
     FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id WHERE ip.policy_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.policy_id,
    asset_id: r.asset_id,
    asset_label: r.asset_label,
    policy_no: r.policy_no,
    insurer_name: r.insurer_name,
    coverage_type: r.coverage_type,
    insured_value: Number(r.insured_value),
    premium_amount: Number(r.premium_amount),
    start_date: datePtr(r.start_date),
    expiry_date: datePtr(r.expiry_date),
    status: r.status,
  };
}

export async function fetchSupplier(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT supplier_id, name, category, contact_name, email, phone, rating, is_preferred
     FROM suppliers WHERE supplier_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.supplier_id,
    name: r.name,
    category: r.category,
    contact_name: r.contact_name,
    email: r.email,
    phone: r.phone,
    rating: r.rating,
    is_preferred: r.is_preferred,
  };
}

export async function fetchFuelLog(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
            f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes
     FROM fuel_logs f
     LEFT JOIN assets a ON a.asset_id = f.asset_id
     LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id
     WHERE f.fuel_log_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.fuel_log_id,
    asset_id: r.asset_id,
    asset_label: derefStr(r.reg_serial_no),
    supplier_id: uuidToStr(r.supplier_id),
    supplier_name: derefStr(r.name),
    fueled_at: new Date(r.fueled_at).toISOString(),
    odometer_km: intPtr(r.odometer_km),
    liters: floatPtr(r.liters != null ? Number(r.liters) : null),
    total_cost: floatPtr(r.total_cost != null ? Number(r.total_cost) : null),
    notes: derefStr(r.notes),
  };
}

export async function fetchMaintenance(pool: Pool, id: string) {
  const res = await pool.query(
    `SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
            m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
            m.odometer_at_service, m.notes
     FROM maintenance_jobs m
     LEFT JOIN assets a ON a.asset_id = m.asset_id
     LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id
     WHERE m.job_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.job_id,
    asset_id: r.asset_id,
    asset_label: derefStr(r.reg_serial_no),
    supplier_id: uuidToStr(r.supplier_id),
    supplier_name: derefStr(r.name),
    scheduled_at: datePtr(r.scheduled_at),
    completed_at: datePtr(r.completed_at),
    status: derefStr(r.status),
    description: derefStr(r.description),
    parts_cost: floatPtr(r.parts_cost != null ? Number(r.parts_cost) : null),
    labor_cost: floatPtr(r.labor_cost != null ? Number(r.labor_cost) : null),
    odometer_at_service: intPtr(r.odometer_at_service),
    notes: derefStr(r.notes),
  };
}
