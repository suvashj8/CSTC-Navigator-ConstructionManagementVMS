import { jwtVerify } from "jose";

export type AuthClaims = {
  sub: string;
  role: string;
  tenant_id?: string;
  tenant_name?: string;
};

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-min-32-chars");

export async function verifyBearer(authHeader: string | null): Promise<AuthClaims | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: String(payload.sub ?? ""),
      role: String((payload as Record<string, unknown>).role ?? "employee"),
      tenant_id: (payload as Record<string, unknown>).tenant_id as string | undefined,
      tenant_name: (payload as Record<string, unknown>).tenant_name as string | undefined,
    };
  } catch {
    return null;
  }
}

const roleRank: Record<string, number> = {
  super_user: 6,
  admin: 5,
  manager: 4,
  supervisor: 3,
  employee: 2,
  driver: 1,
};

export function hasMinRole(role: string, min: string) {
  return (roleRank[role] ?? 0) >= (roleRank[min] ?? 0);
}
