import { SUPPLIER_CATEGORY_LABELS } from "@/lib/supplier-categories";

export const SUPPLIER_CATEGORY_OTHER = "Other";

export const BUILTIN_SUPPLIER_CATEGORY_KEYS = ["repair", "parts", "fuel", "rental", "other"] as const;
export type BuiltinSupplierCategoryKey = (typeof BUILTIN_SUPPLIER_CATEGORY_KEYS)[number];

export type SupplierCategoryMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomSupplierCategory = {
  id: string;
  name: string;
  description: string;
};

export function mergeSupplierCategories(custom: CustomSupplierCategory[]): SupplierCategoryMeta[] {
  const customNames = new Set(custom.map((c) => c.name.toLowerCase()));
  const builtins = BUILTIN_SUPPLIER_CATEGORY_KEYS.filter(
    (key) => !customNames.has((SUPPLIER_CATEGORY_LABELS[key] ?? key).toLowerCase())
  ).map((key) => ({
    key,
    name: SUPPLIER_CATEGORY_LABELS[key],
    isCustom: false,
  }));
  const customs = custom.map((c) => ({
    id: c.id,
    key: c.name,
    name: c.name,
    description: c.description,
    isCustom: true,
  }));
  const merged = [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
  return [...merged, { key: SUPPLIER_CATEGORY_OTHER, name: SUPPLIER_CATEGORY_OTHER, isCustom: false }];
}

export function findSupplierCategoryByKey(key: string, catalog: SupplierCategoryMeta[]): SupplierCategoryMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((c) => c.key.toLowerCase() === q);
}

export function findSupplierCategoryInCatalog(name: string, catalog: SupplierCategoryMeta[]): SupplierCategoryMeta | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((c) => c.name.toLowerCase() === q);
}

export function isReservedBuiltinSupplierCategoryName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.entries(SUPPLIER_CATEGORY_LABELS).some(
    ([key, label]) => label.toLowerCase() === q && key !== "other"
  );
}

export function supplierCategoryDisplayLabel(key: string, catalog: SupplierCategoryMeta[] = []): string {
  const meta = findSupplierCategoryByKey(key, catalog);
  if (meta) return meta.name;
  return SUPPLIER_CATEGORY_LABELS[key as BuiltinSupplierCategoryKey] ?? key;
}

export function isBuiltinSupplierCategoryKey(key: string): boolean {
  return (BUILTIN_SUPPLIER_CATEGORY_KEYS as readonly string[]).includes(key);
}

export function filterSupplierCategoryOptions(options: readonly string[], query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options].slice(0, limit);
  const matched = options.filter((o) => o.toLowerCase().includes(q));
  const withOther = matched.includes(SUPPLIER_CATEGORY_OTHER) ? matched : [...matched, SUPPLIER_CATEGORY_OTHER];
  return withOther.slice(0, limit);
}
