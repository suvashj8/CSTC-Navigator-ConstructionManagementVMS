export const MAINTENANCE_STATUS_OTHER = "Other";

export const BUILTIN_MAINTENANCE_STATUSES = ["Scheduled", "In progress", "Completed"] as const;
export type BuiltinMaintenanceStatus = (typeof BUILTIN_MAINTENANCE_STATUSES)[number];

export type MaintenanceStatusMeta = {
  id?: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomMaintenanceStatus = {
  id: string;
  name: string;
  description: string;
};

export function mergeMaintenanceStatuses(custom: CustomMaintenanceStatus[]): MaintenanceStatusMeta[] {
  const customNames = new Set(custom.map((s) => s.name.toLowerCase()));
  const builtins = BUILTIN_MAINTENANCE_STATUSES.filter((name) => !customNames.has(name.toLowerCase())).map(
    (name) => ({ name, isCustom: false })
  );
  const customs = custom.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    isCustom: true,
  }));
  const merged = [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
  return [...merged, { name: MAINTENANCE_STATUS_OTHER, isCustom: false }];
}

export function findMaintenanceStatus(name: string, catalog: MaintenanceStatusMeta[]): MaintenanceStatusMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((s) => s.name.toLowerCase() === q);
}

export function isReservedBuiltinMaintenanceStatus(name: string): boolean {
  const q = name.trim().toLowerCase();
  return BUILTIN_MAINTENANCE_STATUSES.some((s) => s.toLowerCase() === q);
}

export function filterMaintenanceStatusOptions(options: readonly string[], query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options].slice(0, limit);
  const matched = options.filter((o) => o.toLowerCase().includes(q));
  const withOther = matched.includes(MAINTENANCE_STATUS_OTHER) ? matched : [...matched, MAINTENANCE_STATUS_OTHER];
  return withOther.slice(0, limit);
}
