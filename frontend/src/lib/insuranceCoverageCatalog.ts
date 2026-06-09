export const INSURANCE_COVERAGE_OTHER = "Custom";

export const BUILTIN_INSURANCE_COVERAGE_KEYS = ["comprehensive", "third_party", "fire_theft", "liability"] as const;
export type BuiltinInsuranceCoverageKey = (typeof BUILTIN_INSURANCE_COVERAGE_KEYS)[number];

const BUILTIN_LABELS: Record<BuiltinInsuranceCoverageKey, string> = {
  comprehensive: "Comprehensive",
  third_party: "Third party",
  fire_theft: "Fire & theft",
  liability: "Liability",
};

export type InsuranceCoverageMeta = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isCustom?: boolean;
};

export type CustomInsuranceCoverage = {
  id: string;
  name: string;
  description: string;
};

export function mergeInsuranceCoverageTypes(custom: CustomInsuranceCoverage[]): InsuranceCoverageMeta[] {
  const customNames = new Set(custom.map((c) => c.name.toLowerCase()));
  const builtins = BUILTIN_INSURANCE_COVERAGE_KEYS.filter(
    (key) => !customNames.has(BUILTIN_LABELS[key].toLowerCase())
  ).map((key) => ({ key, name: BUILTIN_LABELS[key], isCustom: false }));
  const customs = custom.map((c) => ({
    id: c.id,
    key: c.name,
    name: c.name,
    description: c.description,
    isCustom: true,
  }));
  return [...builtins, ...customs].sort((a, b) => a.name.localeCompare(b.name));
}

export function findInsuranceCoverageByKey(key: string, catalog: InsuranceCoverageMeta[]): InsuranceCoverageMeta | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((c) => c.key.toLowerCase() === q);
}

export function insuranceCoverageDisplayLabel(key: string, catalog: InsuranceCoverageMeta[] = []): string {
  return findInsuranceCoverageByKey(key, catalog)?.name ?? BUILTIN_LABELS[key as BuiltinInsuranceCoverageKey] ?? key.replace(/_/g, " ");
}

export function isReservedBuiltinInsuranceCoverageName(name: string): boolean {
  const q = name.trim().toLowerCase();
  return Object.values(BUILTIN_LABELS).some((label) => label.toLowerCase() === q);
}
