import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { listAssets } from "@/api/assets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAssetTypes } from "@/hooks/useAssetTypes";
import { assetTypeDisplayLabel, isBuiltinAssetTypeKey } from "@/lib/assetTypeCatalog";
import type { Asset } from "@/types/domain";
import type { WorkLocation } from "@/types/domain";
import { cn } from "@/lib/utils";

export type AssetPickerChangeMeta = {
  fromLocation?: string;
};

type ShowBy = {
  workLocation: boolean;
  vehicles: boolean;
  tools: boolean;
  equipment: boolean;
  others: boolean;
};

type AssetCategory = "vehicle" | "tool" | "equipment" | "other";

type Props = {
  value: string[];
  onChange: (ids: string[], meta?: AssetPickerChangeMeta) => void;
  locations?: WorkLocation[];
  label?: string;
  className?: string;
};

const TYPE_KEYS = ["vehicles", "tools", "equipment", "others"] as const;
const TYPE_LABELS: Record<(typeof TYPE_KEYS)[number], string> = {
  vehicles: "Vehicles",
  tools: "Tools",
  equipment: "Equipment",
  others: "Others",
};

const CATEGORY_ORDER: Record<AssetCategory, number> = {
  vehicle: 0,
  equipment: 1,
  tool: 2,
  other: 3,
};

function assetCategory(assetType: string): AssetCategory {
  if (assetType === "vehicle") return "vehicle";
  if (assetType === "tool") return "tool";
  if (assetType === "equipment") return "equipment";
  return "other";
}

function matchesTypeFilter(cat: AssetCategory, showBy: ShowBy): boolean {
  if (cat === "vehicle" && showBy.vehicles) return true;
  if (cat === "tool" && showBy.tools) return true;
  if (cat === "equipment" && showBy.equipment) return true;
  if (cat === "other" && showBy.others) return true;
  return false;
}

function rowLabel(a: Asset, typeCatalog: ReturnType<typeof useAssetTypes>["catalog"]) {
  const typeName = assetTypeDisplayLabel(a.asset_type, typeCatalog);
  const detail = a.make?.trim() ? `${a.make} ${a.model}`.trim() : "";
  return {
    primary: a.reg_serial_no,
    secondary: detail || (assetCategory(a.asset_type) === "other" ? typeName : detail),
    typeName,
  };
}

const DEFAULT_SHOW: ShowBy = {
  workLocation: false,
  vehicles: false,
  tools: false,
  equipment: false,
  others: false,
};

