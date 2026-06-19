import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import { ok, created, badRequest } from "../../api-response";
import type { TenantRouteEntry } from "./types";

const catalogListQueries: Record<string, string> = {
  "vehicle-categories": `SELECT vehicle_category_id, name, description, sort_order FROM vehicle_categories ORDER BY sort_order, name`,
  "vehicle-departments": `SELECT vehicle_department_id, name, description, sort_order FROM vehicle_departments ORDER BY sort_order, name`,
  "vehicle-makes": `SELECT vehicle_make_id, name, country, sort_order FROM vehicle_makes ORDER BY sort_order, name`,
  "operation-modes": `SELECT operation_mode_id, key, label, description, unit, requires_odometer, sort_order FROM operation_modes ORDER BY sort_order, key`,
  "asset-types": `SELECT asset_type_id, key, label, description, sort_order FROM asset_types ORDER BY sort_order, key`,
  "ownership-types": `SELECT ownership_type_id, key, label, description, sort_order FROM ownership_types ORDER BY sort_order, key`,
  "maintenance-statuses": `SELECT maintenance_status_id, key, label, description, sort_order FROM maintenance_statuses ORDER BY sort_order, key`,
  "supplier-categories": `SELECT supplier_category_id, key, label, description, sort_order FROM supplier_categories ORDER BY sort_order, key`,
  "location-types": `SELECT location_type_id, key, label, description, sort_order FROM location_types ORDER BY sort_order, key`,
  "insurance-statuses": `SELECT insurance_status_id, key, label, description, sort_order FROM insurance_statuses ORDER BY sort_order, key`,
  "insurance-coverage-types": `SELECT insurance_coverage_type_id, key, label, description, sort_order FROM insurance_coverage_types ORDER BY sort_order, key`,
};

const catalogInsertQueries: Record<string, { query: string; params: (body: Record<string, unknown>) => unknown[] }> = {
  "vehicle-categories": {
    query: `INSERT INTO vehicle_categories (name, description, sort_order) VALUES ($1,$2,$3) RETURNING vehicle_category_id`,
    params: (b) => [b.name, b.description ?? null, b.sort_order ?? 0],
  },
  "vehicle-departments": {
    query: `INSERT INTO vehicle_departments (name, description, sort_order) VALUES ($1,$2,$3) RETURNING vehicle_department_id`,
    params: (b) => [b.name, b.description ?? null, b.sort_order ?? 0],
  },
  "vehicle-makes": {
    query: `INSERT INTO vehicle_makes (name, country, sort_order) VALUES ($1,$2,$3) RETURNING vehicle_make_id`,
    params: (b) => [b.name, b.country ?? null, b.sort_order ?? 0],
  },
  "operation-modes": {
    query: `INSERT INTO operation_modes (key, label, description, unit, requires_odometer, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING operation_mode_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.unit ?? null, b.requires_odometer ?? false, b.sort_order ?? 0],
  },
  "asset-types": {
    query: `INSERT INTO asset_types (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING asset_type_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "ownership-types": {
    query: `INSERT INTO ownership_types (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING ownership_type_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "maintenance-statuses": {
    query: `INSERT INTO maintenance_statuses (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING maintenance_status_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "supplier-categories": {
    query: `INSERT INTO supplier_categories (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING supplier_category_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "location-types": {
    query: `INSERT INTO location_types (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING location_type_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "insurance-statuses": {
    query: `INSERT INTO insurance_statuses (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING insurance_status_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
  "insurance-coverage-types": {
    query: `INSERT INTO insurance_coverage_types (key, label, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING insurance_coverage_type_id`,
    params: (b) => [b.key, b.label, b.description ?? null, b.sort_order ?? 0],
  },
};

const catalogRoles: Record<string, string[] | undefined> = {
  "vehicle-categories": ["admin", "manager", "supervisor"],
  "vehicle-departments": ["admin", "manager", "supervisor"],
  "vehicle-makes": ["admin", "manager", "supervisor"],
  "operation-modes": ["admin", "manager", "supervisor"],
  "asset-types": ["admin", "manager", "supervisor"],
  "ownership-types": ["admin", "manager", "supervisor"],
  "maintenance-statuses": ["admin", "manager", "supervisor"],
  "supplier-categories": ["admin", "manager", "supervisor"],
  "location-types": ["admin", "manager"],
  "insurance-statuses": ["admin", "manager"],
  "insurance-coverage-types": ["admin", "manager"],
};

function listCatalog(pool: Pool, catalog: string) {
  const sql = catalogListQueries[catalog];
  if (!sql) throw new Error(`Unknown catalog: ${catalog}`);
  return pool.query(sql);
}

async function createCatalog(req: NextRequest, pool: Pool, catalog: string) {
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");
  const def = catalogInsertQueries[catalog];
  if (!def) throw new Error(`Unknown catalog: ${catalog}`);
  const res = await pool.query(def.query, def.params(body));
  const row = res.rows[0];
  return created(row);
}

export const catalogRoutes = {
  list: async (req: NextRequest, pool: Pool, catalog: string) => {
    const rows = await listCatalog(pool, catalog);
    return ok(rows.rows);
  },
  create: async (req: NextRequest, pool: Pool, catalog: string) => {
    return createCatalog(req, pool, catalog);
  },
};

function makeRouteEntries(): TenantRouteEntry[] {
  const entries: TenantRouteEntry[] = [];
  for (const catalog of Object.keys(catalogListQueries)) {
    entries.push(
      { method: "GET", pattern: [catalog], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => catalogRoutes.list(ctx.req, ctx.pool, catalog) },
      { method: "POST", pattern: [catalog], roles: catalogRoles[catalog], roleErrorMode: "finalize", handler: async (ctx) => catalogRoutes.create(ctx.req, ctx.pool, catalog) }
    );
  }
  return entries;
}

export const catalogRouteEntries = makeRouteEntries();