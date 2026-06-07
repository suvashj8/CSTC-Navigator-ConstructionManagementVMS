import { cn } from "@/lib/utils";

const DEFAULT_MIN = "min-w-[42rem]";

/**
 * Single horizontal scroll container for wide tables.
 * Inner min-width forces overflow; table cells use nowrap so columns don't collapse.
 */
export function TableScroll({
  children,
  className,
  scrollMinClass = DEFAULT_MIN,
}: {
  children: React.ReactNode;
  className?: string;
  scrollMinClass?: string;
}) {
  return (
    <div className={cn("table-scroll w-full max-w-full min-w-0", className)}>
      <div className={cn("w-full", scrollMinClass)}>{children}</div>
    </div>
  );
}
