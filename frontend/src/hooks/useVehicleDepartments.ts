import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { listVehicleDepartments } from "@/api/vehicleDepartments";
import {
  findDepartmentInCatalog,
  mergeVehicleDepartments,
  type VehicleDepartmentMeta,
} from "@/lib/vehicleDepartment";

export function useVehicleDepartments(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["vehicle-departments"],
    queryFn: listVehicleDepartments,
    enabled,
    staleTime: 60_000,
  });

  const catalog = useMemo(() => mergeVehicleDepartments(custom), [custom]);
  const names = useMemo(() => catalog.map((d) => d.name), [catalog]);

  const findDepartment = useCallback(
    (name: string): VehicleDepartmentMeta | undefined => findDepartmentInCatalog(name, catalog),
    [catalog]
  );

  return { catalog, names, findDepartment, isLoading, custom };
}
