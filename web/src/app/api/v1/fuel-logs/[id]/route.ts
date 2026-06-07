import type { NextRequest } from "next/server";
import { badRequest, internal, ok } from "@/lib/api-response";
import { tenantContext } from "@/lib/request";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await tenantContext(req, "manager");
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");

  try {
    const fueledAt = body.fueled_at ? new Date(body.fueled_at) : new Date();
    await ctx.pool.query(
      `UPDATE fuel_logs SET supplier_id=$1, fueled_at=$2, odometer_km=$3, liters=$4, total_cost=$5, notes=$6
       WHERE fuel_log_id=$7`,
      [
        body.supplier_id ?? null,
        fueledAt,
        body.odometer_km ?? null,
        body.liters ?? null,
        body.total_cost ?? null,
        body.notes ?? null,
        id,
      ]
    );
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
    return ok({
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

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await tenantContext(req, "manager");
  if ("error" in ctx) return ctx.error;
  const { id } = await params;
  try {
    await ctx.pool.query(`DELETE FROM fuel_logs WHERE fuel_log_id=$1`, [id]);
    return ok({ ok: true });
  } catch (e) {
    return internal((e as Error).message);
  }
}
