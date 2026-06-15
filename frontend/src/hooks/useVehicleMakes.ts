import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { listVehicleMakes } from "@/api/vehicleMakes";
import { findMakeInCatalog, mergeVehicleMakes, type VehicleMakeMeta } from "@/lib/vehicleMakeCatalog";

export function useVehicleMakes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["vehicle-makes"],
    queryFn: listVehicleMakes,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const catalog = useMemo(() => mergeVehicleMakes(custom), [custom]);
  const names = useMemo(() => catalog.map((m) => m.name), [catalog]);

  const findMake = useCallback(
    (name: string): VehicleMakeMeta | undefined => findMakeInCatalog(name, catalog),
    [catalog]
  );

  return { catalog, names, findMake, isLoading, custom };
}
