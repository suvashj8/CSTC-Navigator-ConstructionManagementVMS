import bcrypt from "bcryptjs";
import fs from "fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  badRequest,
  created,
  internal,
  notFound,
  ok,
  unauthorized,
} from "../api-response";
import { signImpersonation, signPlatform, signTenant } from "../auth";
import { scanAllTenants } from "../expiry";
import { paginatedMeta, paginatedQuery } from "../pagination";
import {
  exportDir,
  exportExcel,
  exportPdf,
  findCachedJob,
  runQuery,
  rowsToJson,
} from "../reports";
import { corsHeaders, pageParams, platformContext, requireRoles, tenantContext } from "../request";
import { getTenantManager } from "../tenant-manager";
import {
  derefStr,
  datePtr,
  floatPtr,
  hashParams,
  intPtr,
  normalizeMaintStatus,
  nullIfEmpty,
  optionalUUID,
  parseDate,
  toIsoString,
  uuidToStr,
} from "../utils";
import {
  fetchAllocation,
  fetchAsset,
  fetchDriver,
  fetchFuelLog,
  fetchInsurance,
  fetchLocation,
  fetchMaintenance,
  fetchSupplier,
  fetchUser,
  scanAllocationRow,
  scanAssetRow,
} from "./entities";

type RouteContext = { params: Promise<{ path?: string[] }> };

