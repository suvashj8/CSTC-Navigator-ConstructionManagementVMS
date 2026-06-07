import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "./api-response";
import { hasMinRole, verifyBearer } from "./auth";
import { tenantPoolBySubdomain } from "./tenant-pool";

export async function tenantContext(req: NextRequest, minRole = "employee") {
  const claims = await verifyBearer(req.headers.get("authorization"));
  if (!claims?.tenant_id) return { error: unauthorized() } as const;

  const subdomain = req.headers.get("x-tenant-subdomain");
  if (!subdomain) return { error: unauthorized("X-Tenant-Subdomain required") } as const;

  if (!hasMinRole(claims.role, minRole)) return { error: forbidden() } as const;

  try {
    const pool = await tenantPoolBySubdomain(subdomain);
    return { pool, claims } as const;
  } catch (e) {
    return { error: unauthorized((e as Error).message) } as const;
  }
}

export function pageParams(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("per_page") ?? 10)));
  return { page, perPage, offset: (page - 1) * perPage };
}
