import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { listAssetTypes } from "@/api/assetTypes";
import {
  findAssetTypeByKey,
  findAssetTypeInCatalog,
  mergeAssetTypes,
  type AssetTypeMeta,
} from "@/lib/assetTypeCatalog";

export function useAssetTypes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["asset-types"],
    queryFn: listAssetTypes,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const catalog = useMemo(() => mergeAssetTypes(custom), [custom]);
  const names = useMemo(() => catalog.map((t) => t.name), [catalog]);

  const findByKey = useCallback(
    (key: string): AssetTypeMeta | undefined => findAssetTypeByKey(key, catalog),
    [catalog]
  );

  const findByName = useCallback(
    (name: string): AssetTypeMeta | undefined => findAssetTypeInCatalog(name, catalog),
    [catalog]
  );

  return { catalog, names, findByKey, findByName, isLoading, custom };
}
