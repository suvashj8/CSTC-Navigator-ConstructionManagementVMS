import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listSupplierCategories } from "@/api/supplierCategories";
import { mergeSupplierCategories } from "@/lib/supplierCategoryCatalog";

export function useSupplierCategories(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["supplier-categories"],
    queryFn: listSupplierCategories,
    enabled,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const catalog = useMemo(() => mergeSupplierCategories(custom), [custom]);
  const names = useMemo(() => catalog.map((c) => c.name), [catalog]);
  return { catalog, names, isLoading, custom };
}
