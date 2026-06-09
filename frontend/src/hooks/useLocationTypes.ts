import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listLocationTypes } from "@/api/locationTypes";
import { mergeLocationTypes } from "@/lib/locationTypeCatalog";

export function useLocationTypes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["location-types"],
    queryFn: listLocationTypes,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeLocationTypes(custom), [custom]);
  return { catalog, isLoading, custom };
}
