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
