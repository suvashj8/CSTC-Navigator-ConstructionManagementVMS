import type { CustomLocationType } from "@/lib/locationTypeCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockRows: CustomLocationType[] = [];

export async function listLocationTypes() {
  if (useMock) return [...mockRows];
  return unwrapList(api.get("/api/v1/location-types")) as Promise<CustomLocationType[]>;
}

export async function createLocationType(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomLocationType = {
      id: `lt-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockRows = [row, ...mockRows.filter((t) => t.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/location-types", body)) as Promise<CustomLocationType>;
}
