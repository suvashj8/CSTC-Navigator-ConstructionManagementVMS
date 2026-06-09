import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listMaintenanceStatuses } from "@/api/maintenanceStatuses";
import { mergeMaintenanceStatuses } from "@/lib/maintenanceStatusCatalog";

export function useMaintenanceStatuses(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["maintenance-statuses"],
    queryFn: listMaintenanceStatuses,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeMaintenanceStatuses(custom), [custom]);
  const names = useMemo(() => catalog.map((s) => s.name), [catalog]);
  return { catalog, names, isLoading, custom };
}
