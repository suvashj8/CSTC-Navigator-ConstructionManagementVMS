import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const MaintenanceCreateSchema = z.object({
  asset_id: z.string().uuid(),
  supplier_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string().date().nullable().optional(),
  completed_at: z.string().date().nullable().optional(),
  status: z.enum(["Scheduled", "In Progress", "Completed", "Cancelled"]).default("Scheduled"),
  description: z.string().nullable().optional(),
  parts_cost: z.number().nonnegative().nullable().optional(),
  labor_cost: z.number().nonnegative().nullable().optional(),
  odometer_at_service: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
}).openapi("MaintenanceCreate");

export const MaintenanceUpdateSchema = MaintenanceCreateSchema.partial().openapi("MaintenanceUpdate");

export const MaintenanceResponseSchema = z.object({
  id: z.string().uuid(),
  asset_id: z.string().uuid(),
  asset_label: z.string().nullable(),
  supplier_id: z.string().uuid().nullable(),
  supplier_name: z.string().nullable(),
  scheduled_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  status: z.string(),
  description: z.string().nullable(),
  parts_cost: z.number().nullable(),
  labor_cost: z.number().nullable(),
  odometer_at_service: z.number().nullable(),
  notes: z.string().nullable(),
}).openapi("MaintenanceResponse");

export const MaintenanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  asset_id: z.string().uuid().optional(),
}).openapi("MaintenanceListQuery");

export const MaintenanceListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(MaintenanceResponseSchema),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }).optional(),
}).openapi("MaintenanceListResponse");

export type MaintenanceCreate = z.infer<typeof MaintenanceCreateSchema>;
export type MaintenanceUpdate = z.infer<typeof MaintenanceUpdateSchema>;
export type MaintenanceResponse = z.infer<typeof MaintenanceResponseSchema>;
export type MaintenanceListQuery = z.infer<typeof MaintenanceListQuerySchema>;
export type MaintenanceListResponse = z.infer<typeof MaintenanceListResponseSchema>;