function withCors(res: Response, req: NextRequest): Response {
  const headers = corsHeaders(req.headers.get("origin"));
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

function matchPath(segments: string[], pattern: string[]): boolean {
  if (segments.length !== pattern.length) return false;
  return pattern.every((p, i) => p.startsWith(":") || p === segments[i]);
}

function extractParams(pattern: string[], segments: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  pattern.forEach((p, i) => {
    if (p.startsWith(":")) out[p.slice(1)] = segments[i];
  });
  return out;
}

export async function handleApiV1(req: NextRequest, ctx: RouteContext): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
  }

  const { path: pathSegments } = await ctx.params;
  const segments = pathSegments ?? [];
  const method = req.method;

  try {
    let res: Response;

    // --- Public auth ---
    if (method === "POST" && segments.join("/") === "auth/login") {
      res = await tenantLogin(req);
    } else if (method === "POST" && segments.join("/") === "platform/auth/login") {
      res = await platformLogin(req);
    }
    // --- Platform ---
    else if (segments[0] === "platform") {
      const plat = await platformContext(req);
      if ("error" in plat) return withCors(plat.error, req);
      const rest = segments.slice(1);

      if (method === "GET" && rest.join("/") === "tenants") {
        res = await listTenants(plat.tm);
      } else if (method === "POST" && rest.join("/") === "tenants") {
        res = await createTenant(req, plat.tm);
      } else if (method === "PUT" && matchPath(rest, ["tenants", ":id", "status"])) {
        const p = extractParams(["tenants", ":id", "status"], rest);
        res = await updateTenantStatus(req, plat.tm, p.id);
      } else if (method === "POST" && matchPath(rest, ["tenants", ":id", "switch"])) {
        const p = extractParams(["tenants", ":id", "switch"], rest);
        res = await switchTenant(req, plat, p.id);
      } else if (method === "POST" && rest.join("/") === "jobs/expiry-scan") {
        res = await triggerExpiryScan(plat.tm);
      } else {
        return withCors(notFound("route not found"), req);
      }
    }
    // --- Tenant routes ---
    else {
      const tctx = await tenantContext(req);
      if ("error" in tctx) return withCors(tctx.error, req);
      const { pool, claims, tenantId } = tctx;
      const p = pageParams(req);

      if (method === "GET" && segments.join("/") === "dashboard/stats") {
        res = await dashboardStats(pool);
      } else if (method === "GET" && segments[0] === "assets" && segments.length === 1) {
        res = await listAssets(req, pool, p);
      } else if (method === "POST" && segments[0] === "assets" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager", "supervisor");
        if (roleErr) return withCors(roleErr, req);
        res = await createAsset(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["assets", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager", "supervisor");
        if (roleErr) return withCors(roleErr, req);
        res = await updateAsset(req, pool, extractParams(["assets", ":id"], segments).id);
      } else if (method === "DELETE" && matchPath(segments, ["assets", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager", "supervisor");
        if (roleErr) return withCors(roleErr, req);
        res = await decommissionAsset(pool, extractParams(["assets", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "allocations" && segments.length === 1) {
        res = await listAllocations(req, pool, p);
      } else if (method === "POST" && segments[0] === "allocations" && segments.length === 1) {
        res = await createAllocation(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["allocations", ":id", ":action"])) {
        const params = extractParams(["allocations", ":id", ":action"], segments);
        res = await transitionAllocation(pool, params.id, params.action);
      } else if (method === "GET" && segments[0] === "locations" && segments.length === 1) {
        res = await listLocations(pool);
      } else if (method === "POST" && segments[0] === "locations" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await createLocation(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["locations", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateLocation(req, pool, extractParams(["locations", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "users" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin");
        if (roleErr) return withCors(roleErr, req);
        res = await listUsers(req, pool, p);
      } else if (method === "POST" && segments[0] === "users" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin");
        if (roleErr) return withCors(roleErr, req);
        res = await createUser(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["users", ":id"])) {
        const roleErr = requireRoles(claims, "admin");
        if (roleErr) return withCors(roleErr, req);
        res = await updateUser(req, pool, extractParams(["users", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "drivers" && segments.length === 1) {
        res = await listDrivers(req, pool, p);
      } else if (method === "POST" && segments[0] === "drivers" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await createDriver(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["drivers", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateDriver(req, pool, extractParams(["drivers", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "insurance" && segments.length === 1) {
        res = await listInsurance(pool, p);
      } else if (method === "POST" && segments[0] === "insurance" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await createInsurance(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["insurance", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateInsurance(req, pool, extractParams(["insurance", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "suppliers" && segments.length === 1) {
        res = await listSuppliers(pool, p);
      } else if (method === "POST" && segments[0] === "suppliers" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await createSupplier(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["suppliers", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateSupplier(req, pool, extractParams(["suppliers", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "fuel-logs" && segments.length === 1) {
        res = await listFuelLogs(req, pool, p);
      } else if (method === "POST" && segments[0] === "fuel-logs" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager", "supervisor");
        if (roleErr) return withCors(roleErr, req);
        res = await createFuelLog(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["fuel-logs", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateFuelLog(req, pool, extractParams(["fuel-logs", ":id"], segments).id);
      } else if (method === "DELETE" && matchPath(segments, ["fuel-logs", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await deleteFuelLog(pool, extractParams(["fuel-logs", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "maintenance" && segments.length === 1) {
        res = await listMaintenance(req, pool, p);
      } else if (method === "POST" && segments[0] === "maintenance" && segments.length === 1) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await createMaintenance(req, pool);
      } else if (method === "PUT" && matchPath(segments, ["maintenance", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await updateMaintenance(req, pool, extractParams(["maintenance", ":id"], segments).id);
      } else if (method === "DELETE" && matchPath(segments, ["maintenance", ":id"])) {
        const roleErr = requireRoles(claims, "admin", "manager");
        if (roleErr) return withCors(roleErr, req);
        res = await deleteMaintenance(pool, extractParams(["maintenance", ":id"], segments).id);
      } else if (method === "GET" && segments[0] === "notifications" && segments.length === 1) {
        res = await listNotifications(pool, claims.sub);
      } else if (method === "PUT" && matchPath(segments, ["notifications", ":id", "read"])) {
        res = await markNotificationRead(pool, extractParams(["notifications", ":id", "read"], segments).id);
      } else if (method === "POST" && segments.join("/") === "reports/jobs") {
        res = await createReportJob(req, pool, tenantId, claims.sub);
      } else if (method === "GET" && matchPath(segments, ["reports", "jobs", ":id"])) {
        res = await getReportJob(pool, extractParams(["reports", "jobs", ":id"], segments).id);
      } else if (method === "GET" && matchPath(segments, ["reports", "jobs", ":id", "download"])) {
        res = await downloadReport(pool, extractParams(["reports", "jobs", ":id", "download"], segments).id);
      } else {
        return withCors(notFound("route not found"), req);
      }
    }

    return withCors(res, req);
  } catch (e) {
    return withCors(internal((e as Error).message), req);
  }
}

// --- Auth handlers ---

async function tenantLogin(req: NextRequest) {
  const sub = req.headers.get("x-tenant-subdomain");
  if (!sub) return badRequest("X-Tenant-Subdomain header is required");
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) return badRequest("invalid body");

  const tm = getTenantManager();
  try {
    const { ensureDemoSeeded } = await import("../ensure-demo");
    if (sub.toLowerCase() === "demo") {
      await ensureDemoSeeded(tm);
    }
    const info = await tm.bySubdomain(sub.toLowerCase());
    const pool = await tm.pool(info.id);
    const res = await pool.query(
      `SELECT user_id, name, email, role::text, password_hash, location_ids
       FROM users WHERE email = $1 AND status = 'active'`,
      [String(body.email).toLowerCase()]
    );
    const row = res.rows[0];
    if (!row || !(await bcrypt.compare(body.password, row.password_hash))) {
      return unauthorized("invalid tenant or credentials");
    }
    const locIds = (row.location_ids as string[] | null)?.map(String) ?? [];
    const login = await signTenant(row.user_id, row.email, row.name, row.role, info.id, info.name, locIds);
    return ok(login);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[tenantLogin]", e);
    }
    const msg = (e as Error).message ?? "";
    if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
      return unauthorized("database not reachable — run npm run docker:infra then npm run seed");
    }
    return unauthorized("invalid tenant or credentials");
  }
}

async function platformLogin(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) return badRequest("invalid body");
  const tm = getTenantManager();
  const res = await tm.main().query(`SELECT user_id, name, password_hash FROM super_users WHERE email = $1`, [
    String(body.email).toLowerCase(),
  ]);
  const row = res.rows[0];
  if (!row || !(await bcrypt.compare(body.password, row.password_hash))) {
    return unauthorized("invalid credentials");
  }
  const login = await signPlatform(row.user_id, body.email, row.name);
  return ok(login);
}

// --- Platform handlers ---

async function listTenants(tm: ReturnType<typeof getTenantManager>) {
  const res = await tm.main().query(
    `SELECT tenant_id, name, subdomain, db_name, plan_tier, status, created_at FROM tenants ORDER BY created_at DESC`
  );
  const list = res.rows.map((r) => ({
    id: r.tenant_id,
    name: r.name,
    subdomain: r.subdomain,
    db_name: r.db_name,
    plan_tier: r.plan_tier,
    status: r.status,
    created_at: r.created_at,
  }));
  return ok(list);
}

async function createTenant(req: NextRequest, tm: ReturnType<typeof getTenantManager>) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  const id = await tm.provision(body.name, body.subdomain, body.admin_email, body.admin_password, body.admin_name);
  return created({ tenantId: id, subdomain: body.subdomain });
}

async function updateTenantStatus(req: NextRequest, tm: ReturnType<typeof getTenantManager>, id: string) {
  const body = await req.json().catch(() => null);
  if (!body?.status) return badRequest("invalid body");
  await tm.main().query(`UPDATE tenants SET status = $1 WHERE tenant_id = $2`, [body.status, id]);
  return ok({ tenant_id: id, status: body.status });
}

async function switchTenant(
  req: NextRequest,
  plat: { claims: { sub: string }; tm: ReturnType<typeof getTenantManager> },
  tenantId: string
) {
  const info = await plat.tm.byId(tenantId).catch(() => null);
  if (!info) return notFound("tenant not found");
  const pool = await plat.tm.pool(tenantId);
  const res = await pool.query(
    `SELECT user_id, name, email, role::text, location_ids FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`
  );
  const row = res.rows[0];
  if (!row) return notFound("tenant admin not found");
  const locIds = (row.location_ids as string[] | null)?.map(String) ?? [];
  const user = {
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    location_ids: locIds,
    tenant_id: tenantId,
    tenant_name: info.name,
  };
  const login = await signImpersonation(plat.claims.sub, user);
  return ok(login);
}

async function triggerExpiryScan(tm: ReturnType<typeof getTenantManager>) {
  await scanAllTenants(tm);
  return ok({ queued: true });
}

// --- Tenant handlers ---

async function dashboardStats(pool: import("pg").Pool) {
  const q = async (sql: string) => {
    const r = await pool.query(sql);
    return Number(r.rows[0]?.count ?? 0);
  };
  return ok({
    total_assets: await q(`SELECT COUNT(*)::int AS count FROM assets WHERE status != 'decommissioned'`),
    active_allocations: await q(`SELECT COUNT(*)::int AS count FROM allocations WHERE state IN ('active','in_transit')`),
    pending_approvals: await q(`SELECT COUNT(*)::int AS count FROM allocations WHERE state = 'pending'`),
    expiring_insurance: await q(
      `SELECT COUNT(*)::int AS count FROM insurance_policies WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'`
    ),
    expiring_licenses: await q(
      `SELECT COUNT(*)::int AS count FROM driver_profiles WHERE expiry_date <= CURRENT_DATE + INTERVAL '60 days'`
    ),
    overdue_returns: await q(
      `SELECT COUNT(*)::int AS count FROM allocations WHERE state IN ('active','in_transit') AND expected_return < CURRENT_DATE`
    ),
  });
}

async function listAssets(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const operational = req.nextUrl.searchParams.get("operational") === "true";
  const assetType = req.nextUrl.searchParams.get("asset_type") ?? "";
  const operationMode = req.nextUrl.searchParams.get("operation_mode") ?? "";
  let where = "WHERE 1=1";
  const args: unknown[] = [];
  if (operational) {
    where += ` AND a.status IN ('active', 'in_transit', 'in_repair')`;
  } else if (status) {
    args.push(status);
    where += ` AND a.status = $${args.length}`;
  }
  if (assetType) {
    args.push(assetType);
    where += ` AND a.asset_type = $${args.length}`;
  }
  if (operationMode === "hour") {
    where += " AND (a.operation_mode = 'hour' OR a.vehicle_category = 'Dozer' OR a.asset_type IN ('equipment', 'tool'))";
  } else if (operationMode === "km") {
    where += " AND a.asset_type = 'vehicle' AND NOT (a.operation_mode = 'hour' OR a.vehicle_category = 'Dozer')";
  }
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    const i = args.length;
    where += ` AND (LOWER(a.reg_serial_no) LIKE $${i} OR LOWER(a.make) LIKE $${i} OR LOWER(a.model) LIKE $${i})`;
  }
  const from = ` FROM assets a LEFT JOIN work_locations wl ON wl.location_id = a.location_id LEFT JOIN users u ON u.user_id = a.assigned_driver_id `;
  const dataSQL = `SELECT a.asset_id, a.asset_type, a.reg_serial_no, a.make, a.model, a.year, a.ownership_type, a.status,
    a.location_id, wl.name AS location_name, a.assigned_driver_id, u.name AS assigned_driver_name,
    a.vehicle_category, a.department, a.rta_office, a.alert_cell_number,
    a.registration_date, a.bluebook_no, a.bluebook_issued_at, a.bluebook_expires_at,
    a.operation_mode, a.route_from, a.route_to, a.operation_km,
    a.operation_place, a.operation_hours, a.operation_minutes${from}${where} ORDER BY a.created_at DESC`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args, scanAssetRow);
  return ok(list, paginatedMeta(total, p));
}

async function createAsset(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json();
  const res = await pool.query(
    `INSERT INTO assets (asset_type, reg_serial_no, make, model, year, ownership_type, status, location_id,
      vehicle_category, department, rta_office, alert_cell_number, registration_date, bluebook_no, bluebook_issued_at, bluebook_expires_at,
      operation_mode, route_from, route_to, operation_km, operation_place, operation_hours, operation_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING asset_id`,
    [
      body.asset_type, body.reg_serial_no, body.make, body.model, body.year,
      body.ownership_type, body.status, body.location_id,
      body.vehicle_category, body.department, body.rta_office, body.alert_cell_number,
      body.registration_date, body.bluebook_no, body.bluebook_issued_at, body.bluebook_expires_at,
      body.operation_mode, body.route_from, body.route_to, body.operation_km,
      body.operation_place, body.operation_hours, body.operation_minutes,
    ]
  );
  const id = res.rows[0].asset_id;
  const asset = await fetchAsset(pool, id);
  return created(asset ?? { id });
}

async function updateAsset(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json();
  await pool.query(
    `UPDATE assets SET asset_type=$1, reg_serial_no=$2, make=$3, model=$4, year=$5, ownership_type=$6, status=$7, location_id=$8,
      vehicle_category=$9, department=$10, rta_office=$11, alert_cell_number=$12, registration_date=$13,
      bluebook_no=$14, bluebook_issued_at=$15, bluebook_expires_at=$16,
      operation_mode=$17, route_from=$18, route_to=$19, operation_km=$20,
      operation_place=$21, operation_hours=$22, operation_minutes=$23 WHERE asset_id=$24`,
    [
      body.asset_type, body.reg_serial_no, body.make, body.model, body.year, body.ownership_type, body.status, body.location_id,
      body.vehicle_category, body.department, body.rta_office, body.alert_cell_number, body.registration_date,
      body.bluebook_no, body.bluebook_issued_at, body.bluebook_expires_at,
      body.operation_mode, body.route_from, body.route_to, body.operation_km,
      body.operation_place, body.operation_hours, body.operation_minutes, id,
    ]
  );
  const asset = await fetchAsset(pool, id);
  return ok(asset ?? { id });
}

async function decommissionAsset(pool: import("pg").Pool, id: string) {
  await pool.query(`UPDATE assets SET status = 'decommissioned' WHERE asset_id = $1`, [id]);
  return ok({ ok: true });
}

async function listAllocations(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const state = req.nextUrl.searchParams.get("state") ?? "";
  let where = "";
  const args: unknown[] = [];
  if (state) {
    args.push(state);
    where = ` WHERE al.state = $${args.length}`;
  }
  const from = ` FROM allocations al JOIN assets a ON a.asset_id = al.asset_id JOIN work_locations fl ON fl.location_id = al.from_location_id JOIN work_locations tl ON tl.location_id = al.to_location_id JOIN users d ON d.user_id = al.driver_id`;
  const dataSQL = `SELECT al.alloc_id, al.asset_id, a.reg_serial_no || ' — ' || a.make || ' ' || a.model AS asset_label,
    al.from_location_id, fl.name AS from_location_name, al.to_location_id, tl.name AS to_location_name,
    al.driver_id, d.name AS driver_name, al.state, al.start_date, al.expected_return${from}${where} ORDER BY al.created_at DESC`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args, scanAllocationRow);
  return ok(list, paginatedMeta(total, p));
}

async function createAllocation(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json();
  const res = await pool.query(
    `INSERT INTO allocations (asset_id, from_location_id, to_location_id, driver_id, start_date, expected_return)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING alloc_id`,
    [body.asset_id, body.from_location_id, body.to_location_id, body.driver_id, body.start_date, body.expected_return]
  );
  const id = res.rows[0].alloc_id;
  const alloc = await fetchAllocation(pool, id);
  return created(alloc ?? { id, state: "pending" });
}

async function transitionAllocation(pool: import("pg").Pool, id: string, action: string) {
  const next: Record<string, string> = {
    approve: "approved",
    dispatch: "in_transit",
    receive: "active",
    release: "released",
    cancel: "cancelled",
  };
  const state = next[action];
  if (!state) return badRequest("invalid action");
  await pool.query(`UPDATE allocations SET state = $1 WHERE alloc_id = $2`, [state, id]);
  const alloc = await fetchAllocation(pool, id);
  return ok(alloc ?? { id, state });
}

async function listLocations(pool: import("pg").Pool) {
  const res = await pool.query(
    `SELECT wl.location_id, wl.name, wl.type, wl.address, wl.manager_id, u.name AS manager_name, wl.is_custom
     FROM work_locations wl LEFT JOIN users u ON u.user_id = wl.manager_id ORDER BY wl.name`
  );
  const list = res.rows.map((r) => ({
    id: r.location_id,
    name: r.name,
    type: r.type,
    address: r.address,
    manager_id: r.manager_id,
    manager_name: r.manager_name,
    is_custom: r.is_custom,
  }));
  return ok(list);
}

async function createLocation(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.name) return badRequest("name is required");
  const mid = optionalUUID(body.manager_id);
  const res = await pool.query(
    `INSERT INTO work_locations (name, type, address, manager_id) VALUES ($1,$2,$3,$4) RETURNING location_id`,
    [body.name, body.type || "construction", body.address ?? "", mid]
  );
  const loc = await fetchLocation(pool, res.rows[0].location_id);
  return created(loc);
}

async function updateLocation(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  const mid = optionalUUID(body.manager_id);
  await pool.query(`UPDATE work_locations SET name=$1, type=$2, address=$3, manager_id=$4 WHERE location_id=$5`, [
    body.name, body.type, body.address, mid, id,
  ]);
  const loc = await fetchLocation(pool, id);
  return ok(loc);
}

async function listUsers(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  let where = "";
  const args: unknown[] = [];
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    where = ` WHERE LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR LOWER(u.role::text) LIKE $1`;
  }
  const from = ` FROM users u LEFT JOIN work_locations wl ON wl.location_id = u.location_id`;
  const dataSQL = `SELECT u.user_id, u.name, u.email, u.role, u.status, u.location_id, wl.name AS location_name${from}${where} ORDER BY u.created_at DESC`;
  const { list, total } = await paginatedQuery(
    pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args,
    (r) => ({
      id: r.user_id, name: r.name, email: r.email, role: r.role, status: r.status,
      location_id: r.location_id, location_name: r.location_name,
    })
  );
  return ok(list, paginatedMeta(total, p));
}

async function createUser(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password) return badRequest("name, email, and password are required");
  const hash = await bcrypt.hash(body.password, 10);
  const locId = optionalUUID(body.location_id);
  const res = await pool.query(
    `INSERT INTO users (name, email, role, password_hash, location_id) VALUES ($1,$2,$3,$4,$5) RETURNING user_id`,
    [body.name, String(body.email).toLowerCase(), body.role || "employee", hash, locId]
  );
  const user = await fetchUser(pool, res.rows[0].user_id);
  return created(user);
}

async function updateUser(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  const locId = optionalUUID(body.location_id);
  if (body.password) {
    const hash = await bcrypt.hash(body.password, 10);
    await pool.query(`UPDATE users SET name=$1, role=$2, status=$3, location_id=$4, password_hash=$5 WHERE user_id=$6`, [
      body.name, body.role, body.status, locId, hash, id,
    ]);
  } else {
    await pool.query(`UPDATE users SET name=$1, role=$2, status=$3, location_id=$4 WHERE user_id=$5`, [
      body.name, body.role, body.status, locId, id,
    ]);
  }
  const user = await fetchUser(pool, id);
  return ok(user);
}

async function listDrivers(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  let where = "";
  const args: unknown[] = [];
  if (search) {
    args.push(`%${search.toLowerCase()}%`);
    where = ` WHERE LOWER(u.name) LIKE $1 OR LOWER(d.license_no) LIKE $1`;
  }
  const from = ` FROM driver_profiles d JOIN users u ON u.user_id = d.user_id`;
  const dataSQL = `SELECT d.driver_id, d.user_id, u.name, u.email, d.license_no, d.license_class, d.issue_date, d.expiry_date,
    CASE WHEN d.expiry_date < CURRENT_DATE THEN 'expired' WHEN d.expiry_date <= CURRENT_DATE + 60 THEN 'expiring' ELSE 'valid' END AS status${from}${where} ORDER BY d.expiry_date`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args, (r) => ({
    id: r.driver_id, user_id: r.user_id, name: r.name, email: r.email,
    license_no: r.license_no, license_class: r.license_class,
    issue_date: datePtr(r.issue_date), expiry_date: datePtr(r.expiry_date), status: r.status,
  }));
  return ok(list, paginatedMeta(total, p));
}

async function createDriver(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.license_no) return badRequest("name, email, and license_no are required");
  const password = body.password || "driver123";
  const hash = await bcrypt.hash(password, 10);
  const locId = optionalUUID(body.location_id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const uRes = await client.query(
      `INSERT INTO users (name, email, role, password_hash, location_id) VALUES ($1,$2,'driver',$3,$4) RETURNING user_id`,
      [body.name, String(body.email).toLowerCase(), hash, locId]
    );
    const uid = uRes.rows[0].user_id;
    const dRes = await client.query(
      `INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date, endorsements)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING driver_id`,
      [uid, body.license_no, body.license_class || "B", body.issue_date, body.expiry_date, body.endorsements ?? ""]
    );
    await client.query("COMMIT");
    const driver = await fetchDriver(pool, dRes.rows[0].driver_id);
    return created(driver);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function updateDriver(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  await pool.query(
    `UPDATE driver_profiles SET license_no=$1, license_class=$2, issue_date=$3, expiry_date=$4, endorsements=$5 WHERE driver_id=$6`,
    [body.license_no, body.license_class, body.issue_date, body.expiry_date, body.endorsements ?? "", id]
  );
  const driver = await fetchDriver(pool, id);
  return ok(driver);
}

async function listInsurance(pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const from = ` FROM insurance_policies ip JOIN assets a ON a.asset_id = ip.asset_id`;
  const dataSQL = `SELECT ip.policy_id, ip.asset_id, a.reg_serial_no AS asset_label, ip.policy_no, ip.insurer_name, ip.coverage_type, ip.insured_value, ip.premium_amount, ip.start_date, ip.expiry_date, ip.status${from} ORDER BY ip.expiry_date`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}`, [], dataSQL, [], (r) => ({
    id: r.policy_id, asset_id: r.asset_id, asset_label: r.asset_label, policy_no: r.policy_no,
    insurer_name: r.insurer_name, coverage_type: r.coverage_type,
    insured_value: Number(r.insured_value), premium_amount: Number(r.premium_amount),
    start_date: datePtr(r.start_date), expiry_date: datePtr(r.expiry_date), status: r.status,
  }));
  return ok(list, paginatedMeta(total, p));
}

async function createInsurance(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.asset_id || !body?.policy_no) return badRequest("asset_id and policy_no are required");
  const res = await pool.query(
    `INSERT INTO insurance_policies (asset_id, policy_no, insurer_name, coverage_type, insured_value, premium_amount, start_date, expiry_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING policy_id`,
    [body.asset_id, body.policy_no, body.insurer_name, body.coverage_type, body.insured_value, body.premium_amount, body.start_date, body.expiry_date, body.status || "active"]
  );
  const pol = await fetchInsurance(pool, res.rows[0].policy_id);
  return created(pol);
}

async function updateInsurance(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  await pool.query(
    `UPDATE insurance_policies SET policy_no=$1, insurer_name=$2, coverage_type=$3, insured_value=$4,
     premium_amount=$5, start_date=$6, expiry_date=$7, status=$8 WHERE policy_id=$9`,
    [body.policy_no, body.insurer_name, body.coverage_type, body.insured_value, body.premium_amount, body.start_date, body.expiry_date, body.status, id]
  );
  const pol = await fetchInsurance(pool, id);
  return ok(pol);
}

async function listSuppliers(pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const from = ` FROM suppliers`;
  const dataSQL = `SELECT supplier_id, name, category, contact_name, email, phone, rating, is_preferred${from} ORDER BY name`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}`, [], dataSQL, [], (r) => ({
    id: r.supplier_id, name: r.name, category: r.category, contact_name: r.contact_name,
    email: r.email, phone: r.phone, rating: r.rating, is_preferred: r.is_preferred,
  }));
  return ok(list, paginatedMeta(total, p));
}

async function createSupplier(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.category) return badRequest("name and category are required");
  const res = await pool.query(
    `INSERT INTO suppliers (name, category, contact_name, email, phone, rating, is_preferred)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING supplier_id`,
    [body.name, body.category, body.contact_name, body.email, body.phone, body.rating || 3, body.is_preferred ?? false]
  );
  const sup = await fetchSupplier(pool, res.rows[0].supplier_id);
  return created(sup);
}

async function updateSupplier(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  await pool.query(
    `UPDATE suppliers SET name=$1, category=$2, contact_name=$3, email=$4, phone=$5, rating=$6, is_preferred=$7 WHERE supplier_id=$8`,
    [body.name, body.category, body.contact_name, body.email, body.phone, body.rating, body.is_preferred, id]
  );
  const sup = await fetchSupplier(pool, id);
  return ok(sup);
}

async function listFuelLogs(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const assetId = req.nextUrl.searchParams.get("asset_id");
  let where = "WHERE 1=1";
  const args: unknown[] = [];
  if (assetId) {
    args.push(assetId);
    where += ` AND f.asset_id = $${args.length}`;
  }
  const from = ` FROM fuel_logs f LEFT JOIN assets a ON a.asset_id = f.asset_id LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id `;
  const dataSQL = `SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
    f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes${from}${where} ORDER BY f.fueled_at DESC`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args, (r) => ({
    id: r.fuel_log_id, asset_id: r.asset_id, asset_label: derefStr(r.reg_serial_no),
    supplier_id: uuidToStr(r.supplier_id), supplier_name: derefStr(r.name),
    fueled_at: toIsoString(r.fueled_at), odometer_km: intPtr(r.odometer_km),
    liters: floatPtr(r.liters != null ? Number(r.liters) : null),
    total_cost: floatPtr(r.total_cost != null ? Number(r.total_cost) : null),
    notes: derefStr(r.notes),
  }));
  return ok(list, paginatedMeta(total, p));
}

async function createFuelLog(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.asset_id) return badRequest("asset_id is required");
  let fueledAt = new Date();
  if (body.fueled_at) {
    const t = new Date(body.fueled_at);
    if (!Number.isNaN(t.getTime())) fueledAt = t;
  }
  const sid = optionalUUID(body.supplier_id);
  const res = await pool.query(
    `INSERT INTO fuel_logs (asset_id, supplier_id, fueled_at, odometer_km, liters, total_cost, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING fuel_log_id`,
    [body.asset_id, sid, fueledAt, body.odometer_km ?? null, body.liters ?? null, body.total_cost ?? null, nullIfEmpty(body.notes)]
  );
  const row = await fetchFuelLog(pool, res.rows[0].fuel_log_id);
  return created(row);
}

async function updateFuelLog(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  let fueledAt = new Date();
  if (body.fueled_at) {
    const t = new Date(body.fueled_at);
    if (!Number.isNaN(t.getTime())) fueledAt = t;
  }
  const sid = optionalUUID(body.supplier_id);
  await pool.query(
    `UPDATE fuel_logs SET supplier_id=$1, fueled_at=$2, odometer_km=$3, liters=$4, total_cost=$5, notes=$6 WHERE fuel_log_id=$7`,
    [sid, fueledAt, body.odometer_km ?? null, body.liters ?? null, body.total_cost ?? null, nullIfEmpty(body.notes), id]
  );
  const row = await fetchFuelLog(pool, id);
  return ok(row);
}

async function deleteFuelLog(pool: import("pg").Pool, id: string) {
  await pool.query(`DELETE FROM fuel_logs WHERE fuel_log_id=$1`, [id]);
  return ok({ ok: true });
}

async function listMaintenance(req: NextRequest, pool: import("pg").Pool, p: ReturnType<typeof pageParams>) {
  const assetId = req.nextUrl.searchParams.get("asset_id");
  let where = "WHERE 1=1";
  const args: unknown[] = [];
  if (assetId) {
    args.push(assetId);
    where += ` AND m.asset_id = $${args.length}`;
  }
  const from = ` FROM maintenance_jobs m LEFT JOIN assets a ON a.asset_id = m.asset_id LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id `;
  const dataSQL = `SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
    m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
    m.odometer_at_service, m.notes${from}${where} ORDER BY m.created_at DESC`;
  const { list, total } = await paginatedQuery(pool, p, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL, args, (r) => ({
    id: r.job_id, asset_id: r.asset_id, asset_label: derefStr(r.reg_serial_no),
    supplier_id: uuidToStr(r.supplier_id), supplier_name: derefStr(r.name),
    scheduled_at: datePtr(r.scheduled_at), completed_at: datePtr(r.completed_at),
    status: derefStr(r.status), description: derefStr(r.description),
    parts_cost: floatPtr(r.parts_cost != null ? Number(r.parts_cost) : null),
    labor_cost: floatPtr(r.labor_cost != null ? Number(r.labor_cost) : null),
    odometer_at_service: intPtr(r.odometer_at_service), notes: derefStr(r.notes),
  }));
  return ok(list, paginatedMeta(total, p));
}

async function createMaintenance(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  if (!body?.asset_id) return badRequest("asset_id is required");
  const sid = optionalUUID(body.supplier_id);
  const status = normalizeMaintStatus(body.status ?? "");
  const sched = parseDate(body.scheduled_at);
  let comp = parseDate(body.completed_at);
  if (status === "Completed" && !comp) comp = new Date();
  const res = await pool.query(
    `INSERT INTO maintenance_jobs (asset_id, supplier_id, scheduled_at, completed_at, status, description,
      parts_cost, labor_cost, odometer_at_service, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING job_id`,
    [body.asset_id, sid, sched, comp, status, nullIfEmpty(body.description), body.parts_cost ?? null, body.labor_cost ?? null, body.odometer_at_service ?? null, nullIfEmpty(body.notes)]
  );
  const row = await fetchMaintenance(pool, res.rows[0].job_id);
  return created(row);
}

async function updateMaintenance(req: NextRequest, pool: import("pg").Pool, id: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  const sid = optionalUUID(body.supplier_id);
  const status = normalizeMaintStatus(body.status ?? "");
  const sched = parseDate(body.scheduled_at);
  const comp = parseDate(body.completed_at);
  await pool.query(
    `UPDATE maintenance_jobs SET supplier_id=$1, scheduled_at=$2, completed_at=$3, status=$4, description=$5,
      parts_cost=$6, labor_cost=$7, odometer_at_service=$8, notes=$9 WHERE job_id=$10`,
    [sid, sched, comp, status, nullIfEmpty(body.description), body.parts_cost ?? null, body.labor_cost ?? null, body.odometer_at_service ?? null, nullIfEmpty(body.notes), id]
  );
  const row = await fetchMaintenance(pool, id);
  return ok(row);
}

async function deleteMaintenance(pool: import("pg").Pool, id: string) {
  await pool.query(`DELETE FROM maintenance_jobs WHERE job_id=$1`, [id]);
  return ok({ ok: true });
}

async function listNotifications(pool: import("pg").Pool, userId: string) {
  const res = await pool.query(
    `SELECT notif_id, type, title, message, channel, COALESCE(sent_at, created_at) AS sent_at, status, read_at IS NOT NULL AS read
     FROM notifications WHERE recipient_id = $1 OR recipient_id IS NULL ORDER BY created_at DESC LIMIT 100`,
    [userId]
  );
  const list = res.rows.map((r) => ({
    id: r.notif_id, type: r.type, title: r.title, message: r.message,
    channel: r.channel, sent_at: r.sent_at, status: r.status, read: r.read,
  }));
  return ok(list);
}

async function markNotificationRead(pool: import("pg").Pool, id: string) {
  await pool.query(`UPDATE notifications SET read_at = NOW() WHERE notif_id = $1`, [id]);
  return ok({ ok: true });
}

async function createReportJob(req: NextRequest, pool: import("pg").Pool, tenantId: string, userId: string) {
  const body = await req.json().catch(() => null);
  if (!body?.report_type) return badRequest("invalid body");
  const exportFormat = body.export_format || "json";
  const params = body.params ? JSON.stringify(body.params) : "{}";
  const h = hashParams(body.report_type, exportFormat, params);
  const cached = await findCachedJob(pool, h);
  if (cached) return getReportJob(pool, cached);

  const ins = await pool.query(
    `INSERT INTO report_jobs (report_type, export_format, params, params_hash, requested_by, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING job_id`,
    [body.report_type, exportFormat, params, h, userId]
  );
  const jobId = ins.rows[0].job_id;
  await runReportSync(pool, jobId, body.report_type, exportFormat);
  return getReportJob(pool, jobId);
}

async function runReportSync(pool: import("pg").Pool, jobId: string, reportType: string, format: string) {
  await pool.query(`UPDATE report_jobs SET status = 'processing' WHERE job_id = $1`, [jobId]);
  try {
    const rows = await runQuery(pool, reportType);
    const result = rowsToJson(rows);
    let filePath: string | null = null;
    let fileName: string | null = null;
    const dir = exportDir();
    if (format === "pdf") {
      const exp = await exportPdf(dir, reportType, rows);
      filePath = exp.path;
      fileName = exp.name;
    } else if (format === "xlsx") {
      const exp = await exportExcel(dir, reportType, rows);
      filePath = exp.path;
      fileName = exp.name;
    }
    await pool.query(
      `UPDATE report_jobs SET status = 'completed', result = $2, file_path = $3, file_name = $4, completed_at = NOW() WHERE job_id = $1`,
      [jobId, result, filePath, fileName]
    );
  } catch (e) {
    await pool.query(`UPDATE report_jobs SET status = 'failed', error_message = $2 WHERE job_id = $1`, [jobId, (e as Error).message]);
  }
}

async function getReportJob(pool: import("pg").Pool, id: string) {
  const res = await pool.query(
    `SELECT job_id, report_type, export_format, status, result, file_name, error_message, created_at, completed_at
     FROM report_jobs WHERE job_id = $1`,
    [id]
  );
  const r = res.rows[0];
  if (!r) return notFound("report job not found");
  const job: Record<string, unknown> = {
    id: r.job_id,
    report_type: r.report_type,
    export_format: r.export_format,
    status: r.status,
    created_at: r.created_at,
    completed_at: r.completed_at,
  };
  if (r.result) {
    try {
      job.result = JSON.parse(Buffer.from(r.result).toString("utf8"));
    } catch {
      job.result = r.result;
    }
  }
  if (r.error_message) job.error_message = r.error_message;
  if (r.file_name) job.file_name = r.file_name;
  if (r.export_format !== "json" && r.status === "completed" && r.file_name) {
    job.download_url = `/api/v1/reports/jobs/${r.job_id}/download`;
  } else {
    job.download_url = null;
  }
  return ok(job);
}

async function downloadReport(pool: import("pg").Pool, id: string) {
  const res = await pool.query(`SELECT file_path, file_name, export_format FROM report_jobs WHERE job_id = $1`, [id]);
  const r = res.rows[0];
  if (!r?.file_path) return notFound("export file not found");
  try {
    const buf = await fs.promises.readFile(r.file_path);
    let mime = "application/octet-stream";
    if (r.export_format === "pdf") mime = "application/pdf";
    else if (r.export_format === "xlsx") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename=${r.file_name}`,
      },
    });
  } catch {
    return notFound("export file not found");
  }
}
