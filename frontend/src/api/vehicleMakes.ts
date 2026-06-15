import type { CustomVehicleMake } from "@/lib/vehicleMakeCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockMakes: CustomVehicleMake[] = [];

export async function listVehicleMakes() {
  if (useMock) {
    return [...mockMakes];
  }
  return unwrapList(api.get("/api/v1/vehicle-makes")) as Promise<CustomVehicleMake[]>;
}

export async function createVehicleMake(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomVehicleMake = {
      id: `vm-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockMakes = [row, ...mockMakes.filter((m) => m.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/vehicle-makes", body)) as Promise<CustomVehicleMake>;
}
