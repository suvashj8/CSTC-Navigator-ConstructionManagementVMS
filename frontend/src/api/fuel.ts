import type { FuelLog, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";

export async function listFuelLogs(params: {
  page?: number;
  per_page?: number;
  asset_id?: string;
} = {}) {
  return unwrapPaginated(api.get("/api/v1/fuel-logs", { params })) as Promise<Paginated<FuelLog>>;
}

export async function createFuelLog(body: {
  asset_id: string;
  supplier_id?: string;
  fueled_at?: string;
  odometer_km?: number;
  liters?: number;
  total_cost?: number;
  notes?: string;
}) {
  return unwrap(api.post("/api/v1/fuel-logs", body)) as Promise<FuelLog>;
}

export async function updateFuelLog(
  id: string,
  body: Partial<{
    supplier_id: string;
    fueled_at: string;
    odometer_km: number;
    liters: number;
    total_cost: number;
    notes: string;
  }>
) {
  return unwrap(api.put(`/api/v1/fuel-logs/${id}`, body)) as Promise<FuelLog>;
}

export async function deleteFuelLog(id: string) {
  return unwrap(api.delete(`/api/v1/fuel-logs/${id}`));
}
