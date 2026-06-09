import type { CustomAssetType } from "@/lib/assetTypeCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockTypes: CustomAssetType[] = [];

export async function listAssetTypes() {
  if (useMock) {
    return [...mockTypes];
  }
  return unwrapList(api.get("/api/v1/asset-types")) as Promise<CustomAssetType[]>;
}

export async function createAssetType(body: { name: string; description?: string }) {
  if (useMock) {
    const row: CustomAssetType = {
      id: `at-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
    };
    mockTypes = [row, ...mockTypes.filter((t) => t.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/asset-types", body)) as Promise<CustomAssetType>;
}
