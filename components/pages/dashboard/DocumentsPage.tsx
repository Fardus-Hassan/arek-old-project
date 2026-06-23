"use client";

import CustomPagination from "@/components/shared/CustomPagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
  useLazyGetDocumentByIdQuery,
  useUpdateDocumentMutation,
} from "@/lib/api/documentApi";
import { toast } from "sonner";
import { getRtkQueryErrorMessage } from "@/lib/api/authApi";
import type { SingleDocument } from "@/lib/api/documentApi";
import type { ApiEnvelope } from "@/lib/api/types";
import Image from "next/image";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function splitDotPath(path: string): string[] {
  return path.split(".").filter(Boolean);
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const key of splitDotPath(path)) {
    if (!isPlainObject(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  if (!path) return next;
  const keys = splitDotPath(path);
  let cur: Record<string, unknown> = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const child = cur[k];
    if (!isPlainObject(child)) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]!] = value;
  return next;
}

/** Paths in modal are `imageDetails.*`; draft root is the `imageDetails` object only. */
function draftRelativePath(contextPath: string): string {
  if (contextPath === "imageDetails" || contextPath === "") return "";
  if (contextPath.startsWith("imageDetails.")) {
    return contextPath.slice("imageDetails.".length);
  }
  if (contextPath.startsWith("imageDetails[")) {
    return contextPath.slice("imageDetails".length);
  }
  return contextPath;
}

function isLikelyImageUrl(v: string): boolean {
  const s = v.trim();
  if (!/^https?:\/\//i.test(s)) return false;
  return (
    /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(s) ||
    s.includes("amazonaws.com") ||
    s.includes("/originals/") ||
    s.includes("/bg_removed/") ||
    s.includes("/models/") ||
    s.includes("/mannequins/") ||
    s.includes("/tryons/") ||
    s.includes("/diagrams/")
  );
}

function formatPrimitive(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
      {children}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-900 mb-4">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 items-start">
      <div className="text-[11px] font-medium text-gray-500 break-words">
        {label}
      </div>
      <div className="sm:col-span-2 text-[12px] text-gray-800 break-words">
        {children}
      </div>
    </div>
  );
}

function ImageThumb({ url, alt }: { url: string; alt: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-lg border border-gray-200 overflow-hidden bg-gray-100"
      title="Open in new tab"
    >
      <div className="relative w-full aspect-3/4">
        <Image
          src={url}
          alt={alt}
          fill
          className="object-cover transition-transform group-hover:scale-[1.01]"
          sizes="(max-width: 768px) 45vw, 220px"
          unoptimized={url.includes("amazonaws.com") || url.startsWith("http://")}
        />
      </div>
    </a>
  );
}

type DraftEditProps = {
  editMode?: boolean;
  draft?: Record<string, unknown> | null;
  onDraftPatch?: (path: string, value: unknown) => void;
};

