import type { Asset } from "@/types/domain";
import { usesHourlyOperation } from "@/lib/vehicleOperation";

export function formatOperationSummary(asset: Asset): string {
  if (asset.asset_type !== "vehicle") return "—";
  const category = asset.vehicle_category ?? "";
  const mode = asset.operation_mode ?? "km";
  const hourly = usesHourlyOperation(category, mode);

  if (hourly) {
    const place = asset.operation_place?.trim();
    const h = asset.operation_hours ?? 0;
    const m = asset.operation_minutes ?? 0;
    if (!place && !h && !m) return "Not recorded";
    const parts = [place, h || m ? `${h}h ${m}m` : ""].filter(Boolean);
    return parts.join(" · ");
  }

  const from = asset.route_from?.trim();
  const to = asset.route_to?.trim();
  const km = asset.operation_km;
  if (!from && !to && km == null) return "Not recorded";
  const route = from && to ? `${from} → ${to}` : from || to || "";
  const dist = km != null ? `${km} KM` : "";
  return [route, dist].filter(Boolean).join(" · ");
}

export function operationModeLabel(asset: Asset): string {
  if (asset.asset_type !== "vehicle") return "—";
  const hourly = usesHourlyOperation(asset.vehicle_category ?? "", asset.operation_mode ?? "km");
  return hourly ? "Hourly" : "Route + KM";
}
