export const INSURANCE_STATUS_OTHER = "Custom";

export const BUILTIN_INSURANCE_STATUS_KEYS = ["active", "expiring", "expired"] as const;
export type BuiltinInsuranceStatusKey = (typeof BUILTIN_INSURANCE_STATUS_KEYS)[number];

const BUILTIN_LABELS: Record<BuiltinInsuranceStatusKey, string> = {
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
};

export type InsuranceStatusMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomInsuranceStatus = {
  id: string;
  name: string;
  description: string;
};

export function mergeInsuranceStatuses(custom: CustomInsuranceStatus[]): InsuranceStatusMeta[] {
  const customNames = new Set(custom.map((s) => s.name.toLowerCase()));
  const builtins = BUILTIN_INSURANCE_STATUS_KEYS.filter(
    (key) => !customNames.has(BUILTIN_LABELS[key].toLowerCase())
  ).map((key) => ({ key, name: BUILTIN_LABELS[key], isCustom: false }));
  const customs = custom.map((s) => ({
    id: s.id,
    key: s.name,
    name: s.name,
    description: s.description,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findInsuranceStatusByKey(key: string, catalog: InsuranceStatusMeta[]): InsuranceStatusMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((s) => s.key.toLowerCase() === q);
}

export function insuranceStatusDisplayLabel(key: string, catalog: InsuranceStatusMeta[] = []): string {
  return findInsuranceStatusByKey(key, catalog)?.name ?? BUILTIN_LABELS[key as BuiltinInsuranceStatusKey] ?? key;
}

export function isReservedBuiltinInsuranceStatusName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.values(BUILTIN_LABELS).some((label) => label.toLowerCase() === q);
}
