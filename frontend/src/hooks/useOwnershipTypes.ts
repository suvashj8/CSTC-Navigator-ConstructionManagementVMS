import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listOwnershipTypes } from "@/api/ownershipTypes";
import { mergeOwnershipTypes } from "@/lib/ownershipTypeCatalog";

export function useOwnershipTypes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["ownership-types"],
    queryFn: listOwnershipTypes,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeOwnershipTypes(custom), [custom]);
  const names = useMemo(() => catalog.map((t) => t.name), [catalog]);
  return { catalog, names, isLoading, custom };
}
