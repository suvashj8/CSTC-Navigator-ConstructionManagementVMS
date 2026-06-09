export const LOCATION_TYPE_OTHER = "Custom Location";

export const BUILTIN_LOCATION_TYPE_KEYS = ["construction", "workshop", "yard", "office"] as const;
export type BuiltinLocationTypeKey = (typeof BUILTIN_LOCATION_TYPE_KEYS)[number];

const BUILTIN_LABELS: Record<BuiltinLocationTypeKey, string> = {
  construction: "Construction site",
  workshop: "Workshop",
  yard: "Yard / depot",
  office: "Office",
};

export type LocationTypeMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomLocationType = {
  id: string;
  name: string;
  description: string;
};

export function mergeLocationTypes(custom: CustomLocationType[]): LocationTypeMeta[] {
  const customNames = new Set(custom.map((t) => t.name.toLowerCase()));
  const builtins = BUILTIN_LOCATION_TYPE_KEYS.filter(
    (key) => !customNames.has(BUILTIN_LABELS[key].toLowerCase())
  ).map((key) => ({ key, name: BUILTIN_LABELS[key], isCustom: false }));
  const customs = custom.map((t) => ({
    id: t.id,
    key: t.name,
    name: t.name,
    description: t.description,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findLocationTypeByKey(key: string, catalog: LocationTypeMeta[]): LocationTypeMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((t) => t.key.toLowerCase() === q);
}

export function locationTypeDisplayLabel(key: string, catalog: LocationTypeMeta[] = []): string {
  return findLocationTypeByKey(key, catalog)?.name ?? BUILTIN_LABELS[key as BuiltinLocationTypeKey] ?? key.replace(/_/g, " ");
}

export function isReservedBuiltinLocationTypeName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.values(BUILTIN_LABELS).some((label) => label.toLowerCase() === q);
}

export function isBuiltinLocationTypeKey(key: string): boolean {
  return BUILTIN_LOCATION_TYPE_KEYS.includes(key.toLowerCase() as BuiltinLocationTypeKey);
}
