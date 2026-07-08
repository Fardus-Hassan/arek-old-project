"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

export type SearchableMultiSelectProps = {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Allow typing a custom value and pressing Enter to add it. */
  allowCustom?: boolean;
};

function foldForMatch(s: string): string {
  return s.trim().toLowerCase();
}

function optionMatches(a: string, b: string): boolean {
  return foldForMatch(a) === foldForMatch(b);
}

function isSelected(values: string[], option: string): boolean {
  return values.some((v) => optionMatches(v, option));
}

export function SearchableMultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Select options…",
  className,
  disabled = false,
  allowCustom = true,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((opt) => foldForMatch(opt).includes(q));
  }, [options, query]);

  const addValue = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || disabled) return;

      const known = options.find((opt) => optionMatches(opt, trimmed));
      const next = known ?? trimmed;
      if (isSelected(values, next)) {
        setQuery("");
        return;
      }
      onValuesChange([...values, next]);
      setQuery("");
      inputRef.current?.focus();
    },
    [disabled, onValuesChange, options, values],
  );

  const toggle = (option: string) => {
    if (disabled) return;
    if (isSelected(values, option)) {
      onValuesChange(values.filter((v) => !optionMatches(v, option)));
      return;
    }
    onValuesChange([...values, option]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeAt = (index: number) => {
    if (disabled) return;
    onValuesChange(values.filter((_, i) => i !== index));
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const q = query.trim();
  const showCustomRow =
    allowCustom &&
    q.length > 0 &&
    !options.some((opt) => optionMatches(opt, q)) &&
    !isSelected(values, q);

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setQuery("");
      }}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "relative flex min-h-10 w-full items-center gap-1 rounded-lg border border-gray-200 bg-white pl-2.5 pr-8 py-1.5 transition-colors",
            open && "ring-2 ring-purple-500 border-transparent",
            disabled && "opacity-60 cursor-not-allowed bg-gray-50",
            !disabled && "hover:border-gray-300 cursor-text",
            className,
          )}
          onClick={openList}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {values.map((v, i) => (
              <span
                key={`${v}-${i}`}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-900 border border-purple-100">
                <span className="truncate">{v}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="shrink-0 rounded text-purple-400 hover:text-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(i);
                    }}
                    aria-label={`Remove ${v}`}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={query}
              disabled={disabled}
              placeholder={values.length === 0 ? placeholder : "Search or type…"}
              className="min-w-[6rem] flex-1 border-0 bg-transparent p-0 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-0 disabled:cursor-not-allowed"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={openList}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (showCustomRow) {
                    addValue(q);
                    return;
                  }
                  if (filtered.length === 1) {
                    toggle(filtered[0]);
                    return;
                  }
                  if (allowCustom && q) {
                    addValue(q);
                  }
                }
                if (e.key === "Backspace" && !query && values.length > 0) {
                  e.preventDefault();
                  removeAt(values.length - 1);
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                  inputRef.current?.blur();
                }
              }}
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
            />
          </div>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:pointer-events-none"
            onMouseDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              if (open) {
                setOpen(false);
                setQuery("");
              } else {
                openList();
              }
            }}
            aria-label="Toggle options">
            <ChevronDown
              className={cn(
                "size-4 opacity-60 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        ref={contentRef}
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}>
        <div
          data-lenis-prevent
          className="max-h-56 overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}>
          {showCustomRow && (
            <button
              type="button"
              className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addValue(q)}>
              Add &quot;{q}&quot;{" "}
              <span className="text-gray-400">(Enter)</span>
            </button>
          )}
          {filtered.length === 0 && !showCustomRow ? (
            <p className="px-2 py-2 text-xs text-gray-500">No matching options</p>
          ) : (
            <ul className="flex flex-col gap-0.5" role="listbox">
              {filtered.map((item) => {
                const selected = isSelected(values, item);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs sm:text-sm hover:bg-gray-100",
                        selected && "bg-purple-50 text-purple-900",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => toggle(item)}
                      role="option"
                      aria-selected={selected}>
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-[#A825C7] bg-[#A825C7] text-white"
                            : "border-gray-300 bg-white",
                        )}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
