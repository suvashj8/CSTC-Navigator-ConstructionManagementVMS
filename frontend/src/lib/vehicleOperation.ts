/** KM route vs hourly (dozer / equipment) operation — Suvash VMS pattern. */

export type OperationMode = "km" | "hour";

export function defaultOperationMode(vehicleCategory: string): OperationMode {
  if (vehicleCategory === "Dozer") return "hour";
  return "km";
}

/** Dozer always hourly; Other can toggle; rest use route + KM. */
export function usesHourlyOperation(vehicleCategory: string, operationMode: OperationMode): boolean {
  if (vehicleCategory === "Dozer") return true;
  if (vehicleCategory === "Other") return operationMode === "hour";
  return false;
}

export function canChooseOperationMode(vehicleCategory: string): boolean {
  return vehicleCategory === "Other";
}
