import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { listSuppliers } from "@/api/suppliers";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectEmpty, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SUPPLIER_CATEGORY_LABELS } from "@/lib/supplier-categories";
import type { Supplier, SupplierCategory } from "@/types/domain";

type SupplierSelectProps = {
  value: string;
  onChange: (id: string) => void;
  categories: SupplierCategory[];
  label?: string;
  className?: string;
};

function filterSuppliers(rows: Supplier[], categories: SupplierCategory[]) {
  const set = new Set(categories);
  return rows.filter((s) => set.has(s.category));
}

export function SupplierSelect({
  value,
  onChange,
  categories,
  label = "Supplier",
  className,
}: SupplierSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["suppliers-picker", categories.join(",")],
    queryFn: () => listSuppliers({ per_page: 100, page: 1 }),
    staleTime: 60_000,
  });

  const suppliers = filterSuppliers(data?.rows ?? [], categories);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-5 items-center justify-between gap-2">
        <Label className="truncate leading-none">{label}</Label>
        <Link
          to="/suppliers"
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Manage
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : suppliers.length === 0 ? (
        <div className="flex h-10 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
          <Link to="/suppliers" className="font-medium text-primary hover:underline">
            Add supplier
          </Link>
        </div>
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.length === 0 ? (
              <SelectEmpty message="No suppliers — add one in Suppliers" />
            ) : (
              suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {`${s.name} (${SUPPLIER_CATEGORY_LABELS[s.category]})`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function SupplierLink({
  supplierId,
  supplierName,
}: {
  supplierId?: string | null;
  supplierName?: string | null;
}) {
  if (!supplierId || !supplierName) return <span>—</span>;
  return (
    <Link
      to="/suppliers"
      className="font-medium text-primary hover:underline"
      title="View in Suppliers"
    >
      {supplierName}
    </Link>
  );
}
