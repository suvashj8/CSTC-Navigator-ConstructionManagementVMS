import type { NextRequest } from "next/server";
import { created, internal, ok, badRequest } from "@/lib/api-response";
import { pageParams, tenantContext } from "@/lib/request";

export async function GET(req: NextRequest) {
  const ctx = await tenantContext(req, "employee");
  if ("error" in ctx) return ctx.error;

  const { page, perPage, offset } = pageParams(req);
  const assetId = req.nextUrl.searchParams.get("asset_id");
  const args: unknown[] = [];
  let where = "WHERE 1=1";
  if (assetId) {
    args.push(assetId);
    where += ` AND f.asset_id = $${args.length}`;
  }

  const from = ` FROM fuel_logs f
    LEFT JOIN assets a ON a.asset_id = f.asset_id
    LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id `;

  try {
    const countRes = await ctx.pool.query(`SELECT COUNT(*)::bigint AS total ${from}${where}`, args);
    const total = Number(countRes.rows[0]?.total ?? 0);
    const dataArgs = [...args, perPage, offset];
    const limitIdx = args.length + 1;
    const offsetIdx = args.length + 2;
    const rows = await ctx.pool.query(
      `SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
              f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes
       ${from}${where}
       ORDER BY f.fueled_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataArgs
    );

    const data = rows.rows.map((r) => ({
      id: r.fuel_log_id,
      asset_id: r.asset_id,
      asset_label: r.reg_serial_no ?? "",
      supplier_id: r.supplier_id,
      supplier_name: r.name ?? "",
      fueled_at: new Date(r.fueled_at).toISOString(),
      odometer_km: r.odometer_km,
      liters: r.liters != null ? Number(r.liters) : null,
      total_cost: r.total_cost != null ? Number(r.total_cost) : null,
      notes: r.notes ?? "",
    }));

    return ok(data, {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage) || 0,
    });
  } catch (e) {
    return internal((e as Error).message);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await tenantContext(req, "supervisor");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => null);
  if (!body?.asset_id) return badRequest("asset_id is required");

  try {
    const fueledAt = body.fueled_at ? new Date(body.fueled_at) : new Date();
    const res = await ctx.pool.query(
      `INSERT INTO fuel_logs (asset_id, supplier_id, fueled_at, odometer_km, liters, total_cost, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING fuel_log_id`,
      [
        body.asset_id,
        body.supplier_id ?? null,
        fueledAt,
        body.odometer_km ?? null,
        body.liters ?? null,
        body.total_cost ?? null,
        body.notes ?? null,
      ]
    );
    const id = res.rows[0].fuel_log_id;
    const row = await ctx.pool.query(
      `SELECT f.fuel_log_id, f.asset_id, a.reg_serial_no, f.supplier_id, s.name,
              f.fueled_at, f.odometer_km, f.liters, f.total_cost, f.notes
       FROM fuel_logs f
       LEFT JOIN assets a ON a.asset_id = f.asset_id
       LEFT JOIN suppliers s ON s.supplier_id = f.supplier_id
       WHERE f.fuel_log_id = $1`,
      [id]
    );
    const r = row.rows[0];
    return created({
      id: r.fuel_log_id,
      asset_id: r.asset_id,
      asset_label: r.reg_serial_no ?? "",
      supplier_id: r.supplier_id,
      supplier_name: r.name ?? "",
      fueled_at: new Date(r.fueled_at).toISOString(),
      odometer_km: r.odometer_km,
      liters: r.liters != null ? Number(r.liters) : null,
      total_cost: r.total_cost != null ? Number(r.total_cost) : null,
      notes: r.notes ?? "",
    });
  } catch (e) {
    return internal((e as Error).message);
  }
}
