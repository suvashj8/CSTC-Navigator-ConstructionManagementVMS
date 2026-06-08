import { cn } from "@/lib/utils";
import { TableScroll } from "./table-scroll";

/**
 * Card list on mobile layout (< 7 inch); data table on desktop layout (7 inch+).
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
      {mobile && <div className="desktop:hidden">{mobile}</div>}
      <div className={cn("min-w-0 w-full", mobile ? "hidden desktop:block" : "block")}>
        <TableScroll scrollMinClass={scrollMinClass}>{desktop}</TableScroll>
      </div>
    </div>
  );
}
