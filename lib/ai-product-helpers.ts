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

export type ProductPollPhase = "processing" | "completed" | "failed";

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
