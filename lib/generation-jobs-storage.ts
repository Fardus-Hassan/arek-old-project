import type { OutputLanguage } from "@/lib/feature-catalog";
import type { ProductPollPhase } from "@/lib/ai-product-helpers";
import {
  BATCHES_CHANGED_EVENT,
  deleteSavedBatch,
  isGeneratedDocumentStorageKey as isDocStorageKey,
  listSavedBatches,
  loadGeneratedDocument,
  saveGeneratedDocument,
  type SavedBatchSummary,
  type StoredGeneratedPayload,
} from "@/lib/generated-document-storage";
import type { SingleDocument } from "@/lib/api/documentApi";

const JOBS_INDEX_KEY = "ajpropl_generation_jobs_index_v1";
const JOB_PREFIX = "ajpropl_generation_job_v1_";

/** Soft cap shared with completed docs in the UI. */
export const MAX_GENERATION_JOBS = 5;

export type GenerationJobStatus =
  | "processing"
  | "completed"
  | "failed"
  | "expired";

export type GenerationJobRecord = {
  id: string;
  startedAt: string;
  updatedAt: string;
  /** Groups uploaded at Generate time */
  groupCount: number;
  language?: string;
  status: GenerationJobStatus;
  /** Last known progress (from analyzing poll or one-shot sheet fetch) */
  completedCount: number;
  totalCount: number;
  pollSeconds?: number;
  title?: string;
};

export type BatchListItem = SavedBatchSummary & {
  status: GenerationJobStatus;
  completedCount: number;
  totalCount: number;
  hasLocalResult: boolean;
  pollSeconds?: number;
  startedAt: string;
};

function jobKey(id: string): string {
  return `${JOB_PREFIX}${id}`;
}

export function isGenerationJobStorageKey(key: string | null): boolean {
  if (!key) return false;
  return (
    key === JOBS_INDEX_KEY ||
    key.startsWith(JOB_PREFIX) ||
    isDocStorageKey(key)
  );
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BATCHES_CHANGED_EVENT));
}

function readJobsIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOBS_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && !!x.trim());
  } catch {
    return [];
  }
}

