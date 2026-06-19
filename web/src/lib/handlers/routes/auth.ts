import type { NextRequest } from "next/server";
import type { Pool } from "pg";
import { ok, badRequest, unauthorized } from "../../api-response";
import { signTenant, signPlatform, createRefreshToken, rotateRefreshToken, revokeRefreshToken } from "../../auth";
import { getTenantManager } from "../../tenant-manager";
import { lookupActiveTenantUser, verifyTenantPassword, isInfrastructureError } from "../api-router";
import type { TenantRouteEntry } from "./types";

export const authRoutes = {
  tenantLogin: async (req: NextRequest, pool: Pool) => {
    const sub = req.headers.get("x-tenant-subdomain");
    if (!sub) return badRequest("X-Tenant-Subdomain header is required");
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) return badRequest("invalid body");
    
    const subdomain = sub.toLowerCase();
    const email = String(body.email).toLowerCase();
    const password = String(body.password);
    const isDemo = subdomain === "demo";

    const tm = getTenantManager();
      try {
        const { ensureDemoSeeded, repairDemoSeeded } = await import("../../ensure-demo");
        if (isDemo) {
          await ensureDemoSeeded(tm);
        }
      const info = await tm.bySubdomain(subdomain);
      const pool = await tm.pool(info.id);

      let row = await lookupActiveTenantUser(pool, email);
      let passwordOk = await verifyTenantPassword(row, password);

      if (!passwordOk && isDemo) {
        await repairDemoSeeded(tm);
        row = await lookupActiveTenantUser(pool, email);
        passwordOk = await verifyTenantPassword(row, password);
      }

      if (!passwordOk || !row) {
        return unauthorized("invalid tenant or credentials");
      }

      const locIds = (row.location_ids as string[] | null)?.map(String) ?? [];
      const login = await signTenant(row.user_id, row.email, row.name, row.role, info.id, info.name, locIds);
      
      const refresh = await createRefreshToken(pool, row.user_id);
      return ok({
        ...login,
        refresh_token: refresh.token,
        refresh_expires_in: Math.floor((refresh.expiresAt.getTime() - Date.now()) / 1000),
      });
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("[tenantLogin]", e);
      }
      const msg = (e as Error).message ?? "";
      if (isInfrastructureError(msg)) {
        return unauthorized("database not reachable");
      }
      if (isDemo && msg) {
        return unauthorized(`demo setup failed`);
      }
      return unauthorized("invalid tenant or credentials");
    }
  },

  platformLogin: async (req: NextRequest) => {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) return badRequest("invalid body");
    const email = String(body.email).toLowerCase();
    const password = String(body.password);
    const tm = getTenantManager();
    try {
      const { ensurePlatformSeeded, repairPlatformSeeded } = await import("../../ensure-demo");
      await ensurePlatformSeeded(tm);

      let res = await tm.main().query(`SELECT user_id, name, password_hash FROM super_users WHERE email = $1`, [email]);
      let row = res.rows[0];
      let passwordOk = row && (await (await import("bcryptjs")).compare(password, row.password_hash));

      if (!passwordOk) {
        await repairPlatformSeeded(tm);
        res = await tm.main().query(`SELECT user_id, name, password_hash FROM super_users WHERE email = $1`, [email]);
        row = res.rows[0];
        passwordOk = row && (await (await import("bcryptjs")).compare(password, row.password_hash));
      }

      if (!passwordOk || !row) {
        return unauthorized("invalid credentials");
      }
      const login = await signPlatform(row.user_id, email, row.name);
      return ok(login);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("[platformLogin]", e);
      }
      const msg = (e as Error).message ?? "";
      if (isInfrastructureError(msg)) {
        return unauthorized("database not reachable");
      }
      return unauthorized("invalid credentials");
    }
  },

  refresh: async (req: NextRequest, pool: Pool) => {
    const body = await req.json().catch(() => null);
    const refreshToken = body?.refresh_token;
    if (!refreshToken) return badRequest("refresh_token required");

    const rotated = await rotateRefreshToken(pool, refreshToken);
    if (!rotated) return unauthorized("invalid or expired refresh token");

    // Get user info to issue new access token
    const userRes = await pool.query(
      `SELECT u.user_id, u.email, u.name, u.role::text, u.location_ids
       FROM users u WHERE u.user_id = (
         SELECT user_id FROM refresh_tokens 
         WHERE token_hash = $1
       )`,
      [Buffer.from(refreshToken).toString("base64url")]
    );
    if (!userRes.rowCount) return unauthorized("user not found");

    const user = userRes.rows[0];
    const locIds = (user.location_ids as string[] | null)?.map(String) ?? [];
    const access = await (await import("../../auth")).signAccessToken(user.user_id, user.email, user.role, {
      tenant_id: user.tenant_id,
      token_type: "tenant",
      location_ids: locIds,
    });

    return ok({
      access_token: access,
      expires_in: 15 * 60,
      refresh_token: rotated.token,
      refresh_expires_in: Math.floor((rotated.expiresAt.getTime() - Date.now()) / 1000),
    });
  },

  logout: async (req: NextRequest, pool: Pool) => {
    const body = await req.json().catch(() => null);
    const refreshToken = body?.refresh_token;
    if (refreshToken) {
      await revokeRefreshToken(pool, refreshToken);
    }
    return ok({ ok: true });
  },
};

export const authRouteEntries: TenantRouteEntry[] = [
  { method: "POST", pattern: ["auth", "login"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => authRoutes.tenantLogin(ctx.req, ctx.pool) },
  { method: "POST", pattern: ["platform", "auth", "login"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => authRoutes.platformLogin(ctx.req) },
  { method: "POST", pattern: ["auth", "refresh"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => authRoutes.refresh(ctx.req, ctx.pool) },
  { method: "POST", pattern: ["auth", "logout"], roles: undefined, roleErrorMode: "finalize", handler: async (ctx) => authRoutes.logout(ctx.req, ctx.pool) },
];