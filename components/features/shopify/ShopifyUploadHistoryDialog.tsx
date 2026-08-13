"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import {
  useGetShopifyUploadHistoryByDocumentIdQuery,
  useGetShopifyUploadHistoryQuery,
  type ShopifyUploadHistoryRecord,
  type ShopifyUploadProductResult,
} from "@/lib/api/shopifyApi";
import {
  historyRecordToDisplay,
  productResultToDisplay,
  summarizeHistoryList,
  summarizeProductList,
  statusHint,
  statusLabel,
} from "@/lib/shopify-upload-display";
import {
  ShopifyProductFriendlyCard,
  ShopifyStatusPill,
} from "@/components/features/shopify/ShopifyStatusPill";
import { Skeleton } from "@/components/ui/skeleton";

export type ShopifyUploadHistoryDialogProps = {
  open: boolean;
  onClose: () => void;
  /**
   * My Document table / details: GET /shopify/upload-history/document/:documentId
   */
  documentId?: string | null;
  /**
   * ai-result (and similar): filter general history by generated-image ids.
   * Ignored when `documentId` is set.
   */
  generatedImageIds?: string[];
  /**
   * Fresh results from POST /shopify/upload-multiple-csv
   */
  immediateResults?: ShopifyUploadProductResult[];
  heading?: string;
};

function filterHistoryRows(
  rows: ShopifyUploadHistoryRecord[],
  ids: string[],
): ShopifyUploadHistoryRecord[] {
  if (!ids.length) return rows;
  const set = new Set(ids.map((id) => id.trim()).filter(Boolean));
  return rows.filter((r) => {
    if (r.generatedImageId && set.has(String(r.generatedImageId))) return true;
    if (r.id && set.has(String(r.id))) return true;
    return false;
  });
}

/**
 * Human-friendly Shopify upload history / result dialog.
 */
export function ShopifyUploadHistoryDialog({
  open,
  onClose,
  documentId = null,
  generatedImageIds = [],
  immediateResults,
  heading = "Shopify upload status",
}: ShopifyUploadHistoryDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const docId = documentId?.trim() || "";
  const useByDocument = Boolean(docId);

  const ids = useMemo(
    () => [...new Set(generatedImageIds.map((id) => id.trim()).filter(Boolean))],
    [generatedImageIds],
  );

  const queryArgs = useMemo(
    () => ({
      page: 1,
      limit: 50,
      ...(ids.length === 1 ? { generatedImageId: ids[0] } : {}),
    }),
    [ids],
  );

  const byDoc = useGetShopifyUploadHistoryByDocumentIdQuery(docId, {
    skip: !open || !useByDocument,
    refetchOnMountOrArgChange: true,
  });

  const byList = useGetShopifyUploadHistoryQuery(queryArgs, {
    skip: !open || useByDocument,
    refetchOnMountOrArgChange: true,
  });

  const active = useByDocument ? byDoc : byList;

  /**
   * Prefer `currentData` so a previous document/query never flashes while
   * the new request is in flight (same pattern as Shopify uploads detail).
   */
  const currentPayload = active.currentData;
  const isLoading = active.isLoading;
  const isFetching = active.isFetching;
  const isUninitialized = active.isUninitialized;
  const error = active.error;

  const allRows = currentPayload?.data ?? [];

  const filtered = useMemo(() => {
    if (useByDocument) return allRows;
    return ids.length ? filterHistoryRows(allRows, ids) : allRows;
  }, [useByDocument, allRows, ids]);

  const hasImmediate = Boolean(immediateResults && immediateResults.length > 0);

  const historyLoading =
    !hasImmediate &&
    open &&
    (isUninitialized ||
      isLoading ||
      (isFetching && !currentPayload) ||
      (!currentPayload && !error));

  const overallFromImmediate = hasImmediate
    ? summarizeProductList(immediateResults!)
    : "none";
  const overallFromHistory = summarizeHistoryList(filtered);
  const overall = hasImmediate
    ? overallFromImmediate
    : historyLoading
      ? "none"
      : overallFromHistory;

  if (!open || !mounted) return null;

  const scopedLabel =
    useByDocument || ids.length
      ? "History for this product"
      : "Recent uploads";

  const panel = (
    <div
      className="pointer-events-auto fixed inset-0 z-[200] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="presentation"
      data-shopify-history-dialog="">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopify-history-dialog-title"
        className="pointer-events-auto flex max-h-[min(92dvh,880px)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border bg-white shadow-lg animate-in fade-in-0 zoom-in-95 duration-200 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <h2
              id="shopify-history-dialog-title"
              className="text-base font-bold text-slate-900">
              {heading}
            </h2>
            {historyLoading ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading upload status…
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500">{statusHint(overall)}</p>
                {overall !== "none" ? (
                  <ShopifyStatusPill status={overall} size="sm" />
                ) : null}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          data-lenis-prevent
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}>
          {hasImmediate ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Latest upload result
              </h3>
              {immediateResults!.map((p, i) => (
                <ShopifyProductFriendlyCard
                  key={`imm-${i}`}
                  product={productResultToDisplay(p)}
                />
              ))}
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {scopedLabel}
            </h3>

            {historyLoading ? (
              <div className="space-y-3" aria-busy="true" aria-live="polite">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-[#A825C7]" />
                  Loading history…
                </div>
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-600">
                Could not load upload history. Try again in a moment.
              </p>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {useByDocument || ids.length
                    ? "No Shopify upload history for this item yet."
                    : "No uploads yet."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Use <span className="font-medium">Upload Shopify</span> to send
                  the product CSV, then check here for Success or Failed.
                </p>
              </div>
            ) : (
              filtered.map((row) => {
                const d = historyRecordToDisplay(row);
                return (
                  <ShopifyProductFriendlyCard
                    key={row.id}
                    product={d.product}
                    when={d.when}
                  />
                );
              })
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#A825C7] py-2.5 text-sm font-semibold text-white hover:bg-purple-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

export function listDocShopifyStatus(
  isShopifyUploaded?: boolean,
): "success" | "none" {
  return isShopifyUploaded ? "success" : "none";
}

export { statusLabel };
