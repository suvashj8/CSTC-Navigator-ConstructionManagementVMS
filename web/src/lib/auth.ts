import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import type { Pool } from "pg";

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
  refresh_token?: string;
  refresh_expires_in?: number;
  user: LoginUser;
};

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-min-32-chars");

function accessTokenExpirySeconds(): number {
  return 15 * 60; // 15 minutes
}

function refreshTokenExpiryDays(): number {
  return Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? 30);
}

function hashToken(token: string): string {
  return Buffer.from(token).toString("base64url");
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

export async function signAccessToken(
  userId: string,
  email: string,
  role: string,
  extras: Record<string, unknown> = {}
): Promise<string> {
  const exp = accessTokenExpirySeconds();
  const token = await new SignJWT({ email, role, ...extras })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(`${exp}s`)
    .sign(secret());
  return token;
}

export async function createRefreshToken(pool: Pool, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + refreshTokenExpiryDays() * 24 * 60 * 60 * 1000);
  
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  
  return { token, expiresAt };
}

export async function rotateRefreshToken(pool: Pool, oldToken: string): Promise<{ token: string; expiresAt: Date } | null> {
  const oldHash = hashToken(oldToken);
  
  const res = await pool.query(
    `SELECT token_id, user_id, expires_at, revoked_at 
     FROM refresh_tokens 
     WHERE token_hash = $1`,
    [oldHash]
  );
  
  const row = res.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null; // Already revoked (possible reuse attack)
  if (new Date(row.expires_at) < new Date()) return null; // Expired
  
  const newToken = randomBytes(48).toString("base64url");
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + refreshTokenExpiryDays() * 24 * 60 * 60 * 1000);
  
  // Insert new refresh token
  const insertRes = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING token_id`,
    [row.user_id, newHash, expiresAt]
  );
  const newTokenId = insertRes.rows[0].token_id;
  
  // Revoke old token and link to new one
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by_token_id = $1 WHERE token_id = $2`,
    [newTokenId, row.token_id]
  );
  
  return { token: newToken, expiresAt };
}

export async function revokeRefreshToken(pool: Pool, token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const res = await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function revokeAllUserRefreshTokens(pool: Pool, userId: string): Promise<number> {
  const res = await pool.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  return res.rowCount ?? 0;
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
  return {
    access_token: await signAccessToken(userId, email, role, {
      tenant_id: tenantId,
      tenant_name: tenantName,
      location_ids: locIds ?? [],
      token_type: "tenant",
    }),
    expires_in: accessTokenExpirySeconds(),
    user: { id: userId, name, email, role, location_ids: locIds ?? [], tenant_id: tenantId, tenant_name: tenantName },
  };
}

export async function signPlatform(userId: string, email: string, name: string): Promise<LoginResponse> {
  return {
    access_token: await signAccessToken(userId, email, "super_user", {
      token_type: "platform",
      location_ids: [],
    }),
    expires_in: accessTokenExpirySeconds(),
    user: { id: userId, name, email, role: "super_user", location_ids: [] },
  };
}

export async function signImpersonation(superId: string, user: LoginUser): Promise<LoginResponse> {
  return {
    access_token: await signAccessToken(user.id, user.email, "super_user", {
      tenant_id: user.tenant_id,
      tenant_name: user.tenant_name,
      location_ids: user.location_ids ?? [],
      token_type: "tenant",
      impersonated_by: superId,
    }),
    expires_in: accessTokenExpirySeconds(),
    user: { ...user, role: "super_user" },
  };
}

export function hasRole(claims: AuthClaims, ...allowed: string[]): boolean {
  if (claims.role === "admin" || claims.role === "super_user") return true;
  return allowed.includes(claims.role);
}
