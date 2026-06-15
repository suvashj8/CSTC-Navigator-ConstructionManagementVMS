import * as React from "react";
import { cn } from "@/lib/utils";

const Table = ({ className, ref, ...props }: React.ComponentProps<"table">) => (
  <table
    ref={ref}
    className={cn(
      "w-full caption-bottom text-sm",
      "[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_td.wrap]:whitespace-normal",
      className
    )}
    {...props}
  />
);

const TableHeader = ({ className, ref, ...props }: React.ComponentProps<"thead">) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />;

const TableBody = ({ className, ref, ...props }: React.ComponentProps<"tbody">) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />;

const TableRow = ({ className, ref, ...props }: React.ComponentProps<"tr">) => (
  <tr
    ref={ref}
    className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
    {...props}
  />
);

const TableHead = ({ className, ref, ...props }: React.ComponentProps<"th">) => (
  <th
    ref={ref}
    className={cn(
      "h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground",
      className
    )}
    {...props}
  />
);

const TableCell = ({ className, ref, ...props }: React.ComponentProps<"td">) => (
  <td ref={ref} className={cn("p-4 align-middle", className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
