import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import { ok, created, notFound, badRequest } from "../../api-response";
import type { TenantRouteEntry } from "./types";

export const locationsRoutes = {
  list: async (pool: Pool) => {
    const res = await pool.query(
      `SELECT wl.location_id, wl.name, wl.type, wl.address, wl.manager_id, u.name AS manager_name, wl.is_custom
       FROM work_locations wl LEFT JOIN users u ON u.user_id = wl.manager_id
       ORDER BY wl.name`
    );
    return ok(res.rows);
  },

  create: async (req: NextRequest, pool: Pool) => {
    const body = await req.json().catch(() => null);
    if (!body?.name) return badRequest("name is required");
    const res = await pool.query(
      `INSERT INTO work_locations (name, type, address, manager_id, is_custom) VALUES ($1,$2,$3,$4,$5) RETURNING location_id`,
      [body.name, body.type ?? "construction", body.address ?? null, body.manager_id ?? null, body.is_custom ?? false]
    );
    const location = await fetchLocation(pool, res.rows[0].location_id);
    return created(location);
  },

  update: async (req: NextRequest, pool: Pool, id: string) => {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest("invalid body");
    await pool.query(
      `UPDATE work_locations SET name=$1, type=$2, address=$3, manager_id=$4 WHERE location_id=$5`,
      [body.name, body.type, body.address ?? null, body.manager_id ?? null, id]
    );
    const location = await fetchLocation(pool, id);
    if (!location) return notFound("location not found");
    return ok(location);
  },

  get: async (pool: Pool, id: string) => {
    const location = await fetchLocation(pool, id);
    if (!location) return notFound("location not found");
    return ok(location);
  },
};

async function fetchLocation(pool: Pool, id: string) {
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

export const locationsRouteEntries: TenantRouteEntry[] = [
  { method: "GET", pattern: ["locations"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => locationsRoutes.list(ctx.pool) },
  { method: "POST", pattern: ["locations"], roles: ["admin", "manager"], roleErrorMode: "finalize", handler: async (ctx) => locationsRoutes.create(ctx.req, ctx.pool) },
  { method: "PUT", pattern: ["locations", ":id"], roles: ["admin", "manager"], roleErrorMode: "finalize", handler: async (ctx) => locationsRoutes.update(ctx.req, ctx.pool, ctx.params.id) },
  { method: "GET", pattern: ["locations", ":id"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => locationsRoutes.get(ctx.pool, ctx.params.id) },
];