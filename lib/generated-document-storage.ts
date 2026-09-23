import type { SingleDocument } from "@/lib/api/documentApi";
import type { OutputLanguage } from "@/lib/feature-catalog";
import { clearShopifyStatusByDocument } from "@/lib/shopify-status-storage";

function imagesBatchFromDocument(
  doc: SingleDocument,
): Record<string, unknown>[] {
  const ai = doc.aiGenerated as
    | {
        images_batch?: unknown[];
        product?: { images_batch?: unknown[] };
      }
    | null
    | undefined;
  const batch = Array.isArray(ai?.images_batch)
    ? ai.images_batch
    : ai?.product?.images_batch;
  if (!Array.isArray(batch)) return [];
  return batch.map((row) => row as Record<string, unknown>);
}

/** @deprecated Legacy single-slot key — migrated into per-id store on first read. */
export const GENERATED_DOCUMENT_STORAGE_KEY =
  "ajpropl_last_generated_document_v1";

const INDEX_KEY = "ajpropl_generated_docs_index_v2";
const DOC_PREFIX = "ajpropl_generated_doc_v2_";
const GENERATED_IMAGE_IDS_SESSION_PREFIX = "ajpropl_generatedImageIds_";

/** Soft cap so multi-tab work stays safe; UI can delete earlier. */
export const MAX_SAVED_BATCHES = 5;

export const BATCHES_CHANGED_EVENT = "ajpropl-batches-changed";

export type StoredGeneratedPayload = {
  savedAt: string;
  document: SingleDocument;
  /** From POST `data.generatedImageId`; order aligns with UI tab index. */
  generatedImageIds?: string[];
  /** Output language used at generation time (dropdown option lists). */
  outputLanguage?: OutputLanguage;
};

export type SavedBatchSummary = {
  id: string;
  savedAt: string;
  groupCount: number;
  title: string;
  language?: string;
};

function docStorageKey(productId: string): string {
  return `${DOC_PREFIX}${productId}`;
}

export function isGeneratedDocumentStorageKey(key: string | null): boolean {
  if (!key) return false;
  return (
    key === GENERATED_DOCUMENT_STORAGE_KEY ||
    key === INDEX_KEY ||
    key.startsWith(DOC_PREFIX)
  );
}

function notifyBatchesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BATCHES_CHANGED_EVENT));
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && !!x.trim());
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function parsePayload(raw: string): StoredGeneratedPayload | null {
  try {
    const parsed = JSON.parse(raw) as StoredGeneratedPayload & {
      generatedImageId?: unknown;
    };
    if (!parsed?.document?.id) return null;
    let generatedImageIds = parsed.generatedImageIds;
    if (!generatedImageIds?.length && Array.isArray(parsed.generatedImageId)) {
      generatedImageIds = parsed.generatedImageId.filter(
        (x): x is string => typeof x === "string",
      );
    }
    return { ...parsed, generatedImageIds };
  } catch {
    return null;
  }
}

function readPayloadById(productId: string): StoredGeneratedPayload | null {
  if (typeof window === "undefined" || !productId) return null;
  try {
    const raw = localStorage.getItem(docStorageKey(productId));
    if (!raw) return null;
    return parsePayload(raw);
  } catch {
    return null;
  }
}

function writePayload(payload: StoredGeneratedPayload): void {
  const id = payload.document?.id?.trim();
  if (!id) return;
  try {
    localStorage.setItem(docStorageKey(id), JSON.stringify(payload));
  } catch {
    // QuotaExceededError or private mode
  }
}

function removePayload(productId: string): void {
  try {
    localStorage.removeItem(docStorageKey(productId));
  } catch {
    // ignore
  }
}

