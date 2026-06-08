import type { Asset, Paginated } from "@/types/domain";
import { matchesOperationModeFilter } from "@/lib/assetOperation";
import { api, unwrap, unwrapPaginated } from "./client";
import { MOCK_ASSETS, MOCK_LOCATIONS, delay, paginate } from "./mock/data";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockAssets = [...MOCK_ASSETS];

export type { Asset };

type CreateAssetInput = Omit<Asset, "id" | "location_name" | "assigned_driver_name"> & {
  vehicle_category?: string | null;
};

const OPERATIONAL_STATUSES = new Set(["active", "in_transit", "in_repair"]);

export async function listAssets(params: {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  /** When true, includes active, in_transit, and in_repair — excludes decommissioned. */
  operational_only?: boolean;
  asset_type?: string;
  operation_mode?: "km" | "hour";
}) {
  if (useMock) {
    await delay();
    let items = mockAssets;
    if (params.operational_only) {
      items = items.filter((a) => OPERATIONAL_STATUSES.has(a.status));
    } else if (params.status) {
      items = items.filter((a) => a.status === params.status);
    }
    if (params.asset_type) items = items.filter((a) => a.asset_type === params.asset_type);
    if (params.operation_mode === "hour" || params.operation_mode === "km") {
      items = items.filter((a) => matchesOperationModeFilter(a, params.operation_mode!));
    }
    return paginate(items, params.page ?? 1, params.per_page ?? 10, params.search, (a, q) =>
      `${a.reg_serial_no} ${a.make} ${a.model}`.toLowerCase().includes(q)
    ) as Paginated<Asset>;
  }
  const { operational_only, ...rest } = params;
  return unwrapPaginated(
    api.get("/api/v1/assets", {
      params: {
        ...rest,
        ...(operational_only ? { operational: "true" } : {}),
      },
    })
  ) as Promise<Paginated<Asset>>;
}

export async function createAsset(body: CreateAssetInput) {
  if (useMock) {
    await delay();
    const asset: Asset = {
      ...body,
      id: `ast-${Date.now()}`,
      location_name: MOCK_LOCATIONS.find((l) => l.id === body.location_id)?.name,
    };
    mockAssets = [asset, ...mockAssets];
    return asset;
  }
  return unwrap(api.post("/api/v1/assets", body)) as Promise<Asset>;
}

export async function updateAsset(id: string, body: Partial<Asset>) {
  if (useMock) {
    await delay();
    mockAssets = mockAssets.map((a) => (a.id === id ? { ...a, ...body } : a));
    const asset = mockAssets.find((a) => a.id === id);
    if (!asset) throw new Error("Asset not found");
    return asset;
  }
  return unwrap(api.put(`/api/v1/assets/${id}`, body)) as Promise<Asset>;
}

export async function deleteAsset(id: string) {
  if (useMock) {
    await delay();
    mockAssets = mockAssets.map((a) => (a.id === id ? { ...a, status: "decommissioned" as const } : a));
    return;
  }
  await unwrap(api.delete(`/api/v1/assets/${id}`));
}
