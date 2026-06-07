import type { NextRequest } from "next/server";
import { created, internal, ok, badRequest } from "@/lib/api-response";
import { pageParams, tenantContext } from "@/lib/request";

function normalizeStatus(s: string) {
  const v = s.toLowerCase().trim();
  if (v === "in progress" || v === "in_progress") return "In progress";
  if (v === "completed") return "Completed";
  return "Scheduled";
}

export async function GET(req: NextRequest) {
  const ctx = await tenantContext(req, "employee");
  if ("error" in ctx) return ctx.error;

  const { page, perPage, offset } = pageParams(req);
  const assetId = req.nextUrl.searchParams.get("asset_id");
  const args: unknown[] = [];
  let where = "WHERE 1=1";
  if (assetId) {
    args.push(assetId);
    where += ` AND m.asset_id = $${args.length}`;
  }

  const from = ` FROM maintenance_jobs m
    LEFT JOIN assets a ON a.asset_id = m.asset_id
    LEFT JOIN suppliers s ON s.supplier_id = m.supplier_id `;

  try {
    const countRes = await ctx.pool.query(`SELECT COUNT(*)::bigint AS total ${from}${where}`, args);
    const total = Number(countRes.rows[0]?.total ?? 0);
    const dataArgs = [...args, perPage, offset];
    const limitIdx = args.length + 1;
    const offsetIdx = args.length + 2;
    const rows = await ctx.pool.query(
      `SELECT m.job_id, m.asset_id, a.reg_serial_no, m.supplier_id, s.name,
              m.scheduled_at, m.completed_at, m.status, m.description, m.parts_cost, m.labor_cost,
              m.odometer_at_service, m.notes
       ${from}${where}
       ORDER BY m.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataArgs
    );

    const data = rows.rows.map((r) => ({
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
  const ctx = await tenantContext(req, "manager");
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => null);
  if (!body?.asset_id) return badRequest("asset_id is required");

  const status = normalizeStatus(body.status ?? "Scheduled");
  let completedAt = body.completed_at ?? null;
  if (status === "Completed" && !completedAt) {
    completedAt = new Date().toISOString().slice(0, 10);
  }

  try {
    const res = await ctx.pool.query(
      `INSERT INTO maintenance_jobs (asset_id, supplier_id, scheduled_at, completed_at, status, description,
        parts_cost, labor_cost, odometer_at_service, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING job_id`,
      [
        body.asset_id,
        body.supplier_id ?? null,
        body.scheduled_at ?? null,
        completedAt,
        status,
        body.description ?? null,
        body.parts_cost ?? null,
        body.labor_cost ?? null,
        body.odometer_at_service ?? null,
        body.notes ?? null,
      ]
    );
    const id = res.rows[0].job_id;
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
    return created({
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
