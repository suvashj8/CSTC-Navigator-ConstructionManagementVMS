import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const FuelLogCreateSchema = z.object({
  asset_id: z.string().uuid(),
  supplier_id: z.string().uuid().nullable().optional(),
  fueled_at: z.string().datetime().optional().default(() => new Date().toISOString()),
  odometer_km: z.number().int().nullable().optional(),
  liters: z.number().positive().nullable().optional(),
  total_cost: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).openapi("FuelLogCreate");

export const FuelLogUpdateSchema = FuelLogCreateSchema.partial().openapi("FuelLogUpdate");

export const FuelLogResponseSchema = z.object({
  id: z.string().uuid(),
  asset_id: z.string().uuid(),
  asset_label: z.string().nullable(),
  supplier_id: z.string().uuid().nullable(),
  supplier_name: z.string().nullable(),
  fueled_at: z.string(),
  odometer_km: z.number().nullable(),
  liters: z.number().nullable(),
  total_cost: z.number().nullable(),
  notes: z.string().nullable(),
}).openapi("FuelLogResponse");

export const FuelLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  asset_id: z.string().uuid().optional(),
}).openapi("FuelLogListQuery");

export const FuelLogListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(FuelLogResponseSchema),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }).optional(),
}).openapi("FuelLogListResponse");

export type FuelLogCreate = z.infer<typeof FuelLogCreateSchema>;
export type FuelLogUpdate = z.infer<typeof FuelLogUpdateSchema>;
export type FuelLogResponse = z.infer<typeof FuelLogResponseSchema>;
export type FuelLogListQuery = z.infer<typeof FuelLogListQuerySchema>;
export type FuelLogListResponse = z.infer<typeof FuelLogListResponseSchema>;