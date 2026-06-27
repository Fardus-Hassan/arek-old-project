import type { FilePair } from "./bulk-group-upload";

export type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export const newPendingFileId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function filesToPending(files: File[]): PendingFile[] {
  return files.map((file) => ({
    id: newPendingFileId(),
    file,
    previewUrl: URL.createObjectURL(file),
  }));
}

export function revokePendingFiles(items: PendingFile[]) {
  items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

export function reorderPendingFiles(
  items: PendingFile[],
  fromIndex: number,
  toIndex: number,
): PendingFile[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export function swapPendingFiles(
  items: PendingFile[],
  fromIndex: number,
  toIndex: number,
): PendingFile[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const a = next[fromIndex]!;
  const b = next[toIndex]!;
  next[fromIndex] = b;
  next[toIndex] = a;
  return next;
}

export function pendingToFiles(items: PendingFile[]): File[] {
  return items.map((item) => item.file);
}

/** Pair in current list order — no re-sort. */
export function pairAlternatingInOrder(files: File[]): {
  ok: true;
  pairs: FilePair[];
} | { ok: false; message: string } {
  if (files.length === 0) {
    return { ok: false, message: "No images selected." };
  }
  if (files.length % 2 !== 0) {
    return {
      ok: false,
      message:
        "Upload an even number of images (Front, Back, Front, Back…).",
    };
  }
  const pairs: FilePair[] = [];
  for (let i = 0; i < files.length; i += 2) {
    pairs.push([files[i]!, files[i + 1]!]);
  }
  return { ok: true, pairs };
}

/** Pair by index in current order — no re-sort. */
export function pairDualInOrder(
  fronts: File[],
  backs: File[],
): { ok: true; pairs: FilePair[] } | { ok: false; message: string } {
  if (fronts.length === 0 && backs.length === 0) {
    return { ok: false, message: "No images selected." };
  }
  if (fronts.length !== backs.length) {
    return {
      ok: false,
      message: `Front and Back image counts must match (got ${fronts.length} fronts, ${backs.length} backs).`,
    };
  }
  const pairs: FilePair[] = fronts.map((front, i) => [front, backs[i]!]);
  return { ok: true, pairs };
}

export function alternatingSlotLabel(index: number): string {
  const group = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `G${group} Front` : `G${group} Back`;
}

export function dualSlotLabel(index: number, side: "front" | "back"): string {
  return `G${index + 1} ${side === "front" ? "Front" : "Back"}`;
}
