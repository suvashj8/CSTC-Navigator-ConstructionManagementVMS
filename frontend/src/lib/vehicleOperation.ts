/** KM route vs hourly (dozer / equipment) operation — Suvash VMS pattern. */

export type OperationMode = "km" | "hour";

export function defaultOperationMode(vehicleCategory: string): OperationMode {
  if (vehicleCategory === "Dozer") return "hour";
  return "km";
}

/** Dozer is always hourly; any category uses place + Hr/Min when mode is `hour`. */
export function usesHourlyOperation(vehicleCategory: string, operationMode: OperationMode): boolean {
  if (vehicleCategory === "Dozer") return true;
  return operationMode === "hour";
}

export function canChooseOperationMode(vehicleCategory: string): boolean {
  return vehicleCategory === "Other";
}