/** One-time: move legacy single key into the indexed store. */
function migrateLegacyIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    const legacyRaw = localStorage.getItem(GENERATED_DOCUMENT_STORAGE_KEY);
    if (!legacyRaw) return;
    const legacy = parsePayload(legacyRaw);
    if (legacy?.document?.id) {
      const id = legacy.document.id.trim();
      if (!readPayloadById(id)) {
        writePayload(legacy);
      }
      const index = readIndex();
      if (!index.includes(id)) {
        writeIndex([id, ...index]);
      }
    }
    localStorage.removeItem(GENERATED_DOCUMENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** MRU first; drop overflow payloads (+ shopify status). */
function touchIndex(productId: string): void {
  const id = productId.trim();
  if (!id) return;
  const next = [id, ...readIndex().filter((x) => x !== id)];
  const overflow = next.slice(MAX_SAVED_BATCHES);
  const kept = next.slice(0, MAX_SAVED_BATCHES);
  writeIndex(kept);
  for (const oldId of overflow) {
    removePayload(oldId);
    clearShopifyStatusByDocument(oldId);
  }
}

function summaryFromPayload(payload: StoredGeneratedPayload): SavedBatchSummary {
  const id = payload.document.id;
  const rows = imagesBatchFromDocument(payload.document);
  const first = rows[0] as Record<string, unknown> | undefined;
  const titleRaw =
    (typeof first?.product_title === "string" && first.product_title) ||
    (typeof first?.title === "string" && first.title) ||
    "";
  const ai = payload.document.aiGenerated as
    | { product?: { language?: string }; language?: string }
    | null
    | undefined;
  const language =
    payload.outputLanguage ||
    ai?.product?.language ||
    ai?.language ||
    undefined;

  return {
    id,
    savedAt: payload.savedAt || new Date().toISOString(),
    groupCount: rows.length,
    title: titleRaw.trim() || `Batch ${id.slice(0, 8)}…`,
    language: language ? String(language) : undefined,
  };
}

function persistGeneratedImageIdsSession(
  documentId: string,
  ids: string[],
): void {
  if (typeof window === "undefined" || !documentId || !ids.length) return;
  try {
    sessionStorage.setItem(
      `${GENERATED_IMAGE_IDS_SESSION_PREFIX}${documentId}`,
      JSON.stringify(ids),
    );
  } catch {
    // ignore
  }
}

/** Fallback when localStorage payload lost `generatedImageIds` (e.g. old tab / partial write). */
export function loadGeneratedImageIdsSession(
  documentId: string,
): string[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(
      `${GENERATED_IMAGE_IDS_SESSION_PREFIX}${documentId}`,
    );
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const ids = parsed.filter((x): x is string => typeof x === "string");
    return ids.length ? ids : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve row ids for `PATCH /documents/{ids[tabIndex]}` (tab index → ids[i]). */
export function getGeneratedImageIdsForDocument(
  documentId: string,
  prefer?: Pick<StoredGeneratedPayload, "document" | "generatedImageIds"> | null,
): string[] | undefined {
  if (
    prefer?.document?.id === documentId &&
    prefer.generatedImageIds?.length
  ) {
    return prefer.generatedImageIds;
  }
  const disk = loadGeneratedDocument(documentId);
  if (disk?.document?.id === documentId && disk.generatedImageIds?.length) {
    return disk.generatedImageIds;
  }
  return loadGeneratedImageIdsSession(documentId);
}

/**
 * Persist create/update payload under `document.id`.
 * Keeps up to {@link MAX_SAVED_BATCHES} batches (MRU); older ones are dropped.
 */
export function saveGeneratedDocument(
  document: SingleDocument,
  generatedImageIds?: string[] | null,
  outputLanguage?: OutputLanguage,
): void {
  if (typeof window === "undefined") return;
  migrateLegacyIfNeeded();
  try {
    const id = String(document?.id ?? "").trim();
    if (!id) return;

    let ids: string[] = Array.isArray(generatedImageIds)
      ? generatedImageIds.map((x) =>
          typeof x === "string" ? x.trim() : "",
        )
      : [];
    let lang = outputLanguage;
    const prev = readPayloadById(id);
    if ((!ids.some(Boolean) || !lang) && prev?.document?.id === id) {
      if (!ids.some(Boolean) && prev.generatedImageIds?.length) {
        ids = prev.generatedImageIds;
      }
      if (!lang && prev.outputLanguage) {
        lang = prev.outputLanguage;
      }
    }
    const payload: StoredGeneratedPayload = {
      savedAt: new Date().toISOString(),
      document,
      ...(ids.some(Boolean) ? { generatedImageIds: ids } : {}),
      ...(lang ? { outputLanguage: lang } : {}),
    };
    writePayload(payload);
    touchIndex(id);
    if (ids.some(Boolean)) persistGeneratedImageIdsSession(id, ids);
    notifyBatchesChanged();
  } catch {
    // QuotaExceededError or private mode
  }
}

/**
 * Load one saved batch. Pass `productId` for a specific job;
 * omit to get the most recently saved batch.
 */
export function loadGeneratedDocument(
  productId?: string | null,
): StoredGeneratedPayload | null {
  if (typeof window === "undefined") return null;
  migrateLegacyIfNeeded();
  const wanted = productId?.trim();
  if (wanted) return readPayloadById(wanted);
  const index = readIndex();
  for (const id of index) {
    const payload = readPayloadById(id);
    if (payload) return payload;
  }
  return null;
}

/** List saved batches (newest first) for the manager UI. */
export function listSavedBatches(): SavedBatchSummary[] {
  if (typeof window === "undefined") return [];
  migrateLegacyIfNeeded();
  const out: SavedBatchSummary[] = [];
  const alive: string[] = [];
  for (const id of readIndex()) {
    const payload = readPayloadById(id);
    if (!payload) continue;
    alive.push(id);
    out.push(summaryFromPayload(payload));
  }
  if (alive.length !== readIndex().length) writeIndex(alive);
  return out;
}

/** Remove one batch from this browser (server/API data is unchanged). */
export function deleteSavedBatch(productId: string): boolean {
  if (typeof window === "undefined") return false;
  const id = productId.trim();
  if (!id) return false;
  migrateLegacyIfNeeded();
  removePayload(id);
  writeIndex(readIndex().filter((x) => x !== id));
  clearShopifyStatusByDocument(id);
  try {
    sessionStorage.removeItem(`${GENERATED_IMAGE_IDS_SESSION_PREFIX}${id}`);
  } catch {
    // ignore
  }
  notifyBatchesChanged();
  return true;
}

/** @deprecated Prefer deleteSavedBatch / leave other tabs' data intact. */
export function clearGeneratedDocument(): void {
  if (typeof window === "undefined") return;
  // No-op for multi-batch: do not wipe other tabs' saved work.
}
