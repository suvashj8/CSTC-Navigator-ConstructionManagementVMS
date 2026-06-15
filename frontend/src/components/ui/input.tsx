import * as React from "react";
import { cn } from "@/lib/utils";
import {
  blockLeadingMinus,
  preventLeadingMinusKey,
  shouldBlockLeadingMinus,
} from "@/lib/inputSanitize";

const Input = ({
  className,
  type,
  onChange,
  onKeyDown,
  ref,
  ...props
}: React.ComponentProps<"input">) => {
  const sanitize = shouldBlockLeadingMinus(type);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (sanitize) {
      const next = blockLeadingMinus(e.target.value);
      if (next !== e.target.value) {
        e.target.value = next;
      }
    }
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (sanitize && preventLeadingMinusKey(e)) {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
};

export { Input };
