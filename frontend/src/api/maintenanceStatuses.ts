import type { CustomMaintenanceStatus } from "@/lib/maintenanceStatusCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomMaintenanceStatus[] = [];

export async function listMaintenanceStatuses() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/maintenance-statuses")) as Promise<CustomMaintenanceStatus[]>;
}

export async function createMaintenanceStatus(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomMaintenanceStatus = {
      id: `ms-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((s) => s.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/maintenance-statuses", body)) as Promise<CustomMaintenanceStatus>;
}
