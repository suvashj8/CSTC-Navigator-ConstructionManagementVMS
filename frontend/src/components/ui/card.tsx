import * as React from "react";
import { cn } from "@/lib/utils";

const Card = ({ className, ref, ...props }: React.ComponentProps<"div">) => (
  <div
    ref={ref}
    className={cn("min-w-0 rounded-xl border bg-card text-card-foreground shadow-sm", className)}
    {...props}
  />
);

const CardHeader = ({ className, ref, ...props }: React.ComponentProps<"div">) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

const CardTitle = ({ className, ref, ...props }: React.ComponentProps<"h3">) => (
  <h3 ref={ref} className={cn("text-xl font-semibold leading-none tracking-tight", className)} {...props} />
);

const CardDescription = ({ className, ref, ...props }: React.ComponentProps<"p">) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);

const CardContent = ({ className, ref, ...props }: React.ComponentProps<"div">) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
