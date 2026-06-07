import type { SupplierCategory } from "@/types/domain";

/** Suppliers eligible as maintenance / work-order vendors */
export const MAINTENANCE_SUPPLIER_CATEGORIES: SupplierCategory[] = ["repair", "parts", "other"];

/** Suppliers eligible for fuel log entries */
export const FUEL_SUPPLIER_CATEGORIES: SupplierCategory[] = ["fuel", "other"];

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  repair: "Repair shop",
  parts: "Parts vendor",
  fuel: "Fuel depot",
  rental: "Rental partner",
  other: "Other",
};
