import type { NextRequest } from "next/server";
import { badRequest, internal, ok } from "@/lib/api-response";
import { tenantContext } from "@/lib/request";

type Params = { params: Promise<{ id: string }> };

function normalizeStatus(s: string) {
  const v = s.toLowerCase().trim();
  if (v === "in progress" || v === "in_progress") return "In progress";
  if (v === "completed") return "Completed";
  return "Scheduled";
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await tenantContext(req, "manager");
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return badRequest("invalid body");

  try {
    await ctx.pool.query(
      `UPDATE maintenance_jobs SET supplier_id=$1, scheduled_at=$2, completed_at=$3, status=$4, description=$5,
        parts_cost=$6, labor_cost=$7, odometer_at_service=$8, notes=$9 WHERE job_id=$10`,
      [
        body.supplier_id ?? null,
        body.scheduled_at ?? null,
        body.completed_at ?? null,
        normalizeStatus(body.status ?? "Scheduled"),
        body.description ?? null,
        body.parts_cost ?? null,
        body.labor_cost ?? null,
        body.odometer_at_service ?? null,
        body.notes ?? null,
        id,
      ]
    );
    const row = await ctx.pool.query(
      `SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
              m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
              m.odometer_at_service, m.notes
       FROM maintenance_jobs m
       LEFT JOIN assets a ON a.asset_id = m.asset_id
       LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id
       WHERE m.job_id = $1`,
      [id]
    );
    const r = row.rows[0];
    return ok({
      id: r.job_id,
      asset_id: r.asset_id,
      asset_label: r.reg_serial_no ?? "",
      supplier_id: r.supplier_id,
      supplier_name: r.name ?? "",
      scheduled_at: r.scheduled_at ? String(r.scheduled_at).slice(0, 10) : null,
      completed_at: r.completed_at ? String(r.completed_at).slice(0, 10) : null,
      status: r.status,
      description: r.description ?? "",
      parts_cost: r.parts_cost != null ? Number(r.parts_cost) : null,
      labor_cost: r.labor_cost != null ? Number(r.labor_cost) : null,
      odometer_at_service: r.odometer_at_service,
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
    await ctx.pool.query(`DELETE FROM maintenance_jobs WHERE job_id=$1`, [id]);
    return ok({ ok: true });
  } catch (e) {
    return internal((e as Error).message);
  }
}
