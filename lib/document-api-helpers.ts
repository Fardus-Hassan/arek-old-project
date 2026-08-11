import type { SingleDocument } from "@/lib/api/documentApi";
import {
  DEFAULT_SHOPIFY_PUBLISHED,
  DEFAULT_SHOPIFY_STATUS,
} from "@/lib/shopify-field-options";

/** POST/PATCH may return `data` as a flat document or `{ document, generatedImageId }`. */
export function normalizeDocumentApiData(data: unknown): {
  document: SingleDocument;
  generatedImageIds: string[];
} {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid document API payload");
  }
  const d = data as Record<string, unknown>;
  const nested = d.document;
  if (nested && typeof nested === "object") {
    const doc = nested as SingleDocument;
    const inner = nested as Record<string, unknown>;
    let rawIds = d.generatedImageId;
    if (!Array.isArray(rawIds)) {
      rawIds = inner.generatedImageId ?? inner.generated_image_ids;
    }
    const generatedImageIds = Array.isArray(rawIds)
      ? rawIds.filter((x): x is string => typeof x === "string")
      : [];
    if (!doc?.id) throw new Error("Invalid nested document in API payload");
    return { document: doc, generatedImageIds };
  }
  const doc = d as unknown as SingleDocument;
  if (!doc?.id) throw new Error("Invalid document in API payload");
  return { document: doc, generatedImageIds: [] };
}

/**
 * PATCH body `imageDetails`: deep clone of the active `images_batch` row.
 * `image_index` is normalized to a finite number from that row only (API: same as `images_batch[].image_index`).
 */
export function buildImageDetailsPatchPayload(
  imagesBatchRow: Record<string, unknown>,
): Record<string, unknown> | null {
  const imageDetails = JSON.parse(
    JSON.stringify(imagesBatchRow),
  ) as Record<string, unknown>;
  const ix = imageDetails.image_index;
  let n: number;
  if (typeof ix === "number" && Number.isFinite(ix)) {
    n = ix;
  } else if (typeof ix === "string" && Number.isFinite(Number(ix))) {
    n = Number(ix);
  } else {
    return null;
  }
  imageDetails.image_index = n;
  return imageDetails;
}

/** `PATCH /documents/{this value}` — stored array at **0-based UI tab index** (Image 1 → 0, Image 5 → 4). */
export function generatedImageIdForTabIndex(
  generatedImageIds: string[] | undefined,
  tabIndex: number,
): string | undefined {
  if (!generatedImageIds?.length || !Number.isFinite(tabIndex) || tabIndex < 0) {
    return undefined;
  }
  return generatedImageIds[tabIndex];
}

/**
 * 0-based image_index from a batch row, or null if missing.
 * API contract: image_index starts at 0 (Image 1 tab → 0).
 */
export function parseBatchImageIndex(
  batchRow: Record<string, unknown> | undefined,
): number | null {
  if (!batchRow) return null;
  const raw = batchRow.image_index;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && Number.isFinite(Number(raw))) {
    const n = Number(raw);
    if (n >= 0) return Math.floor(n);
  }
  return null;
}

/**
 * Resolve Shopify/PATCH image id for one images_batch row.
 *
 * Create API contract (verified from real payloads):
 * - `image_index` is **0-based**: 0, 1, 2, …
 * - `generatedImageId[image_index]` belongs to that batch row
 * - Never treat image_index as 1-based (that swaps every multi-product pair)
 */
export function resolveGeneratedImageIdForBatchRow(
  generatedImageIds: string[] | undefined,
  batchRow: Record<string, unknown> | undefined,
  arrayIndex: number,
): string | undefined {
  const all = generatedImageIds ?? [];
  if (!all.length) return undefined;

  const known = new Set(
    all.filter((x): x is string => typeof x === "string" && x.trim().length > 0),
  );

  if (batchRow) {
    for (const key of [
      "generated_image_id",
      "generatedImageId",
      "imageDocumentId",
      "image_document_id",
    ] as const) {
      const v = batchRow[key];
      if (typeof v === "string" && v.trim() && known.has(v.trim())) {
        return v.trim();
      }
    }
    const rowId = batchRow.id;
    if (typeof rowId === "string" && rowId.trim() && known.has(rowId.trim())) {
      return rowId.trim();
    }

    const imageIndex = parseBatchImageIndex(batchRow);
    if (imageIndex != null && imageIndex < all.length) {
      const id = all[imageIndex]?.trim();
      if (id) return id;
    }
  }

  const byArray = all[arrayIndex]?.trim();
  return byArray || undefined;
}

