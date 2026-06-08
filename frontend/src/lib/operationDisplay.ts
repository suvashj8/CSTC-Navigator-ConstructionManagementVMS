import type { Asset } from "@/types/domain";
import { usesHourlyOperationForAsset } from "@/lib/assetOperation";
import { PLACE_HR_LABEL, ROUTE_KM_LABEL } from "@/lib/operationModeCatalog";
import type { OperationMode } from "@/lib/vehicleOperation";

function isHourlyAsset(asset: Asset): boolean {
  return usesHourlyOperationForAsset(
    asset.asset_type,
    asset.vehicle_category ?? "",
    (asset.operation_mode as OperationMode) ?? "km"
  );
}

function formatCustomFields(asset: Asset): string | null {
  const fields = asset.operation_custom_fields;
  if (!fields || typeof fields !== "object") return null;
  const entries = Object.entries(fields).filter(([, v]) => String(v ?? "").trim());
  if (!entries.length) return null;
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

export function formatOperationSummary(asset: Asset): string {
  const custom = formatCustomFields(asset);
  if (custom) return custom;

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
  if (asset.operation_mode_label?.trim()) return asset.operation_mode_label.trim();
  return isHourlyAsset(asset) ? PLACE_HR_LABEL : ROUTE_KM_LABEL;
}
