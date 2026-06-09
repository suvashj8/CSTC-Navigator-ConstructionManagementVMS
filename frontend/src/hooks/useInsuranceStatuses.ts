import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listInsuranceStatuses } from "@/api/insuranceStatuses";
import { mergeInsuranceStatuses } from "@/lib/insuranceStatusCatalog";

export function useInsuranceStatuses(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["insurance-statuses"],
    queryFn: listInsuranceStatuses,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeInsuranceStatuses(custom), [custom]);
  return { catalog, isLoading, custom };
}
