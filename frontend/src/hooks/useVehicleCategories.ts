import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { listVehicleCategories } from "@/api/vehicleCategories";
import {
  findCategoryInCatalog,
  mergeVehicleCategories,
  type VehicleCategoryMeta,
} from "@/lib/vehicleCategory";

export function useVehicleCategories(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["vehicle-categories"],
    queryFn: listVehicleCategories,
    enabled,
    staleTime: 60_000,
  });

  const catalog = useMemo(() => mergeVehicleCategories(custom), [custom]);
  const names = useMemo(() => catalog.map((c) => c.name), [catalog]);

  const findCategory = useCallback(
    (name: string): VehicleCategoryMeta | undefined => findCategoryInCatalog(name, catalog),
    [catalog]
  );

  return { catalog, names, findCategory, isLoading, custom };
}
