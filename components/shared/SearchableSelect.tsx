"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";

export type SearchableSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  /** When false, only options from the list can be committed. */
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
};

function foldForMatch(s: string): string {
  return s.trim().toLowerCase();
}

function optionMatches(a: string, b: string): boolean {
  return foldForMatch(a) === foldForMatch(b);
}

function buildSuggestions(
  options: readonly string[],
  query: string,
  committedValue: string,
  allowCustom: boolean,
): string[] {
  const q = query.trim();
  const qFold = foldForMatch(q);
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (item: string) => {
    const key = foldForMatch(item);
    if (!item.trim() || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  };

  if (
    committedValue.trim() &&
    !options.some((opt) => optionMatches(opt, committedValue))
  ) {
    if (!q || optionMatches(committedValue, q)) {
      add(committedValue);
    }
  }

  for (const opt of options) {
    if (!q || foldForMatch(opt).includes(qFold)) {
      add(opt);
    }
  }

  if (
    allowCustom &&
    q &&
    !options.some((opt) => optionMatches(opt, q)) &&
    !optionMatches(committedValue, q)
  ) {
    add(q);
  }

  return result;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select or type…",
  allowCustom = true,
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const skipBlurCommitRef = React.useRef(false);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const suggestions = React.useMemo(
    () => buildSuggestions(options, query, value, allowCustom),
    [options, query, value, allowCustom],
  );

  const openList = React.useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  const commitValue = React.useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!trimmed) {
        onValueChange("");
        setQuery("");
        return;
      }

      const known = options.find((opt) => optionMatches(opt, trimmed));
      if (known) {
        onValueChange(known);
        setQuery(known);
        return;
      }

      if (allowCustom) {
        onValueChange(trimmed);
        setQuery(trimmed);
      }
    },
    [allowCustom, onValueChange, options],
  );

  const handleSelect = (item: string) => {
    skipBlurCommitRef.current = true;
    const known = options.find((opt) => optionMatches(opt, item));
    const next = known ?? item;
    onValueChange(next.trim());
    setQuery(next.trim());
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && contentRef.current?.contains(related)) {
      return;
    }

    window.setTimeout(() => {
      if (contentRef.current?.contains(document.activeElement)) {
        return;
      }
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      commitValue(query);
      setOpen(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length === 1) {
        handleSelect(suggestions[0]);
        return;
      }
      commitValue(query);
      setOpen(false);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setQuery(value);
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      openList();
    }
  };

  const showCustomHint =
    allowCustom &&
    query.trim() &&
    !options.some((opt) => optionMatches(opt, query));

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
      }}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            className={cn("pr-9", className)}
            onChange={(e) => {
              setQuery(e.target.value);
              openList();
            }}
            onFocus={openList}
            onClick={openList}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="searchable-select-listbox"
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:pointer-events-none"
            onMouseDown={(e) => {
              e.preventDefault();
              if (disabled) return;
              setOpen((prev) => !prev);
              window.setTimeout(() => inputRef.current?.focus(), 0);
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
        className="p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}>
        <div
          data-lenis-prevent
          className="max-h-56 overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}>
          {suggestions.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-gray-500">
              No matching options
            </p>
          ) : (
            <ul
              id="searchable-select-listbox"
              className="flex flex-col gap-0.5"
              role="listbox">
              {suggestions.map((item) => {
                const isCustomRow =
                  showCustomHint &&
                  optionMatches(item, query) &&
                  !options.some((opt) => optionMatches(opt, item));
                const isCurrentAi =
                  !options.some((opt) => optionMatches(opt, item)) &&
                  optionMatches(item, value);

                return (
                  <li key={`${item}-${isCustomRow ? "custom" : "opt"}`}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-sm px-2 py-1.5 text-left text-xs sm:text-sm hover:bg-gray-100",
                        optionMatches(item, value) &&
                          "bg-purple-50 text-purple-900",
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(item)}
                      role="option"
                      aria-selected={optionMatches(item, value)}>
                      {isCustomRow ? (
                        <span>
                          Use &quot;{item}&quot;{" "}
                          <span className="text-gray-400">(Enter)</span>
                        </span>
                      ) : isCurrentAi ? (
                        <span>
                          {item}{" "}
                          <span className="text-gray-400">(AI)</span>
                        </span>
                      ) : (
                        item
                      )}
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
