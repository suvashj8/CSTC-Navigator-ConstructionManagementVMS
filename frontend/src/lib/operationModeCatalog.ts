import type { CategoryOperationModes } from "@/lib/vehicleCategory";
import { findCategoryInCatalog, type VehicleCategoryMeta } from "@/lib/vehicleCategory";
import type { OperationMode } from "@/lib/vehicleOperation";
import { isVehicleAssetType } from "@/lib/assetTypeCatalog";
import type { AssetType } from "@/types/domain";

export const OPERATION_MODE_OTHER = "Other";
export const ROUTE_KM_LABEL = "Route + KM";
export const PLACE_HR_LABEL = "Place + Hr / Min";

export type OperationTrackingType = CategoryOperationModes | "custom";

export type OperationModeMeta = {
  id?: string;
  name: string;
  description?: string;
  trackingType: OperationTrackingType;
  fieldLabels?: string[];
  isCustom?: boolean;
};

export type CustomOperationMode = {
  id: string;
  name: string;
  description: string;
  tracking_type: OperationTrackingType;
  field_labels?: string[];
};

export function mergeOperationModes(custom: CustomOperationMode[]): OperationModeMeta[] {
  const customNames = new Set(custom.map((m) => m.name.toLowerCase()));
  const builtins = [
    { name: ROUTE_KM_LABEL, trackingType: "km", isCustom: false },
    { name: PLACE_HR_LABEL, trackingType: "hour", isCustom: false },
    { name: OPERATION_MODE_OTHER, trackingType: "both", isCustom: false },
  ] satisfies OperationModeMeta[];
  const visibleBuiltins = builtins.filter((b) => !customNames.has(b.name.toLowerCase()));
  const customs = custom.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    trackingType: m.tracking_type,
    fieldLabels: normalizeFieldLabels(m.field_labels),
    isCustom: true,
  }));
  return [...visibleBuiltins, ...customs].sort((a, b) => {
    if (a.name === OPERATION_MODE_OTHER) return 1;
    if (b.name === OPERATION_MODE_OTHER) return -1;
    return a.name.localeCompare(b.name);
  });
}

export function normalizeFieldLabels(labels: string[] | undefined): string[] {
  if (!labels?.length) return [];
  return labels.map((l) => l.trim()).filter(Boolean);
}

export function findOperationModeInCatalog(
  name: string,
  catalog: OperationModeMeta[]
): OperationModeMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((m) => m.name.toLowerCase() === q);
}

export function customFieldLabelsForPick(pick: string, catalog: OperationModeMeta[]): string[] {
  const meta = findOperationModeInCatalog(pick, catalog);
  if (!meta?.isCustom) return [];
  return meta.fieldLabels ?? [];
}

export function isDynamicCustomMode(pick: string, catalog: OperationModeMeta[]): boolean {
  return customFieldLabelsForPick(pick, catalog).length > 0;
}

export function isReservedBuiltinOperationModeName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return [ROUTE_KM_LABEL, PLACE_HR_LABEL].some((l) => l.toLowerCase() === q);
}

export function categoryTrackingType(
  vehicleCategory: string,
  _categoryCatalog: VehicleCategoryMeta[]
): CategoryOperationModes {
  if (vehicleCategory === "Dozer") return "hour";
  return "both";
}

export function filterOperationModeOptions(
  options: readonly string[],
  query: string,
  limit = 12
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options].slice(0, limit);

  const matched: string[] = [];
  for (const opt of options) {
    const lower = opt.toLowerCase();
    if (lower.startsWith(q) || lower.split(/\s+/).some((w) => w.startsWith(q)) || lower.includes(q)) {
      matched.push(opt);
    }
  }
  for (const pin of [ROUTE_KM_LABEL, PLACE_HR_LABEL, OPERATION_MODE_OTHER]) {
    if (options.includes(pin) && !matched.includes(pin)) {
      matched.push(pin);
    }
  }
  return matched.slice(0, limit);
}

/** Built-in modes are always listed; custom modes from Other are included too. */
export function operationModeOptionsForCategory(
  vehicleCategory: string,
  categoryCatalog: VehicleCategoryMeta[],
  operationCatalog: OperationModeMeta[]
): string[] {
  const allowed = categoryTrackingType(vehicleCategory, categoryCatalog);
  return operationCatalog
    .filter((m) => {
      if (m.name === ROUTE_KM_LABEL || m.name === PLACE_HR_LABEL || m.name === OPERATION_MODE_OTHER) {
        return true;
      }
      if (m.isCustom && (m.fieldLabels?.length ?? 0) > 0) return true;
      if (!m.isCustom) return false;
      if (allowed === "both") return true;
      return m.trackingType === allowed;
    })
    .map((m) => m.name);
}

export function shouldShowOperationModePicker(
  assetType: AssetType,
  vehicleCategory: string,
  _categoryCatalog: VehicleCategoryMeta[]
): boolean {
  if (!isVehicleAssetType(assetType)) return false;
  if (vehicleCategory === "Dozer") return false;
  return true;
}

export function resolveOperationFromPick(
  pick: string,
  operationCatalog: OperationModeMeta[]
): { mode: OperationMode; label: string | null } {
  const trimmed = pick.trim();
  if (!trimmed || trimmed === ROUTE_KM_LABEL) return { mode: "km", label: null };
  if (trimmed === PLACE_HR_LABEL) return { mode: "hour", label: null };
  const custom = findOperationModeInCatalog(trimmed, operationCatalog);
  if (custom?.isCustom) {
    if ((custom.fieldLabels?.length ?? 0) > 0) return { mode: "custom", label: custom.name };
    if (custom.trackingType === "hour") return { mode: "hour", label: custom.name };
    if (custom.trackingType === "km") return { mode: "km", label: custom.name };
    return { mode: "km", label: custom.name };
  }
  return { mode: "km", label: trimmed };
}

export function isHourlyFromOperationPick(
  pick: string,
  operationMode: OperationMode,
  vehicleCategory: string,
  categoryCatalog: VehicleCategoryMeta[],
  operationCatalog: OperationModeMeta[]
): boolean {
  if (isDynamicCustomMode(pick, operationCatalog)) return false;
  if (operationMode === "custom") return false;
  if (vehicleCategory === "Dozer") return true;
  const custom = findOperationModeInCatalog(pick, operationCatalog);
  if (custom?.isCustom) {
    if (custom.trackingType === "hour") return true;
    if (custom.trackingType === "km") return false;
    if (custom.trackingType === "both") return operationMode === "hour";
  }
  if (pick === PLACE_HR_LABEL) return true;
  if (pick === ROUTE_KM_LABEL) return false;
  return operationMode === "hour";
}

export function defaultOperationModePick(
  vehicleCategory: string,
  categoryCatalog: VehicleCategoryMeta[]
): string {
  const t = categoryTrackingType(vehicleCategory, categoryCatalog);
  if (t === "hour") return PLACE_HR_LABEL;
  return ROUTE_KM_LABEL;
}

export function operationModePickFromAsset(
  operationMode: OperationMode | null | undefined,
  operationModeLabel: string | null | undefined,
  vehicleCategory: string,
  categoryCatalog: VehicleCategoryMeta[]
): string {
  if (operationMode === "custom" && operationModeLabel?.trim()) return operationModeLabel.trim();
  if (operationModeLabel?.trim()) return operationModeLabel.trim();
  if (operationMode === "hour") return PLACE_HR_LABEL;
  return defaultOperationModePick(vehicleCategory, categoryCatalog);
}
