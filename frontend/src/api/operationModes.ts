import type { CustomOperationMode } from "@/lib/operationModeCatalog";
import { api, unwrap, unwrapList } from "./client";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

let mockModes: CustomOperationMode[] = [];

export async function listOperationModes() {
  if (useMock) {
    return [...mockModes];
  }
  return unwrapList(api.get("/api/v1/operation-modes")) as Promise<CustomOperationMode[]>;
}

export async function createOperationMode(body: {
  name: string;
  description?: string;
  field_labels: string[];
}) {
  if (useMock) {
    const row: CustomOperationMode = {
      id: `om-${Date.now()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      tracking_type: "custom",
      field_labels: body.field_labels,
    };
    mockModes = [row, ...mockModes.filter((m) => m.name.toLowerCase() !== row.name.toLowerCase())];
    return row;
  }
  return unwrap(api.post("/api/v1/operation-modes", body)) as Promise<CustomOperationMode>;
}
