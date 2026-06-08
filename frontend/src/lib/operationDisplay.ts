import type { Asset } from "@/types/domain";
import { usesHourlyOperationForAsset } from "@/lib/assetOperation";
import type { OperationMode } from "@/lib/vehicleOperation";

function isHourlyAsset(asset: Asset): boolean {
  return usesHourlyOperationForAsset(
    asset.asset_type,
    asset.vehicle_category ?? "",
    (asset.operation_mode as OperationMode) ?? "km"
  );
}

export function formatOperationSummary(asset: Asset): string {
  if (isHourlyAsset(asset)) {
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
  return isHourlyAsset(asset) ? "Hourly" : "Route + KM";
}
