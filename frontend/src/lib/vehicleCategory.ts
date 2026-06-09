import { VEHICLE_CATEGORIES } from "@/data/vehicleCatalog";
import { defaultOperationMode, type OperationMode, usesHourlyOperation } from "@/lib/vehicleOperation";

export const VEHICLE_CATEGORY_OTHER = "Other";

export type CategoryOperationModes = "km" | "hour" | "both";

export type VehicleCategoryMeta = {
  id?: string;
  name: string;
  description?: string;
  operationModes: CategoryOperationModes;
  isCustom?: boolean;
};

export type CustomVehicleCategory = {
  id: string;
  name: string;
  description: string;
  operation_modes: CategoryOperationModes;
};

/** Only Dozer is fixed hourly; all other categories use the operation-mode picker. */
export function builtinOperationModes(name: string): CategoryOperationModes {
  if (name === "Dozer") return "hour";
  return "both";
}

export function mergeVehicleCategories(custom: CustomVehicleCategory[]): VehicleCategoryMeta[] {
  const customNames = new Set(custom.map((c) => c.name.toLowerCase()));
  const builtins = VEHICLE_CATEGORIES.filter((name) => !customNames.has(name.toLowerCase())).map((name) => ({
    name,
    operationModes: builtinOperationModes(name),
    isCustom: false,
  }));
  const customs = custom.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    operationModes: c.operation_modes,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findCategoryInCatalog(
  name: string,
  catalog: VehicleCategoryMeta[]
): VehicleCategoryMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((c) => c.name.toLowerCase() === q);
}

export function defaultModeForCategory(
  category: string,
  catalog: VehicleCategoryMeta[]
): OperationMode {
  const meta = findCategoryInCatalog(category, catalog);
  if (meta?.operationModes === "hour") return "hour";
  if (meta?.operationModes === "both") return "km";
  return defaultOperationMode(category);
}

export function canChooseOperationModeForCategory(
  category: string,
  catalog: VehicleCategoryMeta[]
): boolean {
  if (!category.trim()) return true;
  if (category === VEHICLE_CATEGORY_OTHER) return true;
  const meta = findCategoryInCatalog(category, catalog);
  return meta?.operationModes === "both";
}

export function usesHourlyForCategory(
  category: string,
  operationMode: OperationMode,
  catalog: VehicleCategoryMeta[]
): boolean {
  const meta = findCategoryInCatalog(category, catalog);
  if (meta) {
    if (meta.operationModes === "hour") return true;
    if (meta.operationModes === "km") return false;
    if (meta.operationModes === "both") return operationMode === "hour";
  }
  return usesHourlyOperation(category, operationMode);
}

export function isReservedBuiltinCategoryName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return VEHICLE_CATEGORIES.some((c) => c.toLowerCase() === q && c !== VEHICLE_CATEGORY_OTHER);
}
