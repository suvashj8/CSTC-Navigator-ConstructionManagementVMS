import { cn } from "@/lib/utils";
import { TableScroll } from "./table-scroll";

/**
 * Card list on small phones; scrollable data table from md (768px) upward.
 */
export function ResponsiveTable({
  desktop,
  mobile,
  className,
  scrollMinClass,
}: {
  desktop: React.ReactNode;
  mobile?: React.ReactNode;
  className?: string;
  scrollMinClass?: string;
}) {
  return (
    <div className={cn("min-w-0 w-full", className)}>
      {mobile && <div className="md:hidden">{mobile}</div>}
      <div className={cn("min-w-0 w-full", mobile ? "hidden md:block" : "block")}>
        <TableScroll scrollMinClass={scrollMinClass}>{desktop}</TableScroll>
      </div>
    </div>
  );
}
