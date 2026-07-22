"use client";

import CustomPagination from "@/components/shared/CustomPagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSidebar } from "@/components/ui/sidebar";
import { Download, ExternalLink, Loader2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  useGetMySavedFilesQuery,
  type SavedFileItem,
} from "@/lib/api/fileSaveApi";
import { getAccessToken } from "@/lib/auth-session";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import { cn } from "@/lib/utils";

function isImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(url);
}

function isCsvFile(item: SavedFileItem): boolean {
  const name = `${item.title ?? ""} ${item.fileUrl ?? ""}`.toLowerCase();
  return name.includes(".csv");
}

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? url;
  }
}

async function uploadSavedFilesViaProxy(
  items: SavedFileItem[],
): Promise<{ message?: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Please sign in again to upload.");
  }

  const res = await fetch("/api/shopify/upload-from-urls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        url: item.fileUrl,
        filename: filenameFromUrl(item.fileUrl),
      })),
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
  } | null;

  if (!res.ok) {
    throw new Error(
      json?.message || `Upload failed (${res.status})`,
    );
  }

  return { message: json?.message };
}

export default function SavedFilesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  const { data, isLoading } = useGetMySavedFilesQuery({
    page: currentPage,
    limit: itemsPerPage,
  });

  const files = data?.data ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages =
    data?.meta?.totalPage ?? Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const csvFiles = useMemo(() => files.filter(isCsvFile), [files]);
  const selectedCsvFiles = useMemo(
    () => csvFiles.filter((f) => selected.has(f.id)),
    [csvFiles, selected],
  );

  const onDownload = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCsv = () => setSelected(new Set(csvFiles.map((f) => f.id)));
  const clearSelection = () => setSelected(new Set());

  const uploadItems = async (items: SavedFileItem[]) => {
    if (items.length === 0) {
      toast.error("Select at least one CSV file to upload.");
      return;
    }
    setIsUploadingBatch(true);
    try {
      const res = await uploadSavedFilesViaProxy(items);
      toast.success(
        res.message ||
          `Uploaded ${items.length} file${items.length === 1 ? "" : "s"} to Shopify`,
      );
      clearSelection();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : getRtkQueryErrorMessage(err),
      );
    } finally {
      setIsUploadingBatch(false);
    }
  };

  const onUploadOne = async (item: SavedFileItem) => {
    setUploadingId(item.id);
    try {
      await uploadItems([item]);
    } finally {
      setUploadingId(null);
    }
  };

  const busy = isUploadingBatch || uploadingId != null;

  const tableVisibleClass = isSidebarOpen
    ? "hidden lg:block"
    : "hidden md:block";
  const cardsVisibleClass = isSidebarOpen
    ? "block lg:hidden"
    : "block md:hidden";

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="shrink-0 text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
          My Saved Files
        </h1>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {csvFiles.length > 0 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={busy || csvFiles.length === 0}
                onClick={selectAllCsv}>
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={busy || selected.size === 0}
                onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 bg-[#A825C7] text-white hover:bg-purple-600"
            disabled={busy || selectedCsvFiles.length === 0}
            onClick={() => void uploadItems(selectedCsvFiles)}>
            {isUploadingBatch && !uploadingId ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Shopify
            {selectedCsvFiles.length > 0
              ? ` (${selectedCsvFiles.length})`
              : ""}
          </Button>
        </div>
      </div>

      {/* Desktop / tablet table */}
      <div
        className={cn(
          tableVisibleClass,
          "overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm",
        )}>
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-fixed min-w-[720px]">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="border-b-0 hover:bg-[#eff1f4]">
                <TableHead className="w-12 px-3 py-3" />
                <TableHead className="w-[18%] px-3 py-3 text-sm font-medium whitespace-nowrap text-gray-600">
                  Saved At
                </TableHead>
                <TableHead className="w-[16%] px-3 py-3 text-sm font-medium whitespace-nowrap text-gray-600">
                  Title
                </TableHead>
                <TableHead className="w-[40%] px-3 py-3 text-sm font-medium whitespace-nowrap text-gray-600">
                  File
                </TableHead>
                <TableHead className="w-[18%] px-3 py-3 text-right text-sm font-medium whitespace-nowrap text-gray-600">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`saved-file-skel-${i}`}>
                    <TableCell className="px-3 py-3">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-[240px]" />
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Skeleton className="ml-auto h-8 w-28" />
                    </TableCell>
                  </TableRow>
                ))}

              {files.map((f) => {
                const csv = isCsvFile(f);
                const checked = selected.has(f.id);
                return (
                  <TableRow
                    key={f.id}
                    className={cn(
                      "border-gray-100 hover:bg-gray-50",
                      checked && "bg-purple-50/40",
                    )}>
                    <TableCell className="px-3 py-3 align-middle">
                      {csv ? (
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggle(f.id)}
                          className="h-4 w-4 rounded border-slate-300 text-[#A825C7] focus:ring-[#A825C7]"
                          aria-label={`Select ${f.title}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="truncate px-3 py-3 text-sm text-gray-700">
                      {f.savedAt ?? "—"}
                    </TableCell>
                    <TableCell
                      className="truncate px-3 py-3 text-sm text-gray-700"
                      title={f.title ?? undefined}>
                      {f.title ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-0 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {isImageUrl(f.fileUrl) ? (
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                            <Image
                              src={f.fileUrl}
                              alt={f.title}
                              fill
                              className="object-cover"
                              sizes="36px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500">
                            {csv ? "CSV" : "FILE"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm text-gray-800">
                            {filenameFromUrl(f.fileUrl)}
                          </p>
                          <a
                            href={f.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 truncate text-xs text-gray-500 hover:text-[#A825C7]"
                            title={f.fileUrl}>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{f.fileUrl}</span>
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
                        {csv && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 shrink-0 px-2 text-gray-500 hover:bg-purple-50 hover:text-[#A825C7]"
                            disabled={busy}
                            onClick={() => void onUploadOne(f)}>
                            {uploadingId === f.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            <span className="ml-1.5 hidden xl:inline">
                              Upload
                            </span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 px-2 text-gray-500 hover:bg-purple-50 hover:text-[#A825C7]"
                          onClick={() => onDownload(f.fileUrl)}>
                          <Download className="h-4 w-4" />
                          <span className="ml-1.5 hidden xl:inline">
                            Download
                          </span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isLoading && files.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-gray-500">
                    No saved files found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className={cn(cardsVisibleClass, "space-y-3")}>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`saved-file-mobile-skel-${i}`}
              className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}

        {files.map((f) => {
          const csv = isCsvFile(f);
          const checked = selected.has(f.id);
          return (
            <div
              key={f.id}
              className={cn(
                "space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm",
                checked && "border-purple-200 bg-purple-50/30",
              )}>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  {csv && (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggle(f.id)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#A825C7] focus:ring-[#A825C7]"
                    />
                  )}
                  <span className="truncate text-xs text-gray-500">
                    {f.savedAt ?? "—"}
                  </span>
                </div>
                <span
                  className="max-w-[45%] truncate text-sm font-medium text-gray-700"
                  title={f.title ?? undefined}>
                  {f.title ?? "—"}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                {isImageUrl(f.fileUrl) ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                    <Image
                      src={f.fileUrl}
                      alt={f.title}
                      fill
                      className="object-cover"
                      sizes="44px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500">
                    {csv ? "CSV" : "FILE"}
                  </div>
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm text-gray-800">
                    {filenameFromUrl(f.fileUrl)}
                  </p>
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-xs text-gray-500 hover:text-[#A825C7]">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.fileUrl}</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {csv ? (
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-md border-gray-200 text-sm text-gray-600 hover:bg-purple-50 hover:text-[#A825C7]"
                    disabled={busy}
                    onClick={() => void onUploadOne(f)}>
                    {uploadingId === f.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full rounded-md border-gray-200 text-sm text-gray-600 hover:bg-purple-50 hover:text-[#A825C7]",
                    !csv && "col-span-2",
                  )}
                  onClick={() => onDownload(f.fileUrl)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          );
        })}

        {!isLoading && files.length === 0 && (
          <div className="rounded-lg border border-gray-100 bg-white p-6 text-center text-gray-500 shadow-sm">
            No saved files found.
          </div>
        )}
      </div>

      <CustomPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => {
          setCurrentPage(page);
          clearSelection();
        }}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
          clearSelection();
        }}
      />
    </div>
  );
}
