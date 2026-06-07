import { SignJWT, jwtVerify } from "jose";

export type AuthClaims = {
  sub: string;
  email: string;
  role: string;
  tenant_id?: string;
  tenant_name?: string;
  location_ids?: string[];
  token_type?: string;
  impersonated_by?: string;
};

export type LoginUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  location_ids: string[];
  tenant_id?: string;
  tenant_name?: string;
};

export type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: LoginUser;
};

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-min-32-chars");

function jwtExpirySeconds(): number {
  const h = Number(process.env.JWT_EXPIRY_HOURS ?? 8);
  return h * 3600;
}

export async function verifyBearer(authHeader: string | null): Promise<AuthClaims | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const { payload } = await jwtVerify(token, secret());
    const p = payload as Record<string, unknown>;
    return {
      sub: String(payload.sub ?? p.sub ?? ""),
      email: String(p.email ?? ""),
      role: String(p.role ?? "employee"),
      tenant_id: p.tenant_id as string | undefined,
      tenant_name: p.tenant_name as string | undefined,
      location_ids: (p.location_ids as string[]) ?? [],
      token_type: p.token_type as string | undefined,
      impersonated_by: p.impersonated_by as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function signTenant(
  userId: string,
  email: string,
  name: string,
  role: string,
  tenantId: string,
  tenantName: string,
  locIds: string[]
): Promise<LoginResponse> {
  const exp = jwtExpirySeconds();
  const ids = locIds ?? [];
  const token = await new SignJWT({
    email,
    role,
    tenant_id: tenantId,
    tenant_name: tenantName,
    location_ids: ids,
    token_type: "tenant",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${exp}s`)
    .sign(secret());

  return {
    access_token: token,
    expires_in: exp,
    user: { id: userId, name, email, role, location_ids: ids, tenant_id: tenantId, tenant_name: tenantName },
  };
}

export async function signPlatform(userId: string, email: string, name: string): Promise<LoginResponse> {
  const exp = 8 * 3600;
  const token = await new SignJWT({
    email,
    role: "super_user",
    token_type: "platform",
    location_ids: [],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${exp}s`)
    .sign(secret());

  return {
    access_token: token,
    expires_in: exp,
    user: { id: userId, name, email, role: "super_user", location_ids: [] },
  };
}

export async function signImpersonation(superId: string, user: LoginUser): Promise<LoginResponse> {
  const exp = jwtExpirySeconds();
  const token = await new SignJWT({
    email: user.email,
    role: "super_user",
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
    location_ids: user.location_ids ?? [],
    token_type: "tenant",
    impersonated_by: superId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(`${exp}s`)
    .sign(secret());

  return {
    access_token: token,
    expires_in: exp,
    user: { ...user, role: "super_user" },
  };
}

export function hasRole(claims: AuthClaims, ...allowed: string[]): boolean {
  if (claims.role === "admin" || claims.role === "super_user") return true;
  return allowed.includes(claims.role);
}
