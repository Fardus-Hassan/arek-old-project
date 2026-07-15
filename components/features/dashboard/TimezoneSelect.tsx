"use client";

import * as React from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import {
  useGetAppTimezoneQuery,
  useGetTimeZoneListQuery,
  useUpdateAppTimezoneMutation,
} from "@/lib/api/timeZoneApi";
import { getAccessToken } from "@/lib/auth-session";
import { useIsClient } from "@/lib/hooks";

export function TimezoneSelect({ className }: { className?: string }) {
  const isClient = useIsClient();
  const hasToken = isClient && !!getAccessToken();

  const { data: listRes, isLoading: listLoading } = useGetTimeZoneListQuery(
    undefined,
    { skip: !hasToken },
  );
  const { data: appRes, isLoading: appLoading } = useGetAppTimezoneQuery(
    undefined,
    { skip: !hasToken },
  );
  const [updateTimezone, { isLoading: isUpdating }] =
    useUpdateAppTimezoneMutation();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const options = listRes?.data ?? [];
  const currentValue = appRes?.data?.timezone ?? "";

  const selectedLabel = React.useMemo(() => {
    if (!currentValue) return "";
    const match = options.find((o) => o.value === currentValue);
    return match?.label ?? currentValue;
  }, [currentValue, options]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const busy = listLoading || appLoading || isUpdating;
  const display =
    appLoading && !currentValue
      ? "Loading…"
      : selectedLabel || "Select timezone";

  const commit = async (value: string) => {
    if (!value || value === currentValue || isUpdating) {
      setOpen(false);
      setQuery("");
      return;
    }
    try {
      const res = await updateTimezone({ timezone: value }).unwrap();
      toast.success(res.message || "Timezone updated");
      setOpen(false);
      setQuery("");
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
    }
  };

  if (!hasToken) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
        else window.setTimeout(() => inputRef.current?.focus(), 0);
      }}>
      <PopoverAnchor asChild>
        <button
          type="button"
          disabled={busy && !open}
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 max-w-[11rem] sm:max-w-[16rem] items-center gap-1.5 rounded-lg border border-white/60 bg-white/90 px-2.5 text-left text-xs font-medium text-slate-700 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60",
            className,
          )}
          aria-label="Timezone"
          title={selectedLabel || "Timezone"}>
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-purple-600" />
          ) : null}
          <span className="min-w-0 flex-1 truncate">{display}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverAnchor>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="end"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="border-b border-slate-100 p-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search timezone…"
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-300"
            disabled={isUpdating}
          />
        </div>
        <div
          data-lenis-prevent
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
          onWheel={(e) => e.stopPropagation()}>
          {listLoading ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              Loading timezones…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              No matching timezones
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5" role="listbox">
              {filtered.map((item) => {
                const selected = item.value === currentValue;
                return (
                  <li key={item.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={isUpdating}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-100 disabled:opacity-50",
                        selected && "bg-purple-50 font-semibold text-purple-900",
                      )}
                      onClick={() => void commit(item.value)}>
                      <span className="block truncate">{item.label}</span>
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
