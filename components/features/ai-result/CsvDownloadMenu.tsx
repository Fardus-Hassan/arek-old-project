"use client";

import * as React from "react";
import {
  Archive,
  ChevronDown,
  Download,
  FileDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TabCsvEntry } from "@/lib/download-product-csv";
import {
  downloadTabCsvEntriesAsZip,
  downloadTabCsvEntriesSeparately,
  downloadTabCsvEntry,
} from "@/lib/download-product-csv";

type CsvDownloadMenuProps = {
  entries: TabCsvEntry[];
  activeTabIndex: number;
  className?: string;
  /** outline matches client mockup action row */
  variant?: "primary" | "outline";
};

function entryLabel(entry: TabCsvEntry): string {
  const title =
    entry.product.title && entry.product.title !== "—"
      ? entry.product.title
      : `Image ${entry.index + 1}`;
  return title.length > 42 ? `${title.slice(0, 42)}…` : title;
}

export function CsvDownloadMenu({
  entries,
  activeTabIndex,
  className,
  variant = "primary",
}: CsvDownloadMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<number>>(() => new Set());
  const [busy, setBusy] = React.useState(false);

  const tabCount = entries.length;
  const activeEntry = entries[activeTabIndex];

  React.useEffect(() => {
    if (open) {
      setSelected(new Set([activeTabIndex]));
    }
  }, [open, activeTabIndex]);

  const selectedEntries = React.useMemo(
    () =>
      entries
        .filter((e) => selected.has(e.index))
        .sort((a, b) => a.index - b.index),
    [entries, selected],
  );

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(entries.map((e) => e.index)));
  const clearAll = () => setSelected(new Set());

  const runDownload = async (
    items: TabCsvEntry[],
    mode: "single" | "zip" | "separate",
  ) => {
    if (items.length === 0) {
      toast.error("Select at least one image to download.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "single" || items.length === 1) {
        downloadTabCsvEntry(items[0]!);
        toast.success("CSV downloaded");
      } else if (mode === "zip") {
        await downloadTabCsvEntriesAsZip(items);
        toast.success(`Downloaded ${items.length} files as ZIP`);
      } else {
        await downloadTabCsvEntriesSeparately(items);
        toast.success(`Downloaded ${items.length} CSV files`);
      }
      setOpen(false);
    } catch {
      toast.error("Download failed");
    } finally {
      setBusy(false);
    }
  };

  if (tabCount === 0) return null;

  const isOutline = variant === "outline";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "inline-flex h-10 overflow-hidden rounded-xl border shadow-sm",
          isOutline
            ? "border-slate-200 bg-white"
            : "border-[#A825C7]/30",
          className,
        )}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runDownload(activeEntry ? [activeEntry] : [], "single")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 px-3 text-sm font-semibold transition-colors disabled:opacity-60",
            isOutline
              ? "bg-white text-slate-800 hover:bg-slate-50"
              : "bg-[#A825C7] text-white hover:bg-purple-600",
          )}>
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Download className="h-4 w-4 shrink-0" />
          )}
          Download
        </button>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={busy}
            aria-label="More download options"
            className={cn(
              "flex h-full w-9 shrink-0 items-center justify-center border-l transition-colors disabled:opacity-60",
              isOutline
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-purple-500/40 bg-[#A825C7] text-white hover:bg-purple-600",
            )}>
            <ChevronDown className="h-4 w-4" />
          </button>
        </PopoverTrigger>
      </div>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Export CSV</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Download one image or multiple at once
          </p>
        </div>

        <div className="space-y-1 border-b border-slate-100 p-2">
          <button
            type="button"
            disabled={busy || !activeEntry}
            onClick={() =>
              void runDownload(activeEntry ? [activeEntry] : [], "single")
            }
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-50">
            <FileDown className="h-4 w-4 shrink-0 text-[#A825C7]" />
            <span>
              Current image{" "}
              <span className="text-slate-500">(Image {activeTabIndex + 1})</span>
            </span>
          </button>
          {tabCount > 1 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runDownload(entries, "zip")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-slate-50 disabled:opacity-50">
              <Archive className="h-4 w-4 shrink-0 text-[#A825C7]" />
              <span>
                All images{" "}
                <span className="text-slate-500">
                  ({tabCount} files as ZIP)
                </span>
              </span>
            </button>
          )}
        </div>

        {tabCount > 1 && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-medium text-slate-700">
                Select images
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-medium text-[#A825C7] hover:underline">
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-slate-500 hover:underline">
                  Clear
                </button>
              </div>
            </div>

            <div
              data-lenis-prevent
              className="max-h-44 overflow-y-auto overscroll-contain px-2 pb-2"
              onWheel={(e) => e.stopPropagation()}>
              {entries.map((entry) => {
                const checked = selected.has(entry.index);
                return (
                  <label
                    key={entry.index}
                    className={cn(
                      "mb-1 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50",
                      checked && "bg-purple-50/60",
                    )}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry.index)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[#A825C7] focus:ring-[#A825C7]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-slate-800">
                        Image {entry.index + 1}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {entryLabel(entry)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 p-3">
              <Button
                type="button"
                size="sm"
                disabled={busy || selectedEntries.length === 0}
                className="h-9 w-full bg-[#A825C7] text-xs hover:bg-purple-600"
                onClick={() =>
                  void runDownload(
                    selectedEntries,
                    selectedEntries.length === 1 ? "single" : "zip",
                  )
                }>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                    Download {selectedEntries.length || 0} as ZIP
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || selectedEntries.length < 2}
                className="h-9 w-full text-xs"
                onClick={() =>
                  void runDownload(selectedEntries, "separate")
                }>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download separately
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
