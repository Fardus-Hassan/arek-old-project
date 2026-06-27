import {
  createEmptyGroup,
  type ImageGroup,
} from "./image-group-types";

export type BulkUploadMode = "alternating" | "dual";

export type FilePair = [File, File];

export type PairResult =
  | { ok: true; pairs: FilePair[] }
  | { ok: false; message: string };

export function sortFilesByName(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export function pairAlternating(files: File[]): PairResult {
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
  const sorted = sortFilesByName(files);
  const pairs: FilePair[] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    pairs.push([sorted[i]!, sorted[i + 1]!]);
  }
  return { ok: true, pairs };
}

export function pairDualArrays(fronts: File[], backs: File[]): PairResult {
  if (fronts.length === 0 && backs.length === 0) {
    return { ok: false, message: "No images selected." };
  }
  if (fronts.length !== backs.length) {
    return {
      ok: false,
      message: `Front and Back image counts must match (got ${fronts.length} fronts, ${backs.length} backs).`,
    };
  }
  const sortedFronts = sortFilesByName(fronts);
  const sortedBacks = sortFilesByName(backs);
  const pairs: FilePair[] = sortedFronts.map((front, i) => [
    front,
    sortedBacks[i]!,
  ]);
  return { ok: true, pairs };
}

export function buildGroupsFromPairs(pairs: FilePair[]): ImageGroup[] {
  return pairs.map(([front, back]) => {
    const group = createEmptyGroup();
    return {
      ...group,
      front,
      back,
      frontPreview: URL.createObjectURL(front),
      backPreview: URL.createObjectURL(back),
    };
  });
}

/** Slot order: G0 front, G0 back, G1 front, G1 back, … */
export type SlotRef = { groupIndex: number; slot: "front" | "back" };

export function slotRefAfter(
  ref: SlotRef,
  groupCount: number,
): SlotRef | null {
  if (ref.slot === "front") {
    return { groupIndex: ref.groupIndex, slot: "back" };
  }
  if (ref.groupIndex + 1 < groupCount) {
    return { groupIndex: ref.groupIndex + 1, slot: "front" };
  }
  return { groupIndex: groupCount, slot: "front" };
}

export function assignFileToGroup(
  group: ImageGroup,
  slot: "front" | "back",
  file: File,
): ImageGroup {
  const previewKey = slot === "front" ? "frontPreview" : "backPreview";
  const fileKey = slot === "front" ? "front" : "back";
  const oldPreview = group[previewKey];
  if (oldPreview) URL.revokeObjectURL(oldPreview);
  return {
    ...group,
    [fileKey]: file,
    [previewKey]: URL.createObjectURL(file),
  };
}

/** Fill slots from a starting point; creates groups as needed. */
export function spillFilesIntoGroups(
  groups: ImageGroup[],
  startGroupIndex: number,
  startSlot: "front" | "back",
  files: File[],
): ImageGroup[] {
  if (files.length === 0) return groups;

  const next = groups.map((g) => ({ ...g }));
  let ref: SlotRef | null = { groupIndex: startGroupIndex, slot: startSlot };
  let fileIndex = 0;

  while (fileIndex < files.length && ref) {
    while (ref.groupIndex >= next.length) {
      next.push(createEmptyGroup());
    }
    const file = files[fileIndex]!;
    next[ref.groupIndex] = assignFileToGroup(
      next[ref.groupIndex]!,
      ref.slot,
      file,
    );
    fileIndex += 1;
    ref = slotRefAfter(ref, next.length);
    if (fileIndex < files.length && ref && ref.groupIndex >= next.length) {
      next.push(createEmptyGroup());
    }
  }

  return next;
}

export function groupsHaveData(groups: ImageGroup[]): boolean {
  return groups.some((g) => g.front || g.back);
}
