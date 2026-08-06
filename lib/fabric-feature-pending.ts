import {
  deepClonePayload,
  ensureNestedObject,
} from "@/lib/ai-result-document-helpers";
import { extractImagesBatchFromDocument } from "@/lib/map-document-to-product-listing";
import type { StoredGeneratedPayload } from "@/lib/generated-document-storage";

const FABRIC_PREFIX = "ajpropl_fabric_pending_";
const FEATURE_PREFIX = "ajpropl_feature_pending_";

function setFlag(prefix: string, documentId: string): void {
  if (typeof window === "undefined" || !documentId) return;
  try {
    sessionStorage.setItem(`${prefix}${documentId}`, "1");
  } catch {
    // ignore
  }
}

function hasFlag(prefix: string, documentId: string | undefined): boolean {
  if (typeof window === "undefined" || !documentId) return false;
  try {
    return sessionStorage.getItem(`${prefix}${documentId}`) === "1";
  } catch {
    return false;
  }
}

function clearFlag(prefix: string, documentId: string | undefined): void {
  if (typeof window === "undefined" || !documentId) return;
  try {
    sessionStorage.removeItem(`${prefix}${documentId}`);
  } catch {
    // ignore
  }
}

/** After fresh AI generate, Fabric + Feature require user selection. */
export function markFabricFeaturePending(documentId: string): void {
  setFlag(FABRIC_PREFIX, documentId);
  setFlag(FEATURE_PREFIX, documentId);
}

export function isFabricPending(documentId: string | undefined): boolean {
  return hasFlag(FABRIC_PREFIX, documentId);
}

export function isFeaturePending(documentId: string | undefined): boolean {
  return hasFlag(FEATURE_PREFIX, documentId);
}

/** @deprecated Use isFabricPending / isFeaturePending */
export function isFabricFeaturePending(documentId: string | undefined): boolean {
  return isFabricPending(documentId) || isFeaturePending(documentId);
}

export function clearFabricPending(documentId: string | undefined): void {
  clearFlag(FABRIC_PREFIX, documentId);
}

export function clearFeaturePending(documentId: string | undefined): void {
  clearFlag(FEATURE_PREFIX, documentId);
}

/** @deprecated Use clearFabricPending / clearFeaturePending */
export function clearFabricFeaturePending(documentId: string | undefined): void {
  clearFabricPending(documentId);
  clearFeaturePending(documentId);
}

/** Remove AI auto size hints when variant_data.sizes is empty. */
export function stripAiAutoSizeFromPayload(
  payload: StoredGeneratedPayload,
): StoredGeneratedPayload {
  const next = deepClonePayload(payload);
  const rows = extractImagesBatchFromDocument(next.document);
  let changed = false;

  for (const row of rows) {
    const vd = ensureNestedObject(row, "variant_data");
    const rawSizes = vd.sizes;
    const hasUserSize =
      Array.isArray(rawSizes) &&
      rawSizes.some((s) => {
        const t = String(s ?? "").trim();
        return t && t !== "—";
      });

    if (hasUserSize) continue;

    // Keep sizes empty so Size field stays blank like Fabric.
    if (!Array.isArray(vd.sizes) || vd.sizes.length > 0) {
      vd.sizes = [];
      changed = true;
    }

    const dims = row.dimensions;
    if (dims && typeof dims === "object") {
      const d = dims as Record<string, unknown>;
      if (d.selected_size != null && d.selected_size !== "") {
        d.selected_size = null;
        changed = true;
      }
      if (
        Array.isArray(d.available_sizes) &&
        (d.available_sizes as unknown[]).length > 0
      ) {
        d.available_sizes = [];
        changed = true;
      } else if (
        d.available_sizes != null &&
        !Array.isArray(d.available_sizes)
      ) {
        d.available_sizes = [];
        changed = true;
      }
    }
  }

  return changed ? next : payload;
}

/** Remove AI fabric/feature from batch rows while user has not selected yet. */
export function stripAiFabricFeatureFromPayload(
  payload: StoredGeneratedPayload,
): StoredGeneratedPayload {
  const docId = payload.document.id;
  const stripFabric = isFabricPending(docId);
  const stripFeature = isFeaturePending(docId);
  if (!stripFabric && !stripFeature) return payload;

  const next = deepClonePayload(payload);
  const rows = extractImagesBatchFromDocument(next.document);
  for (const row of rows) {
    if (stripFabric) {
      row.fabric = "";
      ensureNestedObject(row, "listing").fabric = "";
    }
    if (stripFeature) {
      ensureNestedObject(row, "variant_data").feature = "";
    }
  }
  return next;
}
