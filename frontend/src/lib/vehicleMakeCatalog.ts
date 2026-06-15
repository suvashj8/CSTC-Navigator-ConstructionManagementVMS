import { VEHICLE_MAKES } from "@/data/vehicleCatalog";

export const VEHICLE_MAKE_OTHER = "Custom Make";

export type VehicleMakeMeta = {
  id?: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomVehicleMake = {
  id: string;
  name: string;
  description: string;
};

export function mergeVehicleMakes(custom: CustomVehicleMake[]): VehicleMakeMeta[] {
  const customNames = new Set(custom.map((m) => m.name.toLowerCase()));
  const builtins = VEHICLE_MAKES.filter((name) => !customNames.has(name.toLowerCase())).map((name) => ({
    name,
    isCustom: false,
  }));
  const customs = custom.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findMakeInCatalog(name: string, catalog: VehicleMakeMeta[]): VehicleMakeMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((m) => m.name.toLowerCase() === q);
}

export function isReservedBuiltinMakeName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return VEHICLE_MAKES.some((m) => m.toLowerCase() === q);
}
