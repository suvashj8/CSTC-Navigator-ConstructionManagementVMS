import type { BuiltinSupplierCategory, SupplierCategory } from "@/types/domain";

/** Suppliers eligible as maintenance / work-order vendors */
export const MAINTENANCE_SUPPLIER_CATEGORIES: SupplierCategory[] = ["repair", "parts", "other"];

/** Suppliers eligible for fuel log entries */
export const FUEL_SUPPLIER_CATEGORIES: SupplierCategory[] = ["fuel", "other"];

export const SUPPLIER_CATEGORY_LABELS: Record<BuiltinSupplierCategory, string> = {
  repair: "Repair shop",
  parts: "Parts vendor",
  fuel: "Fuel depot",
  rental: "Rental partner",
  other: "Other",
};

const BUILTIN_KEYS = new Set<string>(["repair", "parts", "fuel", "rental", "other"]);

export function supplierCategoryLabel(category: SupplierCategory, catalog?: { key: string; name: string }[]): string {
  const fromCatalog = catalog?.find((c) => c.key === category);
  if (fromCatalog) return fromCatalog.name;
  return SUPPLIER_CATEGORY_LABELS[category as BuiltinSupplierCategory] ?? category;
}

export function isBuiltinSupplierCategory(category: string): category is BuiltinSupplierCategory {
  return BUILTIN_KEYS.has(category);
}
