import type { NextRequest } from "next/server";
import {
  badRequest,
  created,
  notFound,
  ok,
} from "../api-response";
import { signImpersonation } from "../auth";
import { scanAllTenants } from "../expiry";
import { getTenantManager } from "../tenant-manager";

export async function handlePlatformRoutes(
  req: NextRequest,
  segments: string[],
  method: string,
  plat: { tm: ReturnType<typeof getTenantManager>; claims: { sub: string } }
): Promise<Response> {
  const { tm, claims } = plat;
  const rest = segments.slice(1);

  if (method === "GET" && rest.join("/") === "tenants") {
    return await listTenants(tm);
  }
  if (method === "POST" && rest.join("/") === "tenants") {
    return await createTenant(req, tm);
  }
  if (method === "PUT" && rest.length === 3 && rest[0] === "tenants" && rest[2] === "status") {
    return await updateTenantStatus(req, tm, rest[1]);
  }
  if (method === "POST" && rest.length === 3 && rest[0] === "tenants" && rest[2] === "switch") {
    return await switchTenant(req, plat, rest[1]);
  }
  if (method === "POST" && rest.join("/") === "jobs/expiry-scan") {
    return await triggerExpiryScan(tm);
  }
  return notFound("route not found");
}

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