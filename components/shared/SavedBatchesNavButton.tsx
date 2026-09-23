"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Layers,
  Trash2,
  ExternalLink,
  Clock3,
  Package,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  BATCHES_CHANGED_EVENT,
} from "@/lib/generated-document-storage";
import {
  applyPollSnapshotToJob,
  deleteBatchEntry,
  isGenerationJobStorageKey,
  listBatchEntries,
  MAX_GENERATION_JOBS,
  type BatchListItem,
} from "@/lib/generation-jobs-storage";
import {
  DEFAULT_POLL_SECONDS,
  normalizeProductPollData,
  saveActiveProductId,
} from "@/lib/ai-product-helpers";
import { readGenerationLanguage } from "@/lib/feature-catalog";
import { useLazyGetProductByIdQuery } from "@/lib/api/documentApi";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatSavedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown time";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown time";
  }
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function statusLabel(status: BatchListItem["status"]): string {
  if (status === "completed") return "Complete";
  if (status === "failed") return "Failed";
  if (status === "expired") return "Expired";
  return "In progress";
}

function statusClass(status: BatchListItem["status"]): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "expired")
    return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

export function SavedBatchesNavButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [count, setCount] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<BatchListItem | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [fetchProduct] = useLazyGetProductByIdQuery();

  const refreshLocal = useCallback(() => {
    const list = listBatchEntries();
    setBatches(list);
    setCount(list.length);
  }, []);

  /** One-shot status check for jobs that are not locally complete — no interval. */
  const refreshFromApiOnce = useCallback(async () => {
    const list = listBatchEntries();
    const needsFetch = list.filter(
      (b) => b.status === "processing" || !b.hasLocalResult,
    );
    if (needsFetch.length === 0) {
      refreshLocal();
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all(
        needsFetch.map(async (batch) => {
          try {
            const res = await fetchProduct(batch.id).unwrap();
            const normalized = normalizeProductPollData(res.data);
            applyPollSnapshotToJob(batch.id, {
              phase: normalized.phase,
              completedCount: normalized.completedCount,
              totalCount: normalized.totalCount || batch.groupCount,
              document: normalized.document,
              generatedImageIds: normalized.generatedImageIds,
              outputLanguage: readGenerationLanguage(),
            });
          } catch {
            // Keep last local snapshot if API fails
          }
        }),
      );
    } finally {
      setRefreshing(false);
      refreshLocal();
    }
  }, [fetchProduct, refreshLocal]);

  useEffect(() => {
    refreshLocal();
    const onChange = () => refreshLocal();
    const onStorage = (e: StorageEvent) => {
      if (e.key && !isGenerationJobStorageKey(e.key)) return;
      refreshLocal();
    };
    window.addEventListener(BATCHES_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BATCHES_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshLocal]);

  useEffect(() => {
    if (!open) return;
    refreshLocal();
    void refreshFromApiOnce();
  }, [open, refreshLocal, refreshFromApiOnce]);

  const handleOpen = (batch: BatchListItem) => {
    saveActiveProductId(batch.id);
    setOpen(false);
    if (batch.status === "completed" && batch.hasLocalResult) {
      router.push(`/ai-result?productId=${encodeURIComponent(batch.id)}`);
      return;
    }
    const poll = batch.pollSeconds || DEFAULT_POLL_SECONDS;
    router.push(
      `/analyzing?productId=${encodeURIComponent(batch.id)}&poll=${poll}`,
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const ok = deleteBatchEntry(pendingDelete.id);
    setPendingDelete(null);
    if (ok) {
      toast.success("Removed from this browser");
      refreshLocal();
    } else {
      toast.error("Could not delete this batch");
    }
  };

  const inProgressCount = batches.filter((b) => b.status === "processing")
    .length;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700",
              "hover:border-violet-200 hover:bg-violet-50/60 hover:text-violet-700 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2",
            )}
            aria-label="Saved batches">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Saved batches</span>
            {count > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-semibold text-white">
                {count}
              </span>
            ) : null}
            {inProgressCount > 0 ? (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
            ) : null}
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b border-gray-100 px-5 py-5 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-violet-600" />
              Saved batches
            </SheetTitle>
            <SheetDescription className="sr-only">
              Manage in-progress and completed generations saved on this browser.
            </SheetDescription>
            <div className="space-y-2.5 pt-1 text-sm leading-relaxed text-gray-600">
              <p>
                Here you can reopen generations started on{" "}
                <span className="font-medium text-gray-800">this browser</span> —
                both in progress and completed.
              </p>
              <div className="rounded-xl border border-amber-100 bg-amber-50/90 px-3.5 py-3 text-xs leading-relaxed text-amber-950/90">
                <p className="font-semibold text-amber-900">Please keep in mind</p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4">
                  <li>
                    Don&apos;t run too many large batches in parallel — only a
                    limited number (up to {MAX_GENERATION_JOBS}) can stay here
                    safely.
                  </li>
                  <li>
                    After a generation finishes, delete batches you no longer
                    need (exported / uploaded / done). Keeping every result
                    forever is not supported.
                  </li>
                  <li>
                    This list is stored only in{" "}
                    <span className="font-medium">this browser</span>. Another
                    browser, device, or clearing site data / cache will remove
                    it.
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                Status updates when you open this panel or tap Refresh. Continuous
                auto-check happens only on the Analyzing page.
              </p>
            </div>
          </SheetHeader>

          <div className="flex items-center justify-between gap-2 border-b border-gray-50 px-4 py-2">
            <p className="text-xs text-gray-500">
              {refreshing ? "Checking latest status…" : "Latest on open / reload"}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-violet-700"
              disabled={refreshing}
              onClick={() => void refreshFromApiOnce()}>
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          </div>

          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-800">
                  No batches yet
                </p>
                <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-gray-500">
                  Start a generation and it will appear here — even if you leave
                  the page or close the tab. Remember: this is only on this
                  browser, and clear old batches when you&apos;re done.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {batches.map((batch, index) => {
                  const total =
                    batch.totalCount || batch.groupCount || 0;
                  const done =
                    batch.status === "completed"
                      ? total
                      : batch.completedCount;
                  return (
                    <li
                      key={batch.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-violet-200">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {batch.title}
                            </p>
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                statusClass(batch.status),
                              )}>
                              {statusLabel(batch.status)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            {total > 0 ? (
                              <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                                <Package className="h-3.5 w-3.5" />
                                Generated {done} / {total}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {batch.groupCount} groups
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatSavedAt(batch.savedAt)}
                            </span>
                            {batch.language ? (
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 capitalize text-gray-600">
                                {batch.language}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1.5 font-mono text-[11px] text-gray-400">
                            {shortId(batch.id)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 bg-violet-600 hover:bg-violet-700"
                          onClick={() => handleOpen(batch)}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          {batch.status === "completed" && batch.hasLocalResult
                            ? "Open result"
                            : "Open analyzing"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setPendingDelete(batch)}
                          aria-label="Delete batch">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 border-t border-gray-100 px-5 py-3 text-xs leading-relaxed text-gray-500">
            <p>
              Limit: up to {MAX_GENERATION_JOBS} jobs on this browser. Oldest are
              removed automatically when the limit is exceeded.
            </p>
            <p>
              Tip: after complete, clear batches you don&apos;t need so space stays
              free for new work.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this batch from the list?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-gray-600">
                <p>
                  You are about to remove{" "}
                  <span className="font-medium text-gray-900">
                    {pendingDelete?.title}
                  </span>{" "}
                  from <span className="font-medium">this browser only</span>.
                </p>
                <ul className="space-y-1.5 rounded-xl bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-gray-600">
                  <li>
                    • Removed from this browser list (local progress, edits, and
                    Shopify status for this batch)
                  </li>
                  <li>
                    • Server / API generation is{" "}
                    <span className="font-medium">not</span> cancelled or deleted
                  </li>
                  <li>
                    • Clearing unused batches is recommended — this browser
                    cannot keep unlimited completed results
                  </li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}>
              Delete from browser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
