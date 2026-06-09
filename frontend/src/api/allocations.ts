import type { Allocation, AllocState, AllocationReceiverRole, Paginated } from "@/types/domain";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_ALLOCATIONS, MOCK_ASSETS, MOCK_LOCATIONS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
let mockAllocations = [...MOCK_ALLOCATIONS];

export type CreateAllocationInput = {
  asset_ids: string[];
  from_location_id?: string;
  from_location_name?: string;
  to_location_id?: string;
  to_location_name?: string;
  driver_id?: string | null;
  driver_mode?: "none" | "internal" | "external";
  external_driver_name?: string;
  external_driver_contact?: string;
  receiver_role: AllocationReceiverRole;
  receiver_user_id?: string | null;
  receiver_name?: string;
  receiver_contact?: string;
  start_date: string;
  expected_return: string;
};

export async function listAllocations(params: { page?: number; per_page?: number; state?: AllocState }) {
  if (useMock) {
    await delay();
    let items = mockAllocations;
    if (params.state) items = items.filter((a) => a.state === params.state);
    return paginate(items, params.page ?? 1, params.per_page ?? 10) as Paginated<Allocation>;
  }
  return unwrapPaginated(api.get("/api/v1/allocations", { params })) as Promise<Paginated<Allocation>>;
}

export async function createAllocation(body: CreateAllocationInput) {
  if (useMock) {
    await delay();
    const groupId = `grp-${Date.now()}`;
    const created: Allocation[] = [];
    for (const assetId of body.asset_ids) {
      const asset = MOCK_ASSETS.find((a) => a.id === assetId);
      const from =
        MOCK_LOCATIONS.find((l) => l.id === body.from_location_id) ??
        MOCK_LOCATIONS.find((l) => l.name.toLowerCase() === (body.from_location_name ?? "").trim().toLowerCase());
      const to =
        MOCK_LOCATIONS.find((l) => l.id === body.to_location_id) ??
        MOCK_LOCATIONS.find((l) => l.name.toLowerCase() === (body.to_location_name ?? "").trim().toLowerCase());
      created.push({
        id: `alloc-${Date.now()}-${assetId}`,
        group_id: groupId,
        asset_id: assetId,
        asset_label: asset ? `${asset.reg_serial_no} — ${asset.make} ${asset.model}` : undefined,
        from_location_id: from?.id ?? body.from_location_id ?? "",
        to_location_id: to?.id ?? body.to_location_id ?? "",
        from_location_name: from?.name ?? body.from_location_name,
        to_location_name: to?.name ?? body.to_location_name,
        driver_id: body.driver_id ?? null,
        driver_name:
          body.driver_mode === "external"
            ? body.external_driver_name ?? "External driver"
            : body.driver_id
              ? "Driver"
              : null,
        receiver_role: body.receiver_role,
        receiver_user_id: body.receiver_user_id ?? null,
        receiver_name: body.receiver_name ?? null,
        receiver_contact: body.receiver_contact ?? null,
        state: "pending",
        start_date: body.start_date,
        expected_return: body.expected_return,
      });
    }
    mockAllocations = [...created, ...mockAllocations];
    return created[0];
  }
  return unwrap(api.post("/api/v1/allocations", body)) as Promise<Allocation>;
}

export type AllocationTransitionResult = Allocation & {
  affected_count?: number;
};

const transitionFromState: Record<string, AllocState> = {
  approve: "pending",
  cancel: "pending",
  dispatch: "approved",
  receive: "in_transit",
  release: "active",
};

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
    const target = mockAllocations.find((a) => a.id === id);
    if (!target) throw new Error("Allocation not found");
    const fromState = transitionFromState[action];
    const toState = next[action];
    let affected = 0;
    mockAllocations = mockAllocations.map((a) => {
      const inGroup = target.group_id && a.group_id === target.group_id;
      const isTarget = a.id === id;
      const shouldUpdate = (inGroup || (!target.group_id && isTarget)) && a.state === fromState;
      if (!shouldUpdate) return a;
      affected += 1;
      return { ...a, state: toState };
    });
    const row = mockAllocations.find((a) => a.id === id);
    if (!row || affected === 0) throw new Error("Allocation not found");
    return { ...row, affected_count: affected };
  }
  return unwrap(api.put(`/api/v1/allocations/${id}/${action}`)) as Promise<AllocationTransitionResult>;
}
