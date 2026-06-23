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
import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { useGetMySavedFilesQuery } from "@/lib/api/fileSaveApi";

function isImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(url);
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

export default function SavedFilesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  const { data, isLoading } = useGetMySavedFilesQuery({
    page: currentPage,
    limit: itemsPerPage,
  });

  const files = data?.data ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPage ?? Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const onDownload = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          My Saved Files
        </h1>
      </div>

      {/* Table View */}
      <div
        className={`${isSidebarOpen ? "hidden lg:block" : "hidden md:block"} bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden`}
      >
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[900px]">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="hover:bg-[#eff1f4] border-b-0">
                <TableHead className="min-w-[220px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Saved At
                </TableHead>
                <TableHead className="min-w-[180px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Title
                </TableHead>
                <TableHead className="min-w-[420px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  File
                </TableHead>
                <TableHead className="min-w-[140px] text-right text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`saved-file-skel-${i}`}>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-[360px]" />
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}

              {files.map((f) => (
                <TableRow key={f.id} className="hover:bg-gray-50 border-gray-100">
                  <TableCell className="py-3 px-4 text-gray-700 whitespace-nowrap">
                    {f.savedAt ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-gray-700 whitespace-nowrap">
                    {f.title ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImageUrl(f.fileUrl) ? (
                        <div className="relative h-10 w-10 rounded-md overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                          <Image
                            src={f.fileUrl}
                            alt={f.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center text-[10px] font-semibold text-gray-500">
                          FILE
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          {filenameFromUrl(f.fileUrl)}
                        </p>
                        <a
                          href={f.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-gray-500 hover:text-[#A825C7] inline-flex items-center gap-1 truncate max-w-[520px]"
                          title={f.fileUrl}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="truncate">{f.fileUrl}</span>
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-[#A825C7] hover:bg-purple-50"
                      onClick={() => onDownload(f.fileUrl)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {!isLoading && files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No saved files found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Card View */}
      <div className={`${isSidebarOpen ? "md:block lg:hidden" : "md:hidden"} space-y-4`}>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`saved-file-mobile-skel-${i}`}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3"
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}

        {files.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Saved At</span>
              <span className="text-sm font-medium text-gray-700">{f.savedAt ?? "—"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Title</span>
              <span className="text-sm font-medium text-gray-700">{f.title ?? "—"}</span>
            </div>

            <div className="flex items-center gap-3">
              {isImageUrl(f.fileUrl) ? (
                <div className="relative h-12 w-12 rounded-md overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                  <Image
                    src={f.fileUrl}
                    alt={f.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-md border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center text-[10px] font-semibold text-gray-500">
                  FILE
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{filenameFromUrl(f.fileUrl)}</p>
                <a
                  href={f.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-500 hover:text-[#A825C7] inline-flex items-center gap-1 truncate"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="truncate">{f.fileUrl}</span>
                </a>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-9 text-gray-600 border-gray-200 hover:bg-purple-50 hover:text-[#A825C7] rounded-md text-sm"
              onClick={() => onDownload(f.fileUrl)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        ))}

        {!isLoading && files.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center text-gray-500">
            No saved files found.
          </div>
        )}
      </div>

      <CustomPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

