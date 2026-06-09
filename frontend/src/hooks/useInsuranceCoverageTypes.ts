import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listInsuranceCoverageTypes } from "@/api/insuranceCoverageTypes";
import { mergeInsuranceCoverageTypes } from "@/lib/insuranceCoverageCatalog";

export function useInsuranceCoverageTypes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["insurance-coverage-types"],
    queryFn: listInsuranceCoverageTypes,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeInsuranceCoverageTypes(custom), [custom]);
  return { catalog, isLoading, custom };
}
