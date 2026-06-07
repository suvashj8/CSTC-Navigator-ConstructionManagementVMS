import type { Allocation, AllocState, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_ALLOCATIONS, MOCK_ASSETS, MOCK_LOCATIONS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockAllocations = [...MOCK_ALLOCATIONS];

export async function listAllocations(params: { page?: number; per_page?: number; state?: AllocState }) {
  if (useMock) {
    await delay();
    let items = mockAllocations;
    if (params.state) items = items.filter((a) => a.state === params.state);
    return paginate(items, params.page ?? 1, params.per_page ?? 10) as Paginated<Allocation>;
  }
  return unwrapPaginated(api.get("/api/v1/allocations", { params })) as Promise<Paginated<Allocation>>;
}

export async function createAllocation(body: {
  asset_id: string;
  from_location_id: string;
  to_location_id: string;
  driver_id: string;
  start_date: string;
  expected_return: string;
}) {
  if (useMock) {
    await delay();
    const asset = MOCK_ASSETS.find((a) => a.id === body.asset_id);
    const from = MOCK_LOCATIONS.find((l) => l.id === body.from_location_id);
    const to = MOCK_LOCATIONS.find((l) => l.id === body.to_location_id);
    const alloc: Allocation = {
      id: `alloc-${Date.now()}`,
      ...body,
      asset_label: asset ? `${asset.reg_serial_no} — ${asset.make} ${asset.model}` : undefined,
      from_location_name: from?.name,
      to_location_name: to?.name,
      state: "pending",
    };
    mockAllocations = [alloc, ...mockAllocations];
    return alloc;
  }
  return unwrap(api.post("/api/v1/allocations", body)) as Promise<Allocation>;
}

export async function transitionAllocation(id: string, action: "approve" | "dispatch" | "receive" | "release" | "cancel") {
  if (useMock) {
    await delay();
    const next: Record<string, AllocState> = {
      approve: "approved",
      dispatch: "in_transit",
      receive: "active",
      release: "released",
      cancel: "cancelled",
    };
    mockAllocations = mockAllocations.map((a) => (a.id === id ? { ...a, state: next[action] } : a));
    const row = mockAllocations.find((a) => a.id === id);
    if (!row) throw new Error("Allocation not found");
    return row;
  }
  return unwrap(api.put(`/api/v1/allocations/${id}/${action}`)) as Promise<Allocation>;
}
