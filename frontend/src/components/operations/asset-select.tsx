import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAssets } from "@/api/assets";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetTypes } from "@/hooks/useAssetTypes";
import { assetTypeDisplayLabel } from "@/lib/assetTypeCatalog";

type AssetSelectProps = {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
};

function assetLabel(
  reg: string,
  make: string,
  model: string,
  assetType: string,
  typeCatalog: ReturnType<typeof useAssetTypes>["catalog"]
): string {
  const typeName = assetTypeDisplayLabel(assetType, typeCatalog);
  const detail = make?.trim() ? `${make} ${model}`.trim() : "";
  return detail ? `${reg} — ${detail} (${typeName})` : `${reg} (${typeName})`;
}

export function AssetSelect({ value, onChange, label = "Asset", required, className }: AssetSelectProps) {
  const { catalog: typeCatalog } = useAssetTypes();
  const { data, isLoading } = useQuery({
    queryKey: ["assets-picker-all"],
    queryFn: () => listAssets({ per_page: 200, page: 1, operational_only: true }),
    staleTime: 60_000,
  });

  const assets = data?.rows ?? [];

  const items = useMemo(
    () =>
      [...assets]
        .map((a) => ({
          key: a.id,
          name: assetLabel(a.reg_serial_no, a.make, a.model, a.asset_type, typeCatalog),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assets, typeCatalog]
  );

  if (isLoading) {
    return (
      <div className={className ?? "space-y-2"}>
        <Label>{label}</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <CatalogSelect
      className={className}
      label={label}
      value={value}
      items={items}
      placeholder={items.length ? "Select asset…" : "No assets available"}
      hideHint
      onChange={onChange}
    />
  );
}
