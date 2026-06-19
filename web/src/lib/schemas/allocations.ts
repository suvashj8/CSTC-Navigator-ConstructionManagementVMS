import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const AllocationCreateSchema = z.object({
  asset_ids: z.array(z.string().uuid()).min(1).optional(),
  asset_id: z.string().uuid().optional(),
  from_location_id: z.string().uuid().optional(),
  from_location_name: z.string().max(100).optional(),
  to_location_id: z.string().uuid().optional(),
  to_location_name: z.string().max(100).optional(),
  driver_id: z.string().uuid().nullable().optional(),
  external_driver_name: z.string().max(100).nullable().optional(),
  external_driver_contact: z.string().max(50).nullable().optional(),
  receiver_user_id: z.string().uuid().nullable().optional(),
  receiver_role: z.enum(["manager", "employee", "supervisor", "other"]),
  receiver_name: z.string().max(100).nullable().optional(),
  receiver_contact: z.string().max(50).nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  start_date: z.string().date(),
  expected_return: z.string().date(),
  driver_mode: z.enum(["internal", "external"]).optional(),
}).refine(data => data.asset_ids?.length || data.asset_id, {
  message: "At least one asset is required",
}).openapi("AllocationCreate");

export const AllocationTransitionSchema = z.object({
  action: z.enum(["approve", "start", "release", "cancel"]),
}).openapi("AllocationTransition");

export const AllocationResponseSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid().nullable(),
  asset_id: z.string().uuid(),
  asset_label: z.string(),
  from_location_id: z.string().uuid(),
  from_location_name: z.string(),
  to_location_id: z.string().uuid(),
  to_location_name: z.string(),
  driver_id: z.string().uuid().nullable(),
  driver_name: z.string().nullable(),
  external_driver_name: z.string().nullable(),
  external_driver_contact: z.string().nullable(),
  receiver_user_id: z.string().uuid().nullable(),
  receiver_role: z.string().nullable(),
  receiver_name: z.string().nullable(),
  receiver_contact: z.string().nullable(),
  state: z.string(),
  start_date: z.string().nullable(),
  expected_return: z.string().nullable(),
  actual_return: z.string().nullable(),
}).openapi("AllocationResponse");

export const AllocationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  state: z.enum(["pending", "approved", "in_transit", "active", "released", "cancelled"]).optional(),
}).openapi("AllocationListQuery");

export const AllocationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(AllocationResponseSchema),
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional(),
  }).optional(),
}).openapi("AllocationListResponse");

export type AllocationCreate = z.infer<typeof AllocationCreateSchema>;
export type AllocationTransition = z.infer<typeof AllocationTransitionSchema>;
export type AllocationResponse = z.infer<typeof AllocationResponseSchema>;
export type AllocationListQuery = z.infer<typeof AllocationListQuerySchema>;
export type AllocationListResponse = z.infer<typeof AllocationListResponseSchema>;