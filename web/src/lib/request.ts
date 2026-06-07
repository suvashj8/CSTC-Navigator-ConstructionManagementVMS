import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import { forbidden, unauthorized } from "./api-response";
import { hasRole, verifyBearer, type AuthClaims } from "./auth";
import { getTenantManager } from "./tenant-manager";

export async function requireAuth(req: NextRequest): Promise<{ claims: AuthClaims } | { error: Response }> {
  const claims = await verifyBearer(req.headers.get("authorization"));
  if (!claims) return { error: unauthorized("missing bearer token") };
  return { claims };
}

export async function tenantContext(req: NextRequest): Promise<
  { pool: Pool; claims: AuthClaims; tenantId: string } | { error: Response }
> {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth;
  const { claims } = auth;
  if (!claims.tenant_id) return { error: forbidden() };
  try {
    const tm = getTenantManager();
    const pool = await tm.pool(claims.tenant_id);
    return { pool, claims, tenantId: claims.tenant_id };
  } catch (e) {
    return { error: unauthorized((e as Error).message) };
  }
}

export async function platformContext(req: NextRequest): Promise<{ claims: AuthClaims; tm: ReturnType<typeof getTenantManager> } | { error: Response }> {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth;
  const { claims } = auth;
  if (claims.token_type !== "platform" && claims.role !== "super_user") {
    return { error: forbidden() };
  }
  return { claims, tm: getTenantManager() };
}

export function requireRoles(claims: AuthClaims, ...roles: string[]): Response | null {
  if (!hasRole(claims, ...roles)) return forbidden();
  return null;
}

export function pageParams(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));
  let perPage = Math.max(1, Number(req.nextUrl.searchParams.get("per_page") ?? 10));
  if (perPage > 100) perPage = 100;
  return { page, perPage, offset: (page - 1) * perPage };
}

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = (process.env.CORS_ORIGINS ?? "http://localhost:5173,capacitor://localhost,http://localhost").split(",");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Tenant-Subdomain",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}
