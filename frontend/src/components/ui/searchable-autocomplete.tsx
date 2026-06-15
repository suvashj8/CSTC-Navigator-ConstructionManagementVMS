import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { dismissOtherOverlays, useOverlayDismissListener } from "@/components/ui/overlay-portal-context";

/** Marker for dialog outside-click guards (legacy portaled lists). */
export const VMS_AUTOCOMPLETE_LIST_ATTR = "data-vms-autocomplete-list";

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  maxSuggestions?: number;
  id?: string;
  required?: boolean;
  showDropdownIcon?: boolean;
  onPick?: (value: string) => void;
  filterFn?: (options: readonly string[], query: string, limit: number) => string[];
  revealAllOnOpen?: boolean;
  openOnFocus?: boolean;
};

export function SearchableAutocomplete({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  disabled = false,
  maxSuggestions = 20,
  id,
  required,
  showDropdownIcon = false,
  onPick,
  filterFn,
  revealAllOnOpen = false,
  openOnFocus = true,
}: Props) {
  const baseId = useId();
  const overlaySourceId = useId();
  const listboxId = id ? `${id}-listbox` : `${baseId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [revealAll, setRevealAll] = useState(false);
  const [openUp, setOpenUp] = useState(false);

  const defaultFilter = useCallback((opts: readonly string[], q: string, limit: number) => {
    const query = q.trim().toLowerCase();
    if (!query) return [...opts].slice(0, limit);
    return opts.filter((o) => o.toLowerCase().includes(query)).slice(0, limit);
  }, []);

  const filter = filterFn ?? defaultFilter;
  const filterQuery = revealAllOnOpen && revealAll ? "" : value;
  const suggestions = useMemo(
    () => filter(options, filterQuery, maxSuggestions),
    [filter, options, filterQuery, maxSuggestions]
  );

  const updateOpenDirection = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUp(spaceBelow < 200 && spaceAbove > spaceBelow);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, filterQuery, suggestions.length]);

  useEffect(() => {
    if (!open) return;
    updateOpenDirection();
    const onScrollOrResize = () => updateOpenDirection();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, suggestions.length, updateOpenDirection]);

  const close = useCallback(() => {
    setOpen(false);
    setRevealAll(false);
  }, []);

  useOverlayDismissListener(overlaySourceId, close);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  const showPanel = open && suggestions.length > 0;

  const pick = (name: string) => {
    onChange(name);
    onPick?.(name);
    close();
  };

  const openList = () => {
    dismissOtherOverlays(overlaySourceId);
    if (revealAllOnOpen) setRevealAll(true);
    updateOpenDirection();
    setOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        required={required}
        placeholder={placeholder}
        className={showDropdownIcon ? "pr-9" : undefined}
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listboxId : undefined}
        onChange={(e) => {
          setRevealAll(false);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (openOnFocus) openList();
        }}
        onKeyDown={(e) => {
          if (!showPanel && (e.key === "ArrowDown" || e.key === "Enter")) {
            openList();
            return;
          }
          if (!showPanel) return;
          if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
            return;
          }
          if (e.key === "Enter" && suggestions[highlight]) {
            e.preventDefault();
            pick(suggestions[highlight]);
          }
        }}
      />
      {showDropdownIcon ? (
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Show options"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) close();
            else openList();
            inputRef.current?.focus();
          }}
        >
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      ) : null}
      {showPanel ? (
        <ul
          id={listboxId}
          role="listbox"
          {...{ [VMS_AUTOCOMPLETE_LIST_ATTR]: "" }}
          className={cn(
            "absolute left-0 right-0 z-[300] max-h-56 overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-lg",
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {suggestions.map((name, idx) => (
            <li
              key={name}
              role="option"
              aria-selected={idx === highlight}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                idx === highlight && "bg-accent text-accent-foreground"
              )}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(name);
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
