import { VEHICLE_DEPARTMENTS } from "@/data/nepalTransportOffices";

export const VEHICLE_DEPARTMENT_OTHER = "Other";

export type VehicleDepartmentMeta = {
  id?: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomVehicleDepartment = {
  id: string;
  name: string;
  description: string;
};

export function mergeVehicleDepartments(custom: CustomVehicleDepartment[]): VehicleDepartmentMeta[] {
  const customNames = new Set(custom.map((d) => d.name.toLowerCase()));
  const builtins = VEHICLE_DEPARTMENTS.filter((name) => !customNames.has(name.toLowerCase())).map((name) => ({
    name,
    isCustom: false,
  }));
  const customs = custom.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findDepartmentInCatalog(
  name: string,
  catalog: VehicleDepartmentMeta[]
): VehicleDepartmentMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((d) => d.name.toLowerCase() === q);
}

export function isReservedBuiltinDepartmentName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return VEHICLE_DEPARTMENTS.some((d) => d.toLowerCase() === q && d !== VEHICLE_DEPARTMENT_OTHER);
}
