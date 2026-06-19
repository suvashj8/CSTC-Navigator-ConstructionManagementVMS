import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import { randomUUID } from "crypto";
import {
  ok,
  created,
  notFound,
  badRequest,
} from "../../api-response";
import { paginatedMeta, paginatedQuery, keysetQuery, cursorMeta, cursorParams, pageParams } from "../../pagination";
import {
  fetchAllocation,
  scanAllocationRow,
} from "../entities";
import { optionalUUID, nullIfEmpty } from "../../utils";

export const allocationsRoutes = {
  list: async (req: NextRequest, pool: Pool) => {
    const state = req.nextUrl.searchParams.get("state") ?? "";
    const useCursor = req.nextUrl.searchParams.get("cursor") !== null;
    let where = "";
    const args: unknown[] = [];
    if (state) {
      args.push(state);
      where = ` WHERE al.state = $${args.length}`;
    }
    const from = ` FROM allocations al JOIN assets a ON a.asset_id = al.asset_id JOIN work_locations fl ON fl.location_id = al.from_location_id JOIN work_locations tl ON tl.location_id = al.to_location_id LEFT JOIN users d ON d.user_id = al.driver_id LEFT JOIN users recv ON recv.user_id = al.receiver_user_id`;
    const dataSQL = `SELECT al.alloc_id, al.group_id, al.asset_id, a.reg_serial_no || ' - ' || a.make || ' ' || a.model AS asset_label,
      al.from_location_id, fl.name AS from_location_name, al.to_location_id, tl.name AS to_location_name,
      al.driver_id, COALESCE(d.name, al.external_driver_name) AS driver_name,
      al.receiver_user_id, al.receiver_role, COALESCE(recv.name, al.receiver_name) AS receiver_name,
      al.state, al.start_date, al.expected_return, al.created_at, al.alloc_id as id${from}${where}`;

    if (useCursor) {
      const cp = cursorParams(req);
      const result = await keysetQuery(pool, cp, dataSQL, args, scanAllocationRow, ["created_at", "id"]);
      return ok(result.list, cursorMeta(result.nextCursor, result.hasMore, cp.perPage));
    } else {
      const pp = pageParams(req);
      const { list, total } = await paginatedQuery(pool, pp, `SELECT COUNT(*)::bigint AS count${from}${where}`, args, dataSQL + " ORDER BY al.created_at DESC", args, scanAllocationRow);
      return ok(list, paginatedMeta(total, pp));
    }
  },

  create: async (req: NextRequest, pool: Pool) => {
    const body = await req.json().catch(() => null);
    const assetIds: string[] = Array.isArray(body?.asset_ids)
      ? body.asset_ids.filter((id: unknown) => typeof id === "string" && id.trim())
      : body?.asset_id
        ? [String(body.asset_id)]
        : [];
    if (assetIds.length === 0) return badRequest("at least one asset is required");

    const receiverRole = (body?.receiver_role ?? "").trim().toLowerCase();
    const receiverUserId = optionalUUID(body?.receiver_user_id);
    const receiverName = (body?.receiver_name ?? "").trim();
    const receiverContact = (body?.receiver_contact ?? "").trim();
    if (!receiverRole) return badRequest("receiving authority role is required");
    if (!["manager", "employee", "supervisor", "other"].includes(receiverRole)) {
      return badRequest("invalid receiver role");
    }
    if (receiverRole === "other") {
      if (!receiverName) return badRequest("receiver name is required for other");
      if (!receiverContact) return badRequest("receiver contact is required for other");
    } else if (!receiverUserId) {
      return badRequest("select a receiving authority");
    }

    const driverId = optionalUUID(body?.driver_id);
    const externalDriverName = (body?.external_driver_name ?? "").trim();
    const externalDriverContact = (body?.external_driver_contact ?? "").trim();
    if (!driverId && !externalDriverName && body?.driver_mode === "external") {
      return badRequest("external driver name is required");
    }

    const fromLocationId = await resolveAllocationLocationId(pool, body.from_location_id, body.from_location_name);
    const toLocationId = await resolveAllocationLocationId(pool, body.to_location_id, body.to_location_name);

    const groupId = randomUUID();
    const createdIds: string[] = [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const assetId of assetIds) {
        const assetCheck = await client.query(`SELECT asset_id, status FROM assets WHERE asset_id = $1`, [assetId]);
        if (!assetCheck.rowCount) {
          await client.query("ROLLBACK");
          return badRequest(`asset ${assetId} not found`);
        }
        if (assetCheck.rows[0].status !== "active") {
          await client.query("ROLLBACK");
          return badRequest(`asset ${assetId} is not active`);
        }
        const allocRes = await client.query(
          `INSERT INTO allocations (group_id, asset_id, from_location_id, to_location_id, driver_id, external_driver_name, external_driver_contact,
            receiver_user_id, receiver_role, receiver_name, receiver_contact, state, start_date, expected_return, approved_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13,$14) RETURNING alloc_id`,
          [groupId, assetId, fromLocationId, toLocationId, driverId, externalDriverName || null, externalDriverContact || null,
            receiverUserId, receiverRole, receiverName || null, receiverContact || null,
            body.start_date, body.expected_return, body.approved_by || null]
        );
        createdIds.push(allocRes.rows[0].alloc_id);
      }
      await client.query("COMMIT");
      const allocation = await fetchAllocation(pool, createdIds[0]);
      return created(allocation);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  transition: async (pool: Pool, id: string, action: string) => {
    const validActions = ["approve", "start", "release", "cancel"];
    if (!validActions.includes(action)) return badRequest("invalid action");

    const current = await pool.query(`SELECT state FROM allocations WHERE alloc_id = $1`, [id]);
    if (!current.rowCount) return notFound("allocation not found");
    const currentState = current.rows[0].state;

    const transitions: Record<string, string[]> = {
      approve: ["pending"],
      start: ["approved"],
      release: ["active", "in_transit"],
      cancel: ["pending", "approved"],
    };
    if (!transitions[action]?.includes(currentState)) {
      return badRequest(`cannot ${action} from state ${currentState}`);
    }

    const newState = ({
      approve: "approved",
      start: "in_transit",
      release: "released",
      cancel: "cancelled",
    } as const)[action] as string;

    const updateFields: string[] = [`state = $2`];
    const updateValues: unknown[] = [id, newState];
    if (action === "start") {
      updateFields.push(`actual_return = NULL`);
    } else if (action === "release") {
      updateFields.push(`actual_return = CURRENT_DATE`);
    }
    await pool.query(`UPDATE allocations SET ${updateFields.join(", ")} WHERE alloc_id = $1`, updateValues);

    const allocation = await fetchAllocation(pool, id);
    return ok(allocation);
  },

  get: async (pool: Pool, id: string) => {
    const allocation = await fetchAllocation(pool, id);
    if (!allocation) return notFound("allocation not found");
    return ok(allocation);
  },
};

async function resolveAllocationLocationId(
  pool: Pool,
  id?: string | null,
  name?: string | null
): Promise<string> {
  if (id && String(id).trim()) return String(id).trim();
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw new Error("location is required");
  const existing = await pool.query(
    `SELECT location_id FROM work_locations
     WHERE LOWER(TRIM(name)) = LOWER($1)
     ORDER BY is_custom ASC, created_at ASC LIMIT 1`,
    [trimmed]
  );
  if (existing.rows[0]?.location_id) return existing.rows[0].location_id;
  const ins = await pool.query(
    `INSERT INTO work_locations (name, type, address, is_custom) VALUES ($1, 'other', '', true) RETURNING location_id`,
    [trimmed]
  );
  return ins.rows[0].location_id;
}

import type { TenantRouteEntry } from "./types";

export const allocationsRouteEntries: TenantRouteEntry[] = [
  { method: "GET", pattern: ["allocations"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => allocationsRoutes.list(ctx.req, ctx.pool) },
  { method: "POST", pattern: ["allocations"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => allocationsRoutes.create(ctx.req, ctx.pool) },
  { method: "PUT", pattern: ["allocations", ":id", ":action"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => allocationsRoutes.transition(ctx.pool, ctx.params.id, ctx.params.action) },
  { method: "GET", pattern: ["allocations", ":id"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => allocationsRoutes.get(ctx.pool, ctx.params.id) },
];