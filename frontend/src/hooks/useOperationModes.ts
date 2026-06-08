import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { listOperationModes } from "@/api/operationModes";
import {
  findOperationModeInCatalog,
  mergeOperationModes,
  type OperationModeMeta,
} from "@/lib/operationModeCatalog";

export function useOperationModes(enabled = true) {
  const { data: custom = [], isLoading } = useQuery({
    queryKey: ["operation-modes"],
    queryFn: listOperationModes,
    enabled,
    staleTime: 60_000,
  });

  const catalog = useMemo(() => mergeOperationModes(custom), [custom]);
  const names = useMemo(() => catalog.map((m) => m.name), [catalog]);

  const findMode = useCallback(
    (name: string): OperationModeMeta | undefined => findOperationModeInCatalog(name, catalog),
    [catalog]
  );

  return { catalog, names, findMode, isLoading, custom };
}
