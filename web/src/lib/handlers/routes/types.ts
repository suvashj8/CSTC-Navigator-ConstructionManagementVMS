import type { NextRequest } from "next/server";
import type { Pool } from "pg";

export interface TenantRouteHandlerContext {
  req: NextRequest;
  pool: Pool;
  claims: { sub: string } & Record<string, unknown>;
  tenantId: string;
  p: ReturnType<typeof import("../../pagination").pageParams>;
  segments: string[];
  method: string;
  params: Record<string, string>;
}

export type TenantRouteHandler = (ctx: TenantRouteHandlerContext) => Promise<Response>;

export interface TenantRouteEntry {
  method: string;
  pattern: string[];
  roles?: string[];
  roleErrorMode: "finalize";
  handler: TenantRouteHandler;
}

export interface PlatformRouteHandlerContext {
  req: NextRequest;
  pool: Pool;
  claims: { sub: string } & Record<string, unknown>;
  segments: string[];
  method: string;
  params: Record<string, string>;
}

export type PlatformRouteHandler = (ctx: PlatformRouteHandlerContext) => Promise<Response>;

export interface PlatformRouteEntry {
  method: string;
  pattern: string[];
  roles?: string[];
  handler: PlatformRouteHandler;
}