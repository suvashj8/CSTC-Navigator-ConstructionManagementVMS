import type { FuelLog } from "@/types/domain";

export type FuelInsight = {
  deltaKm?: number;
  kmPerL?: number;
  flags: string[];
};

function parseFuelTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Compute Δ km and km/L between consecutive fills per vehicle (chronological). */
export function buildFuelInsights(logs: FuelLog[]): Map<string, FuelInsight> {
  const byVehicle = new Map<string, FuelLog[]>();
  for (const f of logs) {
    const vid = (f.asset_id ?? "").trim() || "_none";
    if (!byVehicle.has(vid)) byVehicle.set(vid, []);
    byVehicle.get(vid)!.push(f);
  }

  const meta = new Map<string, FuelInsight>();

  for (const [, group] of byVehicle) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => parseFuelTime(a.fueled_at) - parseFuelTime(b.fueled_at));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      const o1 = prev.odometer_km;
      const o2 = cur.odometer_km;
      const lit = cur.liters;
      const flags: string[] = [];

      let deltaKm: number | undefined;
      let kmPerL: number | undefined;

      if (o2 == null || lit == null || !Number.isFinite(o2) || !Number.isFinite(lit)) {
        flags.push("missing odometer or liters");
      } else if (o1 == null) {
        flags.push("no prior odometer");
      } else {
        deltaKm = o2 - o1;
        if (deltaKm <= 0) flags.push("odometer did not increase");
        else if (lit > 0) {
          kmPerL = deltaKm / lit;
          if (kmPerL < 3) flags.push("very low km/L");
          if (kmPerL > 25) flags.push("very high km/L");
        }
      }

      meta.set(cur.id, { deltaKm, kmPerL, flags });
    }
  }

  return meta;
}
