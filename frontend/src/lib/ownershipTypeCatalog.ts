export const OWNERSHIP_TYPE_OTHER = "Other";

export const BUILTIN_OWNERSHIP_KEYS = ["owned", "leased", "rented"] as const;
export type BuiltinOwnershipKey = (typeof BUILTIN_OWNERSHIP_KEYS)[number];

const BUILTIN_LABELS: Record<BuiltinOwnershipKey, string> = {
  owned: "Owned",
  leased: "Leased",
  rented: "Rented",
};

export type OwnershipTypeMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomOwnershipType = {
  id: string;
  name: string;
  description: string;
};

export function mergeOwnershipTypes(custom: CustomOwnershipType[]): OwnershipTypeMeta[] {
  const customNames = new Set(custom.map((t) => t.name.toLowerCase()));
  const builtins = BUILTIN_OWNERSHIP_KEYS.filter(
    (key) => !customNames.has(BUILTIN_LABELS[key].toLowerCase())
  ).map((key) => ({ key, name: BUILTIN_LABELS[key], isCustom: false }));
  const customs = custom.map((t) => ({
    id: t.id,
    key: t.name,
    name: t.name,
    description: t.description,
    isCustom: true,
  }));
  const merged = [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
  return [...merged, { key: OWNERSHIP_TYPE_OTHER, name: OWNERSHIP_TYPE_OTHER, isCustom: false }];
}

export function findOwnershipByKey(key: string, catalog: OwnershipTypeMeta[]): OwnershipTypeMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((t) => t.key.toLowerCase() === q);
}

export function findOwnershipInCatalog(name: string, catalog: OwnershipTypeMeta[]): OwnershipTypeMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((t) => t.name.toLowerCase() === q);
}

export function isReservedBuiltinOwnershipName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.values(BUILTIN_LABELS).some((label) => label.toLowerCase() === q);
}

export function ownershipDisplayLabel(key: string, catalog: OwnershipTypeMeta[] = []): string {
  return findOwnershipByKey(key, catalog)?.name ?? BUILTIN_LABELS[key as BuiltinOwnershipKey] ?? key;
}

export function filterOwnershipOptions(options: readonly string[], query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options].slice(0, limit);
  const matched = options.filter((o) => o.toLowerCase().includes(q));
  const withOther = matched.includes(OWNERSHIP_TYPE_OTHER) ? matched : [...matched, OWNERSHIP_TYPE_OTHER];
  return withOther.slice(0, limit);
}