function writeJobsIndex(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JOBS_INDEX_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function readJob(id: string): GenerationJobRecord | null {
  if (typeof window === "undefined" || !id) return null;
  try {
    const raw = localStorage.getItem(jobKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GenerationJobRecord;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeJob(job: GenerationJobRecord): void {
  try {
    localStorage.setItem(jobKey(job.id), JSON.stringify(job));
  } catch {
    // ignore
  }
}

function removeJob(id: string): void {
  try {
    localStorage.removeItem(jobKey(id));
  } catch {
    // ignore
  }
}

function touchJobsIndex(id: string): void {
  const next = [id, ...readJobsIndex().filter((x) => x !== id)];
  const overflow = next.slice(MAX_GENERATION_JOBS);
  const kept = next.slice(0, MAX_GENERATION_JOBS);
  writeJobsIndex(kept);
  for (const oldId of overflow) {
    deleteSavedBatch(oldId);
    removeJob(oldId);
  }
}

function phaseToJobStatus(phase: ProductPollPhase): GenerationJobStatus {
  if (phase === "completed") return "completed";
  if (phase === "failed") return "failed";
  if (phase === "expired") return "expired";
  return "processing";
}

/** Call right after upload-product-to-ai returns an id. */
export function registerGenerationJob(input: {
  id: string;
  groupCount: number;
  language?: string | OutputLanguage;
  pollSeconds?: number;
}): void {
  if (typeof window === "undefined") return;
  const id = input.id.trim();
  if (!id) return;
  const now = new Date().toISOString();
  const prev = readJob(id);
  const groupCount = Math.max(
    prev?.groupCount || 0,
    Math.max(1, Math.round(input.groupCount) || 1),
  );
  const job: GenerationJobRecord = {
    id,
    startedAt: prev?.startedAt || now,
    updatedAt: now,
    groupCount,
    language: input.language ? String(input.language) : prev?.language,
    status: prev?.status === "completed" ? "completed" : "processing",
    completedCount: prev?.completedCount ?? 0,
    totalCount: Math.max(prev?.totalCount || 0, groupCount),
    pollSeconds: input.pollSeconds ?? prev?.pollSeconds,
    title: prev?.title,
  };
  writeJob(job);
  touchJobsIndex(id);
  notify();
}

export function updateGenerationJobProgress(
  productId: string,
  patch: {
    completedCount?: number;
    totalCount?: number;
    status?: ProductPollPhase | GenerationJobStatus;
    title?: string;
  },
): void {
  if (typeof window === "undefined") return;
  const id = productId.trim();
  if (!id) return;
  const prev = readJob(id);
  if (!prev) return;
  const statusRaw = patch.status;
  const status: GenerationJobStatus =
    statusRaw === "processing" ||
    statusRaw === "completed" ||
    statusRaw === "failed" ||
    statusRaw === "expired"
      ? statusRaw
      : statusRaw
        ? phaseToJobStatus(statusRaw as ProductPollPhase)
        : prev.status;

  const totalCount =
    typeof patch.totalCount === "number" && patch.totalCount > 0
      ? patch.totalCount
      : prev.totalCount || prev.groupCount;
  const completedCount =
    typeof patch.completedCount === "number"
      ? Math.max(0, Math.min(patch.completedCount, totalCount || patch.completedCount))
      : prev.completedCount;

  writeJob({
    ...prev,
    updatedAt: new Date().toISOString(),
    status,
    completedCount,
    totalCount,
    ...(patch.title ? { title: patch.title } : {}),
  });
  touchJobsIndex(id);
  notify();
}

export function markGenerationJobCompleted(
  productId: string,
  opts?: { title?: string; totalCount?: number },
): void {
  updateGenerationJobProgress(productId, {
    status: "completed",
    completedCount: opts?.totalCount,
    totalCount: opts?.totalCount,
    title: opts?.title,
  });
}

export function getGenerationJob(productId: string): GenerationJobRecord | null {
  return readJob(productId.trim());
}

/** Remove job meta only (document delete is separate / via deleteBatchEntry). */
export function deleteGenerationJob(productId: string): void {
  const id = productId.trim();
  if (!id) return;
  removeJob(id);
  writeJobsIndex(readJobsIndex().filter((x) => x !== id));
  notify();
}

/** Delete job + local result + shopify status for this browser. */
export function deleteBatchEntry(productId: string): boolean {
  const id = productId.trim();
  if (!id) return false;
  deleteSavedBatch(id);
  deleteGenerationJob(id);
  return true;
}

function titleFromPayload(payload: StoredGeneratedPayload | null): string | undefined {
  if (!payload) return undefined;
  const rows = (() => {
    const ai = payload.document.aiGenerated as
      | { images_batch?: unknown[]; product?: { images_batch?: unknown[] } }
      | null
      | undefined;
    const batch = Array.isArray(ai?.images_batch)
      ? ai.images_batch
      : ai?.product?.images_batch;
    return Array.isArray(batch) ? batch : [];
  })();
  const first = rows[0] as Record<string, unknown> | undefined;
  const titleRaw =
    (typeof first?.product_title === "string" && first.product_title) ||
    (typeof first?.title === "string" && first.title) ||
    "";
  return titleRaw.trim() || undefined;
}

/**
 * Combined list for top bar: in-progress jobs + completed local results.
 * Newest first. No network — caller refreshes once when sheet opens.
 */
export function listBatchEntries(): BatchListItem[] {
  if (typeof window === "undefined") return [];

  const byId = new Map<string, BatchListItem>();

  // Completed / edited local documents
  for (const batch of listSavedBatches()) {
    const job = readJob(batch.id);
    byId.set(batch.id, {
      ...batch,
      status: "completed",
      completedCount: batch.groupCount,
      totalCount: batch.groupCount,
      hasLocalResult: true,
      pollSeconds: job?.pollSeconds,
      startedAt: job?.startedAt || batch.savedAt,
    });
  }

  // Jobs (may still be processing, or completed without local yet)
  for (const id of readJobsIndex()) {
    const job = readJob(id);
    if (!job) continue;
    const existing = byId.get(id);
    if (existing?.hasLocalResult) {
      byId.set(id, {
        ...existing,
        startedAt: job.startedAt || existing.startedAt,
        pollSeconds: job.pollSeconds ?? existing.pollSeconds,
        language: existing.language || job.language,
        title: existing.title || job.title || existing.title,
      });
      continue;
    }
    const total = job.totalCount || job.groupCount || 0;
    const completed =
      job.status === "completed"
        ? total
        : Math.min(job.completedCount || 0, total || job.completedCount || 0);
    byId.set(id, {
      id,
      savedAt: job.updatedAt || job.startedAt,
      startedAt: job.startedAt,
      groupCount: job.groupCount || total || 0,
      title: job.title || `Batch ${id.slice(0, 8)}…`,
      language: job.language,
      status: job.status,
      completedCount: completed,
      totalCount: total,
      hasLocalResult: false,
      pollSeconds: job.pollSeconds,
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.savedAt).getTime();
    const tb = new Date(b.savedAt).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

/** Apply a one-shot poll result into local job (+ save doc when ready). */
export function applyPollSnapshotToJob(
  productId: string,
  snapshot: {
    phase: ProductPollPhase;
    completedCount: number;
    totalCount: number;
    document?: SingleDocument | null;
    generatedImageIds?: string[];
    outputLanguage?: OutputLanguage;
  },
): BatchListItem | null {
  const id = productId.trim();
  if (!id) return null;

  if (!readJob(id)) {
    registerGenerationJob({
      id,
      groupCount: snapshot.totalCount || 1,
    });
  }

  if (
    snapshot.phase === "completed" &&
    snapshot.document?.id
  ) {
    saveGeneratedDocument(
      snapshot.document,
      snapshot.generatedImageIds,
      snapshot.outputLanguage,
    );
    const title = titleFromPayload(
      loadGeneratedDocument(snapshot.document.id),
    );
    markGenerationJobCompleted(id, {
      title,
      totalCount:
        snapshot.totalCount ||
        snapshot.completedCount ||
        undefined,
    });
  } else {
    updateGenerationJobProgress(id, {
      status: snapshot.phase,
      completedCount: snapshot.completedCount,
      totalCount: snapshot.totalCount,
    });
  }

  return listBatchEntries().find((x) => x.id === id) ?? null;
}
