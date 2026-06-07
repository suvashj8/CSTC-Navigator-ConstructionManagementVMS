import type { MaintenanceJob, MaintenanceStatus, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";

export async function listMaintenance(params: {
  page?: number;
  per_page?: number;
  asset_id?: string;
} = {}) {
  return unwrapPaginated(api.get("/api/v1/maintenance", { params })) as Promise<Paginated<MaintenanceJob>>;
}

export async function createMaintenance(body: {
  asset_id: string;
  supplier_id?: string;
  scheduled_at?: string;
  completed_at?: string;
  status?: MaintenanceStatus | string;
  description?: string;
  parts_cost?: number;
  labor_cost?: number;
  odometer_at_service?: number;
  notes?: string;
}) {
  return unwrap(api.post("/api/v1/maintenance", body)) as Promise<MaintenanceJob>;
}

export async function updateMaintenance(
  id: string,
  body: Partial<{
    supplier_id: string;
    scheduled_at: string;
    completed_at: string;
    status: MaintenanceStatus | string;
    description: string;
    parts_cost: number;
    labor_cost: number;
    odometer_at_service: number;
    notes: string;
  }>
) {
  return unwrap(api.put(`/api/v1/maintenance/${id}`, body)) as Promise<MaintenanceJob>;
}

export async function deleteMaintenance(id: string) {
  return unwrap(api.delete(`/api/v1/maintenance/${id}`));
}
