import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TenantLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).openapi("TenantLoginRequest");

export const PlatformLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).openapi("PlatformLoginRequest");

export const RefreshTokenSchema = z.object({
  refresh_token: z.string(),
}).openapi("RefreshTokenRequest");

export const LogoutSchema = z.object({
  refresh_token: z.string().optional(),
}).openapi("LogoutRequest");

export const TokenResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    access_token: z.string(),
    expires_in: z.number(),
    refresh_token: z.string().optional(),
    refresh_expires_in: z.number().optional(),
    user: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      role: z.string(),
      location_ids: z.array(z.string()),
      tenant_id: z.string().uuid().optional(),
      tenant_name: z.string().optional(),
    }),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
}).openapi("TokenResponse");

export type TenantLogin = z.infer<typeof TenantLoginSchema>;
export type PlatformLogin = z.infer<typeof PlatformLoginSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type Logout = z.infer<typeof LogoutSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;