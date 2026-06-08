import type { CustomVehicleDepartment } from "@/lib/vehicleDepartment";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockDepartments: CustomVehicleDepartment[] = [];

export async function listVehicleDepartments() {
  if (useMock) {
    return [...mockDepartments];
  }
  return unwrapList(api.get("/api/v1/vehicle-departments")) as Promise<CustomVehicleDepartment[]>;
}

export async function createVehicleDepartment(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomVehicleDepartment = {
      id: `vd-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockDepartments = [row, ...mockDepartments.filter((d) => d.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/vehicle-departments", body)) as Promise<CustomVehicleDepartment>;
}
