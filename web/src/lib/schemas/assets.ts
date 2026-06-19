import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const AssetCreateSchema = z.object({
  asset_type: z.enum(["vehicle", "equipment", "tool"]),
  reg_serial_no: z.string().min(1).max(80),
  make: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  year: z.number().int().min(1900).max(2100),
  ownership_type: z.enum(["owned", "leased", "rented"]).default("owned"),
  status: z.enum(["active", "in_repair", "in_transit", "decommissioned"]).default("active"),
  location_id: z.string().uuid().nullable().optional(),
  vehicle_category: z.string().max(100).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  rta_office: z.string().max(100).nullable().optional(),
  alert_cell_number: z.string().max(50).nullable().optional(),
  registration_date: z.string().date().nullable().optional(),
  bluebook_no: z.string().max(80).nullable().optional(),
  bluebook_issued_at: z.string().date().nullable().optional(),
  bluebook_expires_at: z.string().date().nullable().optional(),
  operation_mode: z.enum(["km", "hour"]).nullable().optional(),
  operation_mode_label: z.string().max(100).nullable().optional(),
  operation_custom_fields: z.record(z.string(), z.unknown()).optional().default(() => ({})),
  route_from: z.string().max(200).nullable().optional(),
  route_to: z.string().max(200).nullable().optional(),
  operation_km: z.number().int().nullable().optional(),
  operation_place: z.string().max(200).nullable().optional(),
  operation_hours: z.number().int().nullable().optional(),
  operation_minutes: z.number().int().nullable().optional(),
}).openapi("AssetCreate");

export const AssetUpdateSchema = AssetCreateSchema.partial().openapi("AssetUpdate");

export const AssetResponseSchema = z.object({
  id: z.string().uuid(),
  asset_type: z.string(),
  reg_serial_no: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  ownership_type: z.string(),
  status: z.string(),
  location_id: z.string().uuid().nullable(),
  location_name: z.string().nullable(),
  assigned_driver_id: z.string().uuid().nullable(),
  assigned_driver_name: z.string().nullable(),
  vehicle_category: z.string().nullable(),
  department: z.string().nullable(),
  rta_office: z.string().nullable(),
  alert_cell_number: z.string().nullable(),
  registration_date: z.string().nullable(),
  bluebook_no: z.string().nullable(),
  bluebook_issued_at: z.string().nullable(),
  bluebook_expires_at: z.string().nullable(),
  operation_mode: z.string().nullable(),
  operation_mode_label: z.string().nullable(),
  operation_custom_fields: z.record(z.string(), z.unknown()).optional(),
  route_from: z.string().nullable(),
  route_to: z.string().nullable(),
  operation_km: z.number().nullable(),
  operation_place: z.string().nullable(),
  operation_hours: z.number().nullable(),
  operation_minutes: z.number().nullable(),
}).openapi("AssetResponse");

export const AssetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(["active", "in_repair", "in_transit", "decommissioned"]).optional(),
  asset_type: z.enum(["vehicle", "equipment", "tool"]).optional(),
  operational: z.coerce.boolean().optional(),
  operation_mode: z.enum(["km", "hour"]).optional(),
}).openapi("AssetListQuery");

export const AssetListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(AssetResponseSchema),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }).optional(),
}).openapi("AssetListResponse");

export type AssetCreate = z.infer<typeof AssetCreateSchema>;
export type AssetUpdate = z.infer<typeof AssetUpdateSchema>;
export type AssetResponse = z.infer<typeof AssetResponseSchema>;
export type AssetListQuery = z.infer<typeof AssetListQuerySchema>;
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;