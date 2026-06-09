import type { OperationFieldState } from "@/components/assets/VehicleOperationFields";
import { assetTypeDisplayLabel, isVehicleAssetType } from "@/lib/assetTypeCatalog";
import type { AssetTypeMeta } from "@/lib/assetTypeCatalog";
import type { Asset, AssetType } from "@/types/domain";
import {
  defaultOperationModePick,
  isDynamicCustomMode,
  isHourlyFromOperationPick,
  resolveOperationFromPick,
  type OperationModeMeta,
} from "@/lib/operationModeCatalog";
import type { VehicleCategoryMeta } from "@/lib/vehicleCategory";
import {
  defaultOperationMode,
  type OperationMode,
  usesHourlyOperation,
} from "@/lib/vehicleOperation";

export function assetTypeLabel(type: AssetType, catalog: AssetTypeMeta[] = []): string {
  return assetTypeDisplayLabel(type, catalog);
}

export function formatAssetTypeDetail(asset: Asset, catalog: AssetTypeMeta[] = []): string {
  if (isVehicleAssetType(asset.asset_type)) {
    return asset.vehicle_category?.trim() || "Vehicle";
  }
  return assetTypeLabel(asset.asset_type, catalog);
}

export function defaultOperationModeForAsset(asset: Asset): OperationMode {
  if (!isVehicleAssetType(asset.asset_type)) return "hour";
  return defaultOperationMode(asset.vehicle_category ?? "");
}

export function usesHourlyOperationForAsset(
  assetType: AssetType,
  vehicleCategory: string,
  operationMode: OperationMode
): boolean {
  if (operationMode === "custom") return false;
  if (!isVehicleAssetType(assetType)) return true;
  return usesHourlyOperation(vehicleCategory, operationMode);
}

export function canChooseOperationModeForAsset(
  assetType: AssetType,
  vehicleCategory: string
): boolean {
  if (!isVehicleAssetType(assetType)) return false;
  return vehicleCategory !== "Dozer";
}

export function matchesOperationModeFilter(
  asset: Asset,
  filter: "all" | "km" | "hour"
): boolean {
  if (filter === "all") return true;
  if (asset.operation_mode === "custom") return filter === "km";
  const hourly = usesHourlyOperationForAsset(
    asset.asset_type,
    asset.vehicle_category ?? "",
    (asset.operation_mode as OperationMode) ??
      (isVehicleAssetType(asset.asset_type) ? defaultOperationMode(asset.vehicle_category ?? "") : "hour")
  );
  return filter === "hour" ? hourly : !hourly;
}

type ResolvedOperation = {
  vehicle_category: string | null;
  operation_mode: OperationMode;
  operation_mode_label: string | null;
  route_from: string | null;
  route_to: string | null;
  operation_km: number | null;
  operation_place: string | null;
  operation_hours: number | null;
  operation_minutes: number | null;
  operation_custom_fields: Record<string, string> | null;
};

export function resolveAssetOperation(
  asset: Asset,
  vehicleCategory: string,
  operation: OperationFieldState,
  categoryCatalog: VehicleCategoryMeta[] = [],
  operationCatalog: OperationModeMeta[] = []
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

  if (!isVehicleAssetType(asset.asset_type)) {
    return {
      vehicle_category: null,
      operation_mode: "hour",
      operation_mode_label: null,
      route_from: null,
      route_to: null,
      operation_km: null,
      operation_place: opt(operation.operation_place),
      operation_hours: parseIntOpt(operation.operation_hours),
      operation_minutes: parseIntOpt(operation.operation_minutes),
      operation_custom_fields: null,
    };
  }

  const category = vehicleCategory.trim();
  const pick = operation.operation_mode_pick || defaultOperationModePick(category, categoryCatalog);
  const customDynamic = isDynamicCustomMode(pick, operationCatalog);
  const hourly = isHourlyFromOperationPick(
    pick,
    operation.operation_mode,
    category,
    categoryCatalog,
    operationCatalog
  );
  const { mode, label } = resolveOperationFromPick(pick, operationCatalog);

  if (customDynamic) {
    const customFields = Object.fromEntries(
      Object.entries(operation.operation_custom_fields)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([, v]) => v)
    );
    return {
      vehicle_category: category || null,
      operation_mode: "custom",
      operation_mode_label: label,
      route_from: null,
      route_to: null,
      operation_km: null,
      operation_place: null,
      operation_hours: null,
      operation_minutes: null,
      operation_custom_fields: customFields,
    };
  }

  return {
    vehicle_category: category || null,
    operation_mode: hourly ? "hour" : mode,
    operation_mode_label: label,
    route_from: hourly ? null : opt(operation.route_from),
    route_to: hourly ? null : opt(operation.route_to),
    operation_km: hourly ? null : parseNum(operation.operation_km),
    operation_place: hourly ? opt(operation.operation_place) : null,
    operation_hours: hourly ? parseIntOpt(operation.operation_hours) : null,
    operation_minutes: hourly ? parseIntOpt(operation.operation_minutes) : null,
    operation_custom_fields: null,
  };
}
