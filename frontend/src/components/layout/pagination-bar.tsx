import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PER_PAGE, totalPages } from "@/lib/pagination";

type Props = {
  page: number;
  total: number;
  perPage?: number;
  label?: string;
  onPageChange: (page: number) => void;
};

export function PaginationBar({ page, total, perPage = DEFAULT_PER_PAGE, label = "items", onPageChange }: Props) {
  if (total <= 0) return null;
  const pages = totalPages(total, perPage);

  return (
    <div className="flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-center text-sm text-muted-foreground sm:text-left">
        Page {page} of {pages} ({total} {label})
      </p>
      <div className="flex justify-center gap-1 sm:justify-end">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
