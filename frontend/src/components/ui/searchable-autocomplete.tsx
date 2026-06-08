import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  maxSuggestions?: number;
  id?: string;
  required?: boolean;
  /** Show chevron like a select — click to open suggestions. */
  showDropdownIcon?: boolean;
  /** Called when user picks a suggestion (not on free typing). */
  onPick?: (value: string) => void;
  filterFn?: (options: readonly string[], query: string, limit: number) => string[];
  /** When true, focus or chevron shows the full option list until the user edits the text. */
  revealAllOnOpen?: boolean;
};

export function SearchableAutocomplete({
  value,
  onChange,
  options,
  placeholder = "Type to search…",
  disabled = false,
  maxSuggestions = 12,
  id,
  required,
  showDropdownIcon = false,
  onPick,
  filterFn,
  revealAllOnOpen = false,
}: Props) {
  const baseId = useId();
  const listboxId = id ? `${id}-listbox` : `${baseId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [revealAll, setRevealAll] = useState(false);

  const defaultFilter = useCallback(
    (opts: readonly string[], q: string, limit: number) => {
      const query = q.trim().toLowerCase();
      if (!query) return [...opts].slice(0, limit);
      return opts
        .filter((o) => o.toLowerCase().includes(query) || o.toLowerCase().startsWith(query))
        .slice(0, limit);
    },
    []
  );

  const filter = filterFn ?? defaultFilter;
  const filterQuery = revealAllOnOpen && revealAll ? "" : value;
  const suggestions = useMemo(
    () => filter(options, filterQuery, maxSuggestions),
    [filter, options, filterQuery, maxSuggestions]
  );

  useEffect(() => {
    setHighlight(0);
  }, [value, filterQuery, suggestions.length]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, close]);

  const showPanel = open && suggestions.length > 0;

  const pick = (name: string) => {
    onChange(name);
    onPick?.(name);
    close();
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
          if (revealAllOnOpen) setRevealAll(true);
          setOpen(true);
        }}
        onKeyDown={(e) => {
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
            if (revealAllOnOpen) setRevealAll(true);
            setOpen((o) => !o);
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
          className="absolute z-[100] mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
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
