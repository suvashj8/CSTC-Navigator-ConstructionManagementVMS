import type { OperationFieldState } from "@/components/assets/VehicleOperationFields";
import type { Asset, AssetType } from "@/types/domain";
import {
  defaultOperationMode,
  type OperationMode,
  usesHourlyOperation,
} from "@/lib/vehicleOperation";

export function assetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    vehicle: "Vehicle",
    equipment: "Equipment",
    tool: "Tool",
  };
  return labels[type];
}

export function formatAssetTypeDetail(asset: Asset): string {
  if (asset.asset_type === "vehicle") {
    return asset.vehicle_category?.trim() || "Vehicle";
  }
  return assetTypeLabel(asset.asset_type);
}

export function defaultOperationModeForAsset(asset: Asset): OperationMode {
  if (asset.asset_type === "equipment" || asset.asset_type === "tool") return "hour";
  return defaultOperationMode(asset.vehicle_category ?? "");
}

export function usesHourlyOperationForAsset(
  assetType: AssetType,
  vehicleCategory: string,
  operationMode: OperationMode
): boolean {
  if (assetType === "equipment" || assetType === "tool") return true;
  return usesHourlyOperation(vehicleCategory, operationMode);
}

export function canChooseOperationModeForAsset(assetType: AssetType, vehicleCategory: string): boolean {
  if (assetType !== "vehicle") return false;
  return vehicleCategory === "Other" || !vehicleCategory;
}

/** Matches the Mode badge / operationModeLabel logic used in the operations table. */
export function matchesOperationModeFilter(
  asset: Asset,
  filter: "all" | "km" | "hour"
): boolean {
  if (filter === "all") return true;
  const hourly = usesHourlyOperationForAsset(
    asset.asset_type,
    asset.vehicle_category ?? "",
    (asset.operation_mode as OperationMode) ??
      (asset.asset_type === "vehicle" ? defaultOperationMode(asset.vehicle_category ?? "") : "hour")
  );
  return filter === "hour" ? hourly : !hourly;
}

type ResolvedOperation = {
  vehicle_category: string | null;
  operation_mode: OperationMode;
  route_from: string | null;
  route_to: string | null;
  operation_km: number | null;
  operation_place: string | null;
  operation_hours: number | null;
  operation_minutes: number | null;
};

export function resolveAssetOperation(
  asset: Asset,
  vehicleCategory: string,
  operation: OperationFieldState
): ResolvedOperation {
  const opt = (s: string) => {
    const t = s.trim();
    return t || null;
  };
  const parseNum = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const parseIntOpt = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };

  if (asset.asset_type !== "vehicle") {
    return {
      vehicle_category: null,
      operation_mode: "hour",
      route_from: null,
      route_to: null,
      operation_km: null,
      operation_place: opt(operation.operation_place),
      operation_hours: parseIntOpt(operation.operation_hours),
      operation_minutes: parseIntOpt(operation.operation_minutes),
    };
  }

  const category = vehicleCategory.trim();
  const hourly = usesHourlyOperation(category, operation.operation_mode);
  const mode: OperationMode = hourly ? "hour" : "km";

  return {
    vehicle_category: category || null,
    operation_mode: mode,
    route_from: hourly ? null : opt(operation.route_from),
    route_to: hourly ? null : opt(operation.route_to),
    operation_km: hourly ? null : parseNum(operation.operation_km),
    operation_place: hourly ? opt(operation.operation_place) : null,
    operation_hours: hourly ? parseIntOpt(operation.operation_hours) : null,
    operation_minutes: hourly ? parseIntOpt(operation.operation_minutes) : null,
  };
}