function RenderValue({
  value,
  label,
  depth,
  contextPath,
  editMode = false,
  draft,
  onDraftPatch,
}: {
  value: unknown;
  label: string;
  depth: number;
  contextPath: string;
} & DraftEditProps) {
  const relPath = draftRelativePath(contextPath);
  const canDraft = Boolean(
    editMode &&
      draft &&
      onDraftPatch &&
      !relPath.includes("["),
  );

  if (value == null) {
    if (canDraft && relPath) {
      const cur = getAtPath(draft!, relPath);
      const show =
        cur == null || cur === ""
          ? ""
          : typeof cur === "number" && Number.isFinite(cur)
            ? String(cur)
            : String(cur);
      return (
        <Input
          type="text"
          inputMode="decimal"
          className="h-9 w-full min-w-[160px] max-w-[320px] text-xs"
          value={show}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw.trim() === "") {
              onDraftPatch!(relPath, null);
              return;
            }
            const parsed = Number(raw);
            onDraftPatch!(
              relPath,
              Number.isFinite(parsed) ? parsed : raw,
            );
          }}
        />
      );
    }
    return <span className="text-gray-500">—</span>;
  }

  if (typeof value === "string") {
    if (isLikelyImageUrl(value)) {
      const isImageDetails = contextPath.startsWith("imageDetails.");
      return (
        <div
          className={
            isImageDetails
              ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
              : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
          }
        >
          <div className={isImageDetails ? "sm:col-span-2" : ""}>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-xl border border-gray-200 overflow-hidden bg-gray-100"
              title="Open image in new tab"
            >
              <div className="relative w-full aspect-video sm:aspect-3/2">
                <Image
                  src={value}
                  alt={label}
                  fill
                  className="object-contain bg-white transition-transform group-hover:scale-[1.01]"
                  sizes="(max-width: 768px) 90vw, 900px"
                  unoptimized={value.includes("amazonaws.com") || value.startsWith("http://")}
                />
              </div>
            </a>
          </div>
        </div>
      );
    }
    if (canDraft) {
      const cur = relPath ? getAtPath(draft, relPath) : undefined;
      const str = cur != null && cur !== "" ? String(cur) : value;
      if (value.length <= 120) {
        return (
          <Input
            className="h-9 w-full min-w-[120px] max-w-[320px] text-xs"
            value={str}
            onChange={(e) => onDraftPatch!(relPath, e.target.value)}
          />
        );
      }
      return (
        <textarea
          className="w-full min-h-[120px] min-w-[160px] rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={str}
          onChange={(e) => onDraftPatch!(relPath, e.target.value)}
        />
      );
    }
    if (value.length <= 60) return <Chip>{value}</Chip>;
    return <span className="whitespace-pre-wrap">{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    if (canDraft && typeof value === "number") {
      const cur = relPath ? getAtPath(draft, relPath) : undefined;
      const empty = cur == null || cur === "";
      const displayStr = empty
        ? ""
        : typeof cur === "number" && Number.isFinite(cur)
          ? String(cur)
          : typeof cur === "string"
            ? cur
            : String(value);
      return (
        <Input
          type="text"
          inputMode="decimal"
          className="h-9 w-full min-w-[160px] max-w-[320px] text-xs"
          value={displayStr}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw.trim() === "") {
              onDraftPatch!(relPath, null);
              return;
            }
            const parsed = Number(raw);
            onDraftPatch!(
              relPath,
              Number.isFinite(parsed) ? parsed : raw,
            );
          }}
        />
      );
    }
    if (canDraft && typeof value === "boolean") {
      const cur = relPath ? getAtPath(draft, relPath) : undefined;
      const b = typeof cur === "boolean" ? cur : value;
      return (
        <Select
          value={b ? "true" : "false"}
          onValueChange={(v) => onDraftPatch!(relPath, v === "true")}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    return <Chip>{String(value)}</Chip>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500">—</span>;

    const allPrimitive = value.every(
      (x) =>
        x == null ||
        typeof x === "string" ||
        typeof x === "number" ||
        typeof x === "boolean",
    );

    if (allPrimitive) {
      const strs = value.map((x) => (x == null ? "null" : String(x)));
      const imageUrls = strs.filter((s) => isLikelyImageUrl(s));
      const nonImages = strs.filter((s) => !isLikelyImageUrl(s));
      const isImageDetails = contextPath.startsWith("imageDetails.");
      if (canDraft && nonImages.length > 0 && imageUrls.length === 0) {
        const cur = relPath ? getAtPath(draft, relPath) : undefined;
        const arr = Array.isArray(cur)
          ? cur.map((x) => (x == null ? "" : String(x)))
          : strs;
        const joined = arr.join(", ");
        return (
          <Input
            className="h-9 w-full min-w-[160px] max-w-[320px] text-xs"
            value={joined}
            placeholder="Comma-separated values"
            onChange={(e) => {
              const parts = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              onDraftPatch!(relPath, parts);
            }}
          />
        );
      }
      return (
        <div className="space-y-2">
          {imageUrls.length > 0 && (
            <div
              className={
                isImageDetails
                  ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
                  : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
              }
            >
              {imageUrls.map((u) => (
                <ImageThumb key={u} url={u} alt={label} />
              ))}
            </div>
          )}
          {nonImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nonImages.map((t, i) => (
                <Chip key={`${t}-${i}`}>{t}</Chip>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Array of objects: render each item as a mini-section
    return (
      <div className="space-y-3">
        {value.map((item, idx) => (
          <div
            key={`${label}-${idx}`}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <p className="text-[12px] font-semibold text-gray-800 mb-2">
              {label} #{idx + 1}
            </p>
            <RenderObject
              value={item}
              depth={depth + 1}
              contextPath={`${contextPath}[${idx}]`}
              editMode={editMode}
              draft={draft}
              onDraftPatch={onDraftPatch}
            />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <RenderObject
        value={value}
        depth={depth + 1}
        contextPath={contextPath}
        editMode={editMode}
        draft={draft}
        onDraftPatch={onDraftPatch}
      />
    );
  }

  return <span className="whitespace-pre-wrap">{formatPrimitive(value)}</span>;
}

function RenderObject({
  value,
  depth = 0,
  contextPath = "",
  editMode = false,
  draft,
  onDraftPatch,
}: {
  value: unknown;
  depth?: number;
  contextPath?: string;
} & DraftEditProps) {
  if (!isPlainObject(value))
    return (
      <RenderValue
        value={value}
        label="value"
        depth={depth}
        contextPath={contextPath}
        editMode={editMode}
        draft={draft}
        onDraftPatch={onDraftPatch}
      />
    );
  const entries = Object.entries(value);

  // Compact layout for nested objects to avoid "grid inside grid" alignment issues.
  if (depth > 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {entries.map(([k, v]) => (
            <div key={k} className="px-3 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-start">
                <div className="text-[11px] font-medium text-gray-500 break-words">
                  {k}
                </div>
                <div className="sm:col-span-3 text-[12px] text-gray-800 break-words">
                  <RenderValue
                    value={v}
                    label={k}
                    depth={depth}
                    contextPath={contextPath ? `${contextPath}.${k}` : k}
                    editMode={editMode}
                    draft={draft}
                    onDraftPatch={onDraftPatch}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([k, v]) => (
        <Field key={k} label={k}>
          <RenderValue
            value={v}
            label={k}
            depth={depth}
            contextPath={contextPath ? `${contextPath}.${k}` : k}
            editMode={editMode}
            draft={draft}
            onDraftPatch={onDraftPatch}
          />
        </Field>
      ))}
    </div>
  );
}

const DocumentsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewResponse, setViewResponse] = useState<ApiEnvelope<SingleDocument> | null>(null);
  const [viewError, setViewError] = useState<string>("");
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
  const [detailDraft, setDetailDraft] = useState<Record<string, unknown> | null>(
    null,
  );
  const [detailSnapshot, setDetailSnapshot] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  const { data, isLoading } = useGetDocumentsQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchText || undefined,
  });
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();
  const [getSingleDocument, { isFetching: isViewing }] =
    useLazyGetDocumentByIdQuery();
  const [updateDocument] = useUpdateDocumentMutation();

  const documents = data?.data ?? [];
  const totalItems = data?.meta?.total ?? 0;
  const totalPages =
    data?.meta?.totalPage ??
    data?.meta?.totalPages ??
    Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const onDelete = async (id: string) => {
    try {
      const res = await deleteDocument(id).unwrap();
      toast.success(res.message || "Document deleted successfully");
    } catch (error) {
      toast.error(getRtkQueryErrorMessage(error));
    }
  };

  const onView = async (id: string) => {
    // Requirement: don't open modal until data is ready.
    setIsViewOpen(false);
    setViewResponse(null);
    setViewError("");
    setViewDocumentId(null);
    setDetailDraft(null);
    setDetailSnapshot(null);
    setIsDetailEditing(false);
    const loadingId = toast.loading("Loading document...");
    try {
      const res = await getSingleDocument(id).unwrap();
      setViewResponse(res);
      setIsViewOpen(true);
    } catch (error) {
      const msg = getRtkQueryErrorMessage(error);
      setViewError(msg);
      toast.error(msg);
    } finally {
      toast.dismiss(loadingId);
    }
  };

  const responseForView = useMemo(() => viewResponse ?? null, [viewResponse]);

  useEffect(() => {
    if (!responseForView?.data) {
      setViewDocumentId(null);
      setDetailDraft(null);
      return;
    }
    const d = responseForView.data as unknown as Record<string, unknown>;
    const id = typeof d.id === "string" ? d.id : null;
    setViewDocumentId(id);
    const details = d.imageDetails;
    if (isPlainObject(details)) {
      setDetailDraft(
        JSON.parse(JSON.stringify(details)) as Record<string, unknown>,
      );
    } else {
      setDetailDraft(null);
    }
    setIsDetailEditing(false);
    setDetailSnapshot(null);
  }, [responseForView]);

  const onDraftPatch = React.useCallback((path: string, value: unknown) => {
    setDetailDraft((prev) => {
      if (!prev) return prev;
      return setAtPath(prev, path, value);
    });
  }, []);

  const beginDetailEdit = () => {
    if (!detailDraft) return;
    const next = JSON.parse(
      JSON.stringify(detailDraft),
    ) as Record<string, unknown>;
    if (!("sku" in next)) next.sku = "";
    if (!("price" in next)) next.price = "";
    setDetailDraft(next);
    setDetailSnapshot(JSON.parse(JSON.stringify(next)) as Record<string, unknown>);
    setIsDetailEditing(true);
  };

  const cancelDetailEdit = () => {
    if (detailSnapshot) {
      setDetailDraft(
        JSON.parse(JSON.stringify(detailSnapshot)) as Record<string, unknown>,
      );
    }
    setIsDetailEditing(false);
    setDetailSnapshot(null);
  };

  const saveDetailEdit = async () => {
    if (!viewDocumentId || !detailDraft) {
      toast.error("Nothing to save.");
      return;
    }
    setIsSavingDetail(true);
    try {
      const res = await updateDocument({
        id: viewDocumentId,
        body: { imageDetails: detailDraft },
      }).unwrap();
      toast.success(res.message || "Document updated successfully");
      const refreshed = await getSingleDocument(viewDocumentId).unwrap();
      setViewResponse(refreshed);
      setIsDetailEditing(false);
      setDetailSnapshot(null);
    } catch (e) {
      toast.error(getRtkQueryErrorMessage(e));
    } finally {
      setIsSavingDetail(false);
    }
  };

  // Prevent page scroll while modal is open; scroll stays inside modal.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isViewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isViewOpen]);

  useEffect(() => {
    if (!isViewOpen) return;
    // Make wheel scrolling reliable by focusing the scroll container.
    const t = setTimeout(() => {
      modalScrollRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [isViewOpen]);

  const imageDetailsOnly = useMemo(() => {
    const d = viewResponse?.data as unknown;
    if (!isPlainObject(d)) return null;
    const imageDetails = (d as Record<string, unknown>).imageDetails;
    return imageDetails ?? null;
  }, [viewResponse]);

  const displayImageDetails =
    (detailDraft ?? imageDetailsOnly) as Record<string, unknown> | null;

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          My Document
        </h1>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Sort By */}
          {/* <Select defaultValue="date">
            <SelectTrigger className="w-full sm:w-[160px] bg-white rounded-full border-gray-200">
              <SelectValue placeholder="Sort By Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort By Date</SelectItem>
              <SelectItem value="title">Sort By Title</SelectItem>
              <SelectItem value="type">Sort By Type</SelectItem>
            </SelectContent>
          </Select> */}

          {/* Search */}
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-9 bg-white rounded-full border-gray-200"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Table View - Hidden on mobile, shown on medium when sidebar closed, always shown on large */}
      <div
        className={`${isSidebarOpen ? "hidden lg:block" : "hidden md:block"} bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden`}>
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[800px]">
            <TableHeader className="bg-[#eff1f4]">
              <TableRow className="hover:bg-[#eff1f4] border-b-0">
                <TableHead className="min-w-[180px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Date & Time
                </TableHead>
                <TableHead className="min-w-[140px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Image Title
                </TableHead>
                <TableHead className="min-w-[160px] text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Product Type
                </TableHead>
                <TableHead className="min-w-[100px] text-gray-600 font-medium text-center py-3 px-4 whitespace-nowrap">
                  Model
                </TableHead>
                <TableHead className="min-w-[100px] text-gray-600 font-medium text-center py-3 px-4 whitespace-nowrap">
                  Mannequin
                </TableHead>
                <TableHead className="min-w-[120px] text-right text-gray-600 font-medium py-3 px-4 whitespace-nowrap">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`doc-skeleton-${i}`}>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="py-3 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              )}
              {documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="hover:bg-gray-50 border-gray-100">
                  <TableCell className="font-medium text-gray-700 py-3 px-4 whitespace-nowrap">
                    {doc.dateFormat}
                  </TableCell>
                  <TableCell className="text-gray-700 py-3 px-4 whitespace-nowrap">
                    {doc.product_title ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-gray-700 py-3 px-4 whitespace-nowrap">
                    {doc.product_category ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-center text-gray-700 py-3 px-4 whitespace-nowrap">
                    {doc.isModel ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-center text-gray-700 py-3 px-4 whitespace-nowrap">
                    {doc.isMannequin ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-blue-500 hover:bg-blue-50 shrink-0"
                        onClick={() => onView(doc.id)}>
                        <Eye className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isDeleting}
                        className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50 shrink-0"
                        onClick={() => onDelete(doc.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && documents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Card View - Always shown on mobile, shown on medium when sidebar open, hidden on large */}
      <div
        className={`${isSidebarOpen ? "md:block lg:hidden" : "md:hidden"} space-y-4`}>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`mobile-doc-skeleton-${i}`}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3"
            >
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
            {/* Date & Time */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Date & Time</span>
              <span className="text-sm font-medium text-gray-700">
                {doc.dateFormat}
              </span>
            </div>

            {/* Image Title */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Image Title</span>
              <span className="text-sm font-medium text-gray-700">
                {doc.product_title ?? "N/A"}
              </span>
            </div>

            {/* Product Type */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Product Type</span>
              <span className="text-sm text-gray-700">{doc.product_category ?? "N/A"}</span>
            </div>

            {/* Model & Mannequin */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500">Model:</span>
                <span className="text-sm text-gray-700">{doc.isModel ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500">Mannequin:</span>
                <span className="text-sm text-gray-700">{doc.isMannequin ? "Yes" : "No"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-gray-500 border-gray-300 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-300 rounded-md text-sm"
                onClick={() => onView(doc.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                disabled={isDeleting}
                className="flex-1 h-9 text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700 hover:border-red-300 rounded-md text-sm"
                onClick={() => onDelete(doc.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
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

      <Dialog
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) {
            setViewDocumentId(null);
            setViewResponse(null);
            setViewError("");
            setDetailDraft(null);
            setDetailSnapshot(null);
            setIsDetailEditing(false);
            setIsSavingDetail(false);
          }
        }}>
        <DialogContent className="w-[96vw] max-w-5xl h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="shrink-0 space-y-0 p-4 sm:p-6 pb-3 border-b border-gray-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:pr-10">
              <DialogTitle className="text-base sm:text-lg">
                Document details
              </DialogTitle>
              {!isViewing &&
                imageDetailsOnly &&
                displayImageDetails &&
                viewDocumentId && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isDetailEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={beginDetailEdit}>
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9"
                          disabled={isSavingDetail}
                          onClick={cancelDetailEdit}>
                          <X className="h-4 w-4 mr-1.5" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 bg-[#A825C7] hover:bg-purple-600 text-white"
                          disabled={isSavingDetail}
                          onClick={saveDetailEdit}>
                          {isSavingDetail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
            </div>
          </DialogHeader>

          <div
            ref={modalScrollRef}
            tabIndex={0}
            onWheelCapture={(e) => e.stopPropagation()}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 focus:outline-none"
          >
            {isViewing && (
              <div className="space-y-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}

            {!isViewing && viewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {viewError}
              </div>
            )}

            {!isViewing && responseForView && (
              <div className="space-y-3">
                {imageDetailsOnly && displayImageDetails ? (
                  <Section title="Image Details">
                    <RenderObject
                      value={displayImageDetails}
                      contextPath="imageDetails"
                      editMode={isDetailEditing}
                      draft={detailDraft}
                      onDraftPatch={onDraftPatch}
                    />
                  </Section>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                    No `imageDetails` found for this document.
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
