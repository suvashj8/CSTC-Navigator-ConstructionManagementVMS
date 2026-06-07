import { cn } from "@/lib/utils";

type PageShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PageShell({ title, description, actions, children, className }: PageShellProps) {
  return (
    <div className={cn("mx-auto min-w-0 w-full max-w-[1600px] space-y-4 sm:space-y-6", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{title}</h1>
          {description && (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Filter toolbar: stacked on phone, inline on tablet+. */
export function FilterRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        "[&_.space-y-2]:w-full sm:[&_.space-y-2]:w-auto",
        "[&_input]:w-full sm:w-auto [&_[data-slot=select-trigger]]:w-full sm:w-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
