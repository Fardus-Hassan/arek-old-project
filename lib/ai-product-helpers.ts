import type {
  AiProductRecord,
  SingleDocument,
} from "@/lib/api/documentApi";

const PRODUCT_ID_STORAGE_KEY = "ajpropl_active_product_id_v1";

/** Clamp poll interval (seconds) from URL `?poll=` */
export const DEFAULT_POLL_SECONDS = 120;
export const MIN_POLL_SECONDS = 5;
export const MAX_POLL_SECONDS = 600;

export function clampPollSeconds(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n)) return DEFAULT_POLL_SECONDS;
  return Math.min(
    MAX_POLL_SECONDS,
    Math.max(MIN_POLL_SECONDS, Math.round(n)),
  );
}

export type ProductPollPhase = "processing" | "completed" | "failed" | "expired";

export type ProductPollKind = "document" | "flat" | "job" | "unknown";

export type NormalizedProductPoll = {
  kind: ProductPollKind;
  phase: ProductPollPhase;
  imagesBatch: Record<string, unknown>[];
  generatedImageIds: string[];
  /** Ready SingleDocument when kind === "document" */
  document: SingleDocument | null;
  completedCount: number;
  totalCount: number;
  message?: string;
};

export function parseProductStatus(status: unknown): ProductPollPhase {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (
    s === "completed" ||
    s === "complete" ||
    s === "success" ||
    s === "ready"
  ) {
    return "completed";
  }
  if (
    s === "failed" ||
    s === "fail" ||
    s === "error" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return "failed";
  }
  return "processing";
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function readImagesBatch(from: unknown): Record<string, unknown>[] {
  const obj = asRecord(from);
  const batch = obj?.images_batch;
  if (!Array.isArray(batch)) return [];
  return batch.filter((row) => row && typeof row === "object") as Record<
    string,
    unknown
  >[];
}

/** A batch row counts as generated when status is completed or listing fields exist. */
export function isBatchRowGenerated(row: Record<string, unknown>): boolean {
  const status = String(row.status ?? "")
    .trim()
    .toLowerCase();
  if (
    status === "completed" ||
    status === "complete" ||
    status === "success"
  ) {
    return true;
  }
  if (row.product_title != null && String(row.product_title).trim()) return true;
  const listing = asRecord(row.listing);
  if (listing?.title != null && String(listing.title).trim()) return true;
  if (row.description != null && String(row.description).trim()) return true;
  return false;
}

export function countGeneratedBatchRows(
  rows: Record<string, unknown>[],
): { completed: number; total: number } {
  const total = rows.length;
  const completed = rows.filter(isBatchRowGenerated).length;
  return { completed, total };
}

/**
 * Normalize GET /documents/product/:id `data` into one of:
 * - document (+ generatedImageId) → real full result
 * - flat product → processing / partial
 * - job wrapper → late hit after complete (no usable listing)
 */
export function normalizeProductPollData(
  data: unknown,
): NormalizedProductPoll {
  const root = asRecord(data);
  if (!root) {
    return {
      kind: "unknown",
      phase: "processing",
      imagesBatch: [],
      generatedImageIds: [],
      document: null,
      completedCount: 0,
      totalCount: 0,
    };
  }

  const nestedDoc = asRecord(root.document);
  const nestedAi = nestedDoc ? asRecord(nestedDoc.aiGenerated) : null;
  const rawIds = root.generatedImageId;
  const generatedImageIds = Array.isArray(rawIds)
    ? rawIds.filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
    : [];

  // Shape 1: { document, generatedImageId }
  if (nestedDoc?.id && nestedAi) {
    const imagesBatch = readImagesBatch(nestedAi);
    const { completed, total } = countGeneratedBatchRows(imagesBatch);
    const doc = nestedDoc as unknown as SingleDocument;
    return {
      kind: "document",
      phase: "completed",
      imagesBatch,
      generatedImageIds,
      document: doc,
      completedCount: completed || total,
      totalCount: total,
    };
  }

  // Shape 3: job wrapper { id, status, productId, customFields } — no usable listing
  const customFields = asRecord(root.customFields);
  const looksLikeJob =
    Boolean(customFields) &&
    root.productId != null &&
    !Array.isArray(root.images_batch);
  if (looksLikeJob) {
    const imagesBatch = readImagesBatch(customFields);
    const { completed, total } = countGeneratedBatchRows(imagesBatch);
    const jobPhase = parseProductStatus(root.status);
    return {
      kind: "job",
      phase: jobPhase === "failed" ? "failed" : "expired",
      imagesBatch,
      generatedImageIds: [],
      document: null,
      completedCount: completed,
      totalCount: total,
      message:
        "Result is no longer available from this link. Please generate again.",
    };
  }

  // Shape 2: flat product
  const imagesBatch = readImagesBatch(root);
  const { completed, total } = countGeneratedBatchRows(imagesBatch);
  const flatPhase = parseProductStatus(root.status);

  return {
    kind: "flat",
    phase: flatPhase === "failed" ? "failed" : "processing",
    imagesBatch,
    generatedImageIds: [],
    document: null,
    completedCount: completed,
    totalCount: total,
  };
}

/**
 * Wrap flat GET /documents/product/:id payload into SingleDocument so
 * existing extractImagesBatchFromDocument / ai-result mapping still works.
 *
 * `idOverride` — use the upload/job id we poll with when GET body's `id`
 * differs (POST returns `id` for GET path; GET body may expose another id).
 */
export function wrapAiProductAsDocument(
  product: AiProductRecord,
  options?: { idOverride?: string },
): SingleDocument {
  const id = String(options?.idOverride ?? product.id ?? "").trim();
  const seller = String(product.seller_id ?? "").trim();
  const created = String(product.created_at ?? new Date().toISOString());
  const updated = String(product.updated_at ?? created);

  return {
    id,
    userId: seller,
    isDeleted: false,
    createdAt: created,
    updatedAt: updated,
    aiGenerated: {
      status: product.status ?? "processing",
      product_id: String(product.id ?? id),
      product: {
        ...product,
        id: String(product.id ?? id),
        ready_to_publish: Boolean(product.ready_to_publish),
      },
    },
  };
}

export function saveActiveProductId(productId: string): void {
  if (typeof window === "undefined") return;
  const id = productId.trim();
  if (!id) return;
  try {
    localStorage.setItem(PRODUCT_ID_STORAGE_KEY, id);
    sessionStorage.setItem("generatedDocumentId", id);
  } catch {
    // ignore
  }
}

export function loadActiveProductId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = localStorage.getItem(PRODUCT_ID_STORAGE_KEY)?.trim();
    if (fromLs) return fromLs;
    const fromSs = sessionStorage.getItem("generatedDocumentId")?.trim();
    return fromSs || null;
  } catch {
    return null;
  }
}

export function clearActiveProductId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PRODUCT_ID_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Prefer URL productId; else localStorage / session. */
export function resolveProductId(
  urlProductId: string | null | undefined,
): string | null {
  const fromUrl = urlProductId?.trim() || "";
  if (fromUrl) return fromUrl;
  return loadActiveProductId();
}