export function MultiAssetPicker({ value, onChange, locations = [], label = "Assets", className }: Props) {
  const { catalog: typeCatalog } = useAssetTypes();
  const [showBy, setShowBy] = useState<ShowBy>(DEFAULT_SHOW);
  const [locationFilterId, setLocationFilterId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["assets-multi-picker"],
    queryFn: () => listAssets({ per_page: 200, page: 1, operational_only: true }),
    staleTime: 60_000,
  });

  const assets = data?.rows ?? [];
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const anyShowBy =
    showBy.workLocation || showBy.vehicles || showBy.tools || showBy.equipment || showBy.others;

  const anyTypeFilter = showBy.vehicles || showBy.tools || showBy.equipment || showBy.others;

  const filteredAssets = useMemo(() => {
    if (!anyShowBy) return [];
    let list = assets;

    if (showBy.workLocation && locationFilterId) {
      list = list.filter((a) => a.location_id === locationFilterId);
    }

    if (anyTypeFilter) {
      list = list.filter((a) => matchesTypeFilter(assetCategory(a.asset_type), showBy));
    }

    const multiTypes =
      [showBy.vehicles, showBy.tools, showBy.equipment, showBy.others].filter(Boolean).length > 1;

    return list.sort((a, b) => {
      if (multiTypes) {
        const catA = assetCategory(a.asset_type);
        const catB = assetCategory(b.asset_type);
        if (catA !== catB) return CATEGORY_ORDER[catA] - CATEGORY_ORDER[catB];
      }
      return a.reg_serial_no.localeCompare(b.reg_serial_no);
    });
  }, [assets, anyShowBy, anyTypeFilter, showBy, locationFilterId]);

  const typeCounts = useMemo(() => {
    const counts = { vehicle: 0, tool: 0, equipment: 0, other: 0 };
    for (const a of filteredAssets) {
      counts[assetCategory(a.asset_type)] += 1;
    }
    return counts;
  }, [filteredAssets]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (showBy.workLocation) {
      const loc = locations.find((l) => l.id === locationFilterId);
      labels.push(loc ? `At: ${loc.name}` : "Work location");
    }
    for (const key of TYPE_KEYS) {
      if (showBy[key]) labels.push(TYPE_LABELS[key]);
    }
    return labels;
  }, [showBy, locationFilterId, locations]);

  const toggleShow = (key: keyof ShowBy) => {
    setShowBy((s) => ({ ...s, [key]: !s[key] }));
  };

  const selectAllTypes = () => {
    setShowBy((s) => ({
      ...s,
      vehicles: true,
      tools: true,
      equipment: true,
      others: true,
    }));
  };

  const toggleAsset = (id: string) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    const asset = byId.get(id);
    onChange(next, { fromLocation: asset?.location_name?.trim() || undefined });
  };

  const selectAllVisible = () => {
    const visibleIds = filteredAssets.map((a) => a.id);
    const merged = [...new Set([...value, ...visibleIds])];
    const last = filteredAssets[filteredAssets.length - 1];
    onChange(merged, { fromLocation: last?.location_name?.trim() || undefined });
  };

  const clearVisible = () => {
    const visible = new Set(filteredAssets.map((a) => a.id));
    onChange(value.filter((id) => !visible.has(id)));
  };

  const needsLocationOnly =
    showBy.workLocation &&
    !locationFilterId &&
    !anyTypeFilter;

  const showTable = anyShowBy && !needsLocationOnly;

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{label}</Label>

      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Show by</p>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllTypes}>
            All asset types
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Select any combination — e.g. Vehicles + Tools + Equipment together in one table.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={showBy.workLocation}
              onChange={() => toggleShow("workLocation")}
            />
            Work location
          </label>
          {TYPE_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={showBy[key]}
                onChange={() => toggleShow(key)}
              />
              {TYPE_LABELS[key]}
            </label>
          ))}
        </div>

        {showBy.workLocation ? (
          <div className="pt-1">
            <Label className="text-xs text-muted-foreground">At work location</Label>
            <Select value={locationFilterId || undefined} onValueChange={setLocationFilterId}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Choose location…" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {activeFilterLabels.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Showing:</span>
          {activeFilterLabels.map((l) => (
            <Badge key={l} variant="outline" className="font-normal">
              {l}
            </Badge>
          ))}
          {showTable && filteredAssets.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              ({filteredAssets.length} in table
              {anyTypeFilter && typeCounts.vehicle > 0 ? ` · ${typeCounts.vehicle} vehicle${typeCounts.vehicle !== 1 ? "s" : ""}` : ""}
              {anyTypeFilter && typeCounts.equipment > 0 ? ` · ${typeCounts.equipment} equipment` : ""}
              {anyTypeFilter && typeCounts.tool > 0 ? ` · ${typeCounts.tool} tool${typeCounts.tool !== 1 ? "s" : ""}` : ""}
              {anyTypeFilter && typeCounts.other > 0 ? ` · ${typeCounts.other} other` : ""}
              )
            </span>
          ) : null}
        </div>
      ) : null}

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const a = byId.get(id);
            const text = a
              ? `${a.reg_serial_no}${a.location_name ? ` · ${a.location_name}` : ""}`
              : id;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
                <span className="max-w-[16rem] truncate">{text}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  aria-label={`Remove ${text}`}
                  onClick={() => onChange(value.filter((x) => x !== id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}

      {!anyShowBy ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Tick one or more options above to browse assets in the table.
        </p>
      ) : needsLocationOnly ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Choose a work location, or also tick Vehicles / Tools / Equipment / Others to browse by type.
        </p>
      ) : (
        <>
          {filteredAssets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select all in table
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearVisible}>
                Clear visible
              </Button>
            </div>
          ) : null}
          <div className="max-h-52 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Reg / serial</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Work location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No assets match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((a) => {
                    const checked = value.includes(a.id);
                    const { primary, secondary, typeName } = rowLabel(a, typeCatalog);
                    const isCustomOther = !isBuiltinAssetTypeKey(a.asset_type);
                    return (
                      <TableRow
                        key={a.id}
                        className={cn("cursor-pointer", checked && "bg-accent/30")}
                        onClick={() => toggleAsset(a.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={checked}
                            onChange={() => toggleAsset(a.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{primary}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {isCustomOther && assetCategory(a.asset_type) === "other"
                            ? secondary || typeName
                            : secondary || "—"}
                        </TableCell>
                        <TableCell>{typeName}</TableCell>
                        <TableCell>{a.location_name ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length} selected — selecting an asset suggests its current site as <strong>From location</strong>. One
        allocation line per asset, grouped as one request.
      </p>
    </div>
  );
}
