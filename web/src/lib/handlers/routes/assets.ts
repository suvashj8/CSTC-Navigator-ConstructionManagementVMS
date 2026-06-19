import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import {
  ok,
  created,
  notFound,
  badRequest,
} from "../../api-response";
import { paginatedMeta, paginatedQuery, keysetQuery, cursorMeta, cursorParams, pageParams } from "../../pagination";
import {
  fetchAsset,
  scanAssetRow,
} from "../entities";

export const assetsRoutes = {
  list: async (req: NextRequest, pool: Pool) => {
    const search = req.nextUrl.searchParams.get("search") ?? "";
    const status = req.nextUrl.searchParams.get("status") ?? "";
    const operational = req.nextUrl.searchParams.get("operational") === "true";
    const assetType = req.nextUrl.searchParams.get("asset_type") ?? "";
    const operationMode = req.nextUrl.searchParams.get("operation_mode") ?? "";
    const useCursor = req.nextUrl.searchParams.get("cursor") !== null;
    
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
      where += " AND (a.operation_mode = 'hour' OR a.vehicle_category = 'Dozer' OR a.asset_type <> 'vehicle')";
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
      a.operation_mode, a.operation_mode_label, a.operation_custom_fields,
      a.route_from, a.route_to, a.operation_km,
      a.operation_place, a.operation_hours, a.operation_minutes, a.created_at, a.asset_id as id${from}${where}`;

    if (useCursor) {
      const cp = cursorParams(req);
      const result = await keysetQuery(pool, cp, dataSQL, args, scanAssetRow, ["created_at", "id"]);
      return ok(result.list, cursorMeta(result.nextCursor, result.hasMore, cp.perPage));
    } else {
      const pp = pageParams(req);
      const { list, total } = await paginatedQuery(pool, pp, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL + " ORDER BY a.created_at DESC", args, scanAssetRow);
      return ok(list, paginatedMeta(total, pp));
    }
  },

  create: async (req: NextRequest, pool: Pool) => {
    const body = await req.json();
    const res = await pool.query(
      `INSERT INTO assets (asset_type, reg_serial_no, make, model, year, ownership_type, status, location_id,
        vehicle_category, department, rta_office, alert_cell_number, registration_date, bluebook_no, bluebook_issued_at, bluebook_expires_at,
        operation_mode, operation_mode_label, operation_custom_fields,
        route_from, route_to, operation_km, operation_place, operation_hours, operation_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING asset_id`,
      [
        body.asset_type, body.reg_serial_no, body.make, body.model, body.year,
        body.ownership_type, body.status, body.location_id,
        body.vehicle_category, body.department, body.rta_office, body.alert_cell_number,
        body.registration_date, body.bluebook_no, body.bluebook_issued_at, body.bluebook_expires_at,
        body.operation_mode, body.operation_mode_label ?? null,
        JSON.stringify(body.operation_custom_fields ?? {}),
        body.route_from, body.route_to, body.operation_km,
        body.operation_place, body.operation_hours, body.operation_minutes,
      ]
    );
    const id = res.rows[0].asset_id;
    const asset = await fetchAsset(pool, id);
    return created(asset ?? { id });
  },

  update: async (req: NextRequest, pool: Pool, id: string) => {
    const body = await req.json();
    await pool.query(
      `UPDATE assets SET asset_type=$1, reg_serial_no=$2, make=$3, model=$4, year=$5, ownership_type=$6, status=$7, location_id=$8,
        vehicle_category=$9, department=$10, rta_office=$11, alert_cell_number=$12, registration_date=$13,
        bluebook_no=$14, bluebook_issued_at=$15, bluebook_expires_at=$16,
        operation_mode=$17, operation_mode_label=$18, operation_custom_fields=$19,
        route_from=$20, route_to=$21, operation_km=$22,
        operation_place=$23, operation_hours=$24, operation_minutes=$25 WHERE asset_id=$26`,
      [
        body.asset_type, body.reg_serial_no, body.make, body.model, body.year, body.ownership_type, body.status, body.location_id,
        body.vehicle_category, body.department, body.rta_office, body.alert_cell_number, body.registration_date,
        body.bluebook_no, body.bluebook_issued_at, body.bluebook_expires_at,
        body.operation_mode, body.operation_mode_label ?? null,
        JSON.stringify(body.operation_custom_fields ?? {}),
        body.route_from, body.route_to, body.operation_km,
        body.operation_place, body.operation_hours, body.operation_minutes, id,
      ]
    );
    const asset = await fetchAsset(pool, id);
    return ok(asset ?? { id });
  },

  decommission: async (pool: Pool, id: string) => {
    const res = await pool.query(
      `UPDATE assets SET status = 'decommissioned' WHERE asset_id = $1 RETURNING asset_id`,
      [id]
    );
    if (!res.rowCount) return notFound("asset not found");
    return ok({ ok: true });
  },

  permanentlyDelete: async (pool: Pool, id: string) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM allocations WHERE asset_id = $1`, [id]);
      await client.query(`DELETE FROM insurance_policies WHERE asset_id = $1`, [id]);
      const res = await client.query(`DELETE FROM assets WHERE asset_id = $1 RETURNING asset_id`, [id]);
      if (!res.rowCount) {
        await client.query("ROLLBACK");
        return notFound("asset not found");
      }
      await client.query("COMMIT");
      return ok({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  get: async (pool: Pool, id: string) => {
    const asset = await fetchAsset(pool, id);
    if (!asset) return notFound("asset not found");
    return ok(asset);
  },
};

import type { TenantRouteEntry } from "./types";

export const assetsRouteEntries: TenantRouteEntry[] = [
  { method: "GET", pattern: ["assets"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => assetsRoutes.list(ctx.req, ctx.pool) },
  { method: "POST", pattern: ["assets"], roles: ["admin", "manager", "supervisor"], roleErrorMode: "finalize", handler: async (ctx) => assetsRoutes.create(ctx.req, ctx.pool) },
  { method: "PUT", pattern: ["assets", ":id"], roles: ["admin", "manager", "supervisor"], roleErrorMode: "finalize", handler: async (ctx) => assetsRoutes.update(ctx.req, ctx.pool, ctx.params.id) },
  { method: "DELETE", pattern: ["assets", ":id"], roles: ["admin", "manager", "supervisor"], roleErrorMode: "finalize", handler: async (ctx) => {
      const permanent = ctx.req.nextUrl.searchParams.get("permanent") === "true";
      return permanent ? assetsRoutes.permanentlyDelete(ctx.pool, ctx.params.id) : assetsRoutes.decommission(ctx.pool, ctx.params.id);
    }
  },
];