/**
 * After PATCH, update the id slot at the **API image_index** (0-based), not
 * only the UI array position, so multi-row id arrays stay aligned.
 */
export function replaceGeneratedImageIdAtImageIndex(
  ids: string[] | undefined,
  imageIndex: number,
  newId: string,
): string[] {
  const next = [...(ids ?? [])];
  if (
    imageIndex >= 0 &&
    Number.isFinite(imageIndex) &&
    typeof newId === "string" &&
    newId.length > 0
  ) {
    // Grow array if needed (shouldn't, but keep safe)
    while (next.length <= imageIndex) next.push("");
    next[imageIndex] = newId;
  }
  return next;
}


/** PATCH success: `{ id, imageDetails, ... }` — not full nested create shape. */
export function isPatchRowUpdateResponse(
  data: unknown,
): data is { id: string; imageDetails: Record<string, unknown> } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    d.imageDetails != null &&
    typeof d.imageDetails === "object" &&
    !Array.isArray(d.imageDetails)
  );
}

/** Merge `imageDetails` into `document.aiGenerated.product.images_batch` for one row. */
export function mergeParentDocumentWithPatchRow(
  parent: SingleDocument,
  imageDetails: Record<string, unknown>,
  patchedTabIndex: number,
): SingleDocument {
  const clone = JSON.parse(JSON.stringify(parent)) as SingleDocument;
  const ai = clone.aiGenerated as Record<string, unknown> | null;
  if (!ai || typeof ai !== "object") return clone;
  const product = ai.product as Record<string, unknown> | undefined;
  const batch = product?.images_batch;
  if (!product || !Array.isArray(batch)) return clone;

  const ix = imageDetails.image_index;
  let targetIx: number | undefined;
  if (typeof ix === "number" && Number.isFinite(ix)) targetIx = ix;
  else if (typeof ix === "string" && Number.isFinite(Number(ix)))
    targetIx = Number(ix);

  let rowIndex = -1;
  if (targetIx !== undefined) {
    rowIndex = batch.findIndex((row) => {
      const r = row as Record<string, unknown>;
      const ri = r.image_index;
      const num =
        typeof ri === "number"
          ? ri
          : typeof ri === "string" && Number.isFinite(Number(ri))
            ? Number(ri)
            : NaN;
      return Number.isFinite(num) && num === targetIx;
    });
  }
  if (rowIndex < 0 && patchedTabIndex >= 0 && patchedTabIndex < batch.length) {
    rowIndex = patchedTabIndex;
  }
  if (rowIndex < 0 || rowIndex >= batch.length) return clone;

  const prev = batch[rowIndex] as Record<string, unknown>;
  batch[rowIndex] = { ...prev, ...imageDetails };
  return clone;
}

/**
 * After a successful PATCH, `data.id` is the new row id — use it for the next PATCH on this tab.
 * Replaces `generatedImageIds[tabIndex]` only when in range.
 */
export function replaceGeneratedImageIdAtTabIndex(
  ids: string[] | undefined,
  tabIndex: number,
  newId: string,
): string[] {
  const next = [...(ids ?? [])];
  if (
    tabIndex >= 0 &&
    tabIndex < next.length &&
    typeof newId === "string" &&
    newId.length > 0
  ) {
    next[tabIndex] = newId;
  }
  return next;
}

/** Ensure Shopify CSV export settings persist on PATCH imageDetails. */
export function ensureShopifyExportFieldsOnPatch(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...payload };
  if (next.shopify_published === undefined) {
    next.shopify_published = DEFAULT_SHOPIFY_PUBLISHED;
  }
  if (
    next.shopify_status == null ||
    String(next.shopify_status).trim() === ""
  ) {
    next.shopify_status = DEFAULT_SHOPIFY_STATUS;
  }
  return next;
}
