import type { CategoryOperationModes, CustomVehicleCategory } from "@/lib/vehicleCategory";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockCategories: CustomVehicleCategory[] = [];

export async function listVehicleCategories() {
  if (useMock) {
    return [...mockCategories];
  }
  return unwrapList(api.get("/api/v1/vehicle-categories")) as Promise<CustomVehicleCategory[]>;
}

export async function createVehicleCategory(body: {
  name: string;
  description?: string;
  operation_modes: CategoryOperationModes;
}) {
  if (useMock) {
    const row: CustomVehicleCategory = {
      id: `vc-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      operation_modes: body.operation_modes,
    };
    mockCategories = [row, ...mockCategories.filter((c) => c.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/vehicle-categories", body)) as Promise<CustomVehicleCategory>;
}
