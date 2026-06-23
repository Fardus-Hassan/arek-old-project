import type { SingleDocument } from "@/lib/api/documentApi";

/** Persists last successful POST /documents `data` across reloads; overwritten only on new success. */
export const GENERATED_DOCUMENT_STORAGE_KEY = "ajpropl_last_generated_document_v1";

const GENERATED_IMAGE_IDS_SESSION_PREFIX = "ajpropl_generatedImageIds_";

export type StoredGeneratedPayload = {
  savedAt: string;
  document: SingleDocument;
  /** From POST `data.generatedImageId`; order aligns with UI tab index. */
  generatedImageIds?: string[];
};

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
  const disk = loadGeneratedDocument();
  if (disk?.document?.id === documentId && disk.generatedImageIds?.length) {
    return disk.generatedImageIds;
  }
  return loadGeneratedImageIdsSession(documentId);
}

export function saveGeneratedDocument(
  document: SingleDocument,
  generatedImageIds?: string[] | null,
): void {
  if (typeof window === "undefined") return;
  try {
    let ids = generatedImageIds?.filter(Boolean) ?? [];
    if (!ids.length) {
      const prev = loadGeneratedDocument();
      if (prev?.document?.id === document.id && prev.generatedImageIds?.length) {
        ids = prev.generatedImageIds;
      }
    }
    const payload: StoredGeneratedPayload = {
      savedAt: new Date().toISOString(),
      document,
      ...(ids.length ? { generatedImageIds: ids } : {}),
    };
    localStorage.setItem(
      GENERATED_DOCUMENT_STORAGE_KEY,
      JSON.stringify(payload),
    );
    if (ids.length) persistGeneratedImageIdsSession(document.id, ids);
  } catch {
    // QuotaExceededError or private mode
  }
}

export function loadGeneratedDocument(): StoredGeneratedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GENERATED_DOCUMENT_STORAGE_KEY);
    if (!raw) return null;
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

export function clearGeneratedDocument(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GENERATED_DOCUMENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
