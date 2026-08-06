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

/**
 * Swap every Front/Back pair in place: 0↔1, 2↔3, …
 * Fixes systematic "browser sent Back first" import (client front/back click order lost).
 */
export function swapAllAlternatingPairs(items: PendingFile[]): PendingFile[] {
  if (items.length < 2) return items;
  const next = [...items];
  for (let i = 0; i + 1 < next.length; i += 2) {
    const a = next[i]!;
    next[i] = next[i + 1]!;
    next[i + 1] = a;
  }
  return next;
}

export function pendingToFiles(items: PendingFile[]): File[] {
  return items.map((item) => item.file);
}

/** Detect front/back from filename (browser FileList is often A–Z, so "back" comes before "front"). */
export function sideFromFileName(name: string): "front" | "back" | null {
  const n = name.toLowerCase();
  // Word-boundary only — avoid false matches (e.g. "feedback")
  if (
    /(^|[^a-z])(back|rear|tył|tyl|verso)([^a-z]|$)/i.test(n) ||
    /[_-]back([_./-]|$)/i.test(n) ||
    /(^|[_./-])back[_./-]/i.test(n)
  ) {
    return "back";
  }
  if (
    /(^|[^a-z])(front|przód|przod|recto)([^a-z]|$)/i.test(n) ||
    /[_-]front([_./-]|$)/i.test(n) ||
    /(^|[_./-])front[_./-]/i.test(n)
  ) {
    return "front";
  }
  return null;
}

function baseKeyFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-\s]?(front|back|rear|tył|tyl|przód|przod|verso|recto)/gi, "")
    .replace(/[_-\s]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Alternating bulk: keep group order as much as possible, but force Front before
 * Back inside each pair when filenames label the side (browser often returns A–Z).
 * Does NOT full-sort the entire list by file name.
 */
export function stabilizeAlternatingFileOrder(files: File[]): File[] {
  if (files.length < 2) return files;

  const tagged = files.map((file, index) => ({
    file,
    index,
    side: sideFromFileName(file.name),
    base: baseKeyFromName(file.name),
  }));

  const withSide = tagged.filter((t) => t.side != null);
  // Enough labeled files → group by product base (front then back).
  if (withSide.length >= Math.max(2, Math.ceil(files.length * 0.4))) {
    type G = { front?: File; back?: File; firstIndex: number };
    const byBase = new Map<string, G>();

    for (const t of withSide) {
      let g = byBase.get(t.base);
      if (!g) {
        g = { firstIndex: t.index };
        byBase.set(t.base, g);
      }
      g.firstIndex = Math.min(g.firstIndex, t.index);
      if (t.side === "front" && !g.front) g.front = t.file;
      if (t.side === "back" && !g.back) g.back = t.file;
    }

    const orderedGroups = [...byBase.values()].sort(
      (a, b) => a.firstIndex - b.firstIndex,
    );
    const out: File[] = [];
    const used = new Set<File>();

    for (const g of orderedGroups) {
      if (g.front && g.back) {
        out.push(g.front, g.back);
        used.add(g.front);
        used.add(g.back);
      }
    }

    for (const f of files) {
      if (!used.has(f)) out.push(f);
    }

    if (used.size >= files.length - 1 && out.length === files.length) {
      return out;
    }
  }

  // Fallback: in each 0–1, 2–3, … pair, swap if clearly Back then Front
  const next = [...files];
  for (let i = 0; i + 1 < next.length; i += 2) {
    const aSide = sideFromFileName(next[i]!.name);
    const bSide = sideFromFileName(next[i + 1]!.name);
    if (aSide === "back" && bSide === "front") {
      const tmp = next[i]!;
      next[i] = next[i + 1]!;
      next[i + 1] = tmp;
    }
  }
  return next;
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
