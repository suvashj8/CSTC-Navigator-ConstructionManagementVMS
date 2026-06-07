import type { WorkLocation } from "@/types/domain";
import { api, unwrap, unwrapList } from "./client";
import { MOCK_LOCATIONS, delay } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockLocations = [...MOCK_LOCATIONS];

export async function listLocations() {
  if (useMock) {
    await delay();
    return [...mockLocations];
  }
  return unwrapList(api.get("/api/v1/locations")) as Promise<WorkLocation[]>;
}

export async function createLocation(body: {
  name: string;
  type?: string;
  address?: string;
  manager_id?: string | null;
}) {
  if (useMock) {
    await delay();
    const loc: WorkLocation = {
      id: `loc-${Date.now()}`,
      name: body.name,
      type: body.type ?? "construction",
      address: body.address ?? "",
      manager_id: body.manager_id ?? null,
      is_custom: true,
    };
    mockLocations = [loc, ...mockLocations];
    return loc;
  }
  return unwrap(api.post("/api/v1/locations", body)) as Promise<WorkLocation>;
}

export async function updateLocation(
  id: string,
  body: Partial<{
    name: string;
    type: string;
    address: string;
    manager_id: string | null;
  }>
) {
  if (useMock) {
    await delay();
    mockLocations = mockLocations.map((l) => (l.id === id ? { ...l, ...body } : l));
    const loc = mockLocations.find((l) => l.id === id);
    if (!loc) throw new Error("Location not found");
    return loc;
  }
  return unwrap(api.put(`/api/v1/locations/${id}`, body)) as Promise<WorkLocation>;
}
