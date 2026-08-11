"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, ExternalLink, Loader2 } from "lucide-react";
import {
  useGetShopifyUploadHistoryByIdQuery,
  useGetShopifyUploadHistoryQuery,
  type ShopifyUploadHistoryRecord,
} from "@/lib/api/shopifyApi";
import { historyRecordToDisplay } from "@/lib/shopify-upload-display";
import {
  ShopifyProductFriendlyCard,
  ShopifyStatusPill,
} from "@/components/features/shopify/ShopifyStatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import CustomPagination from "@/components/shared/CustomPagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSidebar } from "@/components/ui/sidebar";

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

export default function ShopifyUploadHistoryPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  const { data, isLoading, isFetching, error } = useGetShopifyUploadHistoryQuery(
    {
      page,
      limit,
    },
  );

  const detailQ = useGetShopifyUploadHistoryByIdQuery(selectedId ?? "", {
    skip: !selectedId,
    // Do not show previous row’s payload while new id loads
    refetchOnMountOrArgChange: true,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPage = meta?.totalPage ?? meta?.totalPages ?? 1;
  const total = meta?.total ?? rows.length;

  /** Only use detail when it matches the open row (avoids stale previous modal). */
  const matchedDetail =
    selectedId && detailQ.data?.data?.id === selectedId
      ? detailQ.data.data
      : null;
  const listRow = selectedId
    ? (rows.find((r) => r.id === selectedId) ?? null)
    : null;
  const detailLoading = Boolean(
    selectedId &&
      (detailQ.isLoading || detailQ.isFetching || detailQ.isUninitialized) &&
      !matchedDetail,
  );

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
            Shopify upload history
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            See which products were sent to Shopify and open a row for details.
          </p>
        </div>
        <Link
          href="/dashboard/admin/documents"
          className="text-sm font-medium text-[#A825C7] hover:underline">
          ← My Document
        </Link>
      </div>

      {/* Desktop table — same shell as My Document / Saved Files */}
      <div
        className={`${isSidebarOpen ? "hidden lg:block" : "hidden md:block"} overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm`}>
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[800px]">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="border-b-0 hover:bg-[#eff1f4]">
                <TableHead className="min-w-[160px] whitespace-nowrap px-4 py-3 font-medium text-gray-600">
                  Date & Time
                </TableHead>
                <TableHead className="min-w-[200px] whitespace-nowrap px-4 py-3 font-medium text-gray-600">
                  Product
                </TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap px-4 py-3 text-center font-medium text-gray-600">
                  Status
                </TableHead>
                <TableHead className="min-w-[120px] whitespace-nowrap px-4 py-3 font-medium text-gray-600">
                  Shopify
                </TableHead>
                <TableHead className="min-w-[100px] whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`shopify-hist-skel-${i}`}>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Skeleton className="mx-auto h-5 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                rows.map((row) => {
                  const ok = row.success !== false;
                  return (
                    <TableRow
                      key={row.id}
                      className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                        {formatWhen(row.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[280px] px-4 py-3">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {row.title || row.handle || "Untitled product"}
                        </p>
                        {row.errorMessage && !ok ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-rose-600">
                            {row.errorMessage}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <ShopifyStatusPill
                          status={ok ? "success" : "failed"}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {row.adminUrl ? (
                          <a
                            href={String(row.adminUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#A825C7] hover:underline">
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                          onClick={() => setSelectedId(row.id)}
                          aria-label="View upload details">
                          <Eye className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-gray-500">
                    {error
                      ? "Could not load upload history."
                      : "No upload history yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {isFetching && !isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t border-gray-100 py-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </div>
        ) : null}
      </div>

      {/* Mobile cards */}
      <div
        className={`${isSidebarOpen ? "md:block lg:hidden" : "md:hidden"} space-y-4`}>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`m-skel-${i}`}
              className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        {!isLoading &&
          rows.map((row) => {
            const ok = row.success !== false;
            return (
              <div
                key={row.id}
                className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Date & Time</span>
                  <span className="text-sm font-medium text-gray-700">
                    {formatWhen(row.createdAt)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-500">Product</span>
                  <span className="max-w-[60%] text-right text-sm font-medium text-gray-800">
                    {row.title || row.handle || "Untitled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <ShopifyStatusPill
                    status={ok ? "success" : "failed"}
                    size="sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full text-sm"
                  onClick={() => setSelectedId(row.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </Button>
              </div>
            );
          })}
        {!isLoading && rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {error ? "Could not load upload history." : "No upload history yet."}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <CustomPagination
          currentPage={page}
          totalPages={Math.max(1, totalPage)}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
          onItemsPerPageChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      </div>

      {selectedId ? (
        <HistoryDetailPanel
          id={selectedId}
          listRow={listRow}
          record={matchedDetail}
          loading={detailLoading}
          error={Boolean(detailQ.error) && !matchedDetail}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

function HistoryDetailPanel({
  id,
  listRow,
  record,
  loading,
  error,
  onClose,
}: {
  id: string;
  listRow: ShopifyUploadHistoryRecord | null;
  record: ShopifyUploadHistoryRecord | null;
  loading: boolean;
  error: boolean;
  onClose: () => void;
}) {
  /**
   * Prefer matched API detail only. During load show skeleton —
   * optional lightweight list row header only (title), not previous full card.
   */
  const fullDisplay = useMemo(() => {
    return record ? historyRecordToDisplay(record) : null;
  }, [record]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[min(94dvh,900px)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              Upload details
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {listRow?.title || listRow?.handle || "Loading…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Close
          </button>
        </div>

        <div
          data-lenis-prevent
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          onWheel={(e) => e.stopPropagation()}>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#A825C7]" />
                Loading details…
              </div>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : null}

          {!loading && error ? (
            <p className="text-sm text-rose-600">
              Could not load full details for this upload.
            </p>
          ) : null}

          {!loading && fullDisplay ? (
            <ShopifyProductFriendlyCard
              product={fullDisplay.product}
              when={fullDisplay.when}
            />
          ) : null}

          {!loading && !fullDisplay && !error ? (
            <p className="text-sm text-slate-500">No details available. ({id})</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
