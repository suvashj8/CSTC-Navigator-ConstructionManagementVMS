/** KM route vs hourly (dozer / equipment) vs user-defined custom fields. */

export type OperationMode = "km" | "hour" | "custom";

export function defaultOperationMode(vehicleCategory: string): OperationMode {
  if (vehicleCategory === "Dozer") return "hour";
  return "km";
}

/** Dozer is always hourly; any category uses place + Hr/Min when mode is `hour`. */
export function usesHourlyOperation(vehicleCategory: string, operationMode: OperationMode): boolean {
  if (operationMode === "custom") return false;
  if (vehicleCategory === "Dozer") return true;
  return operationMode === "hour";
}

export function canChooseOperationMode(vehicleCategory: string): boolean {
  return vehicleCategory === "Other";
}
