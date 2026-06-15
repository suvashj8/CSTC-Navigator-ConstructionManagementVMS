import * as React from "react";
import { cn } from "@/lib/utils";
import { blockLeadingMinus, preventLeadingMinusKey } from "@/lib/inputSanitize";

const Textarea = ({
  className,
  onChange,
  onKeyDown,
  ref,
  ...props
}: React.ComponentProps<"textarea">) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = blockLeadingMinus(e.target.value);
    if (next !== e.target.value) {
      e.target.value = next;
    }
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (preventLeadingMinusKey(e)) {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
};

export { Textarea };
