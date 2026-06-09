export const ASSET_TYPE_OTHER = "Other";

export const BUILTIN_ASSET_TYPE_KEYS = ["vehicle", "equipment", "tool"] as const;
export type BuiltinAssetTypeKey = (typeof BUILTIN_ASSET_TYPE_KEYS)[number];

const BUILTIN_LABELS: Record<BuiltinAssetTypeKey, string> = {
  vehicle: "Vehicle",
  equipment: "Equipment",
  tool: "Tool",
};

export type AssetTypeMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomAssetType = {
  id: string;
  name: string;
  description: string;
};

export function isBuiltinAssetTypeKey(key: string): key is BuiltinAssetTypeKey {
  return (BUILTIN_ASSET_TYPE_KEYS as readonly string[]).includes(key);
}

export function isVehicleAssetType(key: string): boolean {
  return key === "vehicle";
}

export function mergeAssetTypes(custom: CustomAssetType[]): AssetTypeMeta[] {
  const customNames = new Set(custom.map((t) => t.name.toLowerCase()));
  const builtins: AssetTypeMeta[] = BUILTIN_ASSET_TYPE_KEYS.filter(
    (key) => !customNames.has(BUILTIN_LABELS[key].toLowerCase())
  ).map((key) => ({
    key,
    name: BUILTIN_LABELS[key],
    isCustom: false,
  }));
  const customs = custom.map((t) => ({
    id: t.id,
    key: t.name,
    name: t.name,
    description: t.description,
    isCustom: true,
  }));
  const merged = [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
  return [...merged, { key: ASSET_TYPE_OTHER, name: ASSET_TYPE_OTHER, isCustom: false }];
}

export function findAssetTypeByKey(key: string, catalog: AssetTypeMeta[]): AssetTypeMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((t) => t.key.toLowerCase() === q);
}

export function findAssetTypeInCatalog(name: string, catalog: AssetTypeMeta[]): AssetTypeMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((t) => t.name.toLowerCase() === q);
}

export function isReservedBuiltinAssetTypeName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.values(BUILTIN_LABELS).some((label) => label.toLowerCase() === q && label !== ASSET_TYPE_OTHER);
}

export function assetTypeDisplayLabel(key: string, catalog: AssetTypeMeta[] = []): string {
  const meta = findAssetTypeByKey(key, catalog);
  if (meta) return meta.name;
  if (isBuiltinAssetTypeKey(key)) return BUILTIN_LABELS[key];
  return key;
}

export function filterAssetTypeOptions(options: readonly string[], query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  const other = ASSET_TYPE_OTHER;
  if (!q) return [...options].slice(0, limit);
  const matched = options.filter((o) => o.toLowerCase().includes(q));
  const withOther = matched.includes(other) ? matched : [...matched, other];
  return withOther.slice(0, limit);
}
