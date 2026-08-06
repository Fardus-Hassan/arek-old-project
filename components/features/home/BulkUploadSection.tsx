"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Layers, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  buildGroupsFromPairs,
  type BulkUploadMode,
} from "./bulk-group-upload";
import type { ImageGroup } from "./image-group-types";
import { IMAGE_ACCEPT } from "./image-group-types";
import { BulkFilePreviewStrip } from "./BulkFilePreviewStrip";
import {
  alternatingSlotLabel,
  dualSlotLabel,
  filesToPending,
  pairAlternatingInOrder,
  pairDualInOrder,
  pendingToFiles,
  revokePendingFiles,
  stabilizeAlternatingFileOrder,
  type PendingFile,
} from "./bulk-preview-utils";
import { pickImageFilesPreferSelectionOrder } from "./pick-image-files";

type BulkUploadSectionProps = {
  onApply: (groups: ImageGroup[]) => void;
};

/**
 * Append files.
 * - selectionOrderReliable: keep exact browser order (no front/back name shuffle)
 * - otherwise: alternating may pair-fix by filename (browser often sends A–Z)
 */
function mergePending(
  existing: PendingFile[],
  incoming: File[],
  mode: BulkUploadMode,
  selectionOrderReliable = false,
): PendingFile[] {
  const ordered =
    mode === "alternating" && !selectionOrderReliable
      ? stabilizeAlternatingFileOrder(incoming)
      : incoming;
  return [...existing, ...filesToPending(ordered)];
}

export function BulkUploadSection({
  onApply,
}: BulkUploadSectionProps) {
  const [mode, setMode] = useState<BulkUploadMode>("alternating");
  const [pendingAlternating, setPendingAlternating] = useState<PendingFile[]>(
    [],
  );
  const [pendingFronts, setPendingFronts] = useState<PendingFile[]>([]);
  const [pendingBacks, setPendingBacks] = useState<PendingFile[]>([]);

  const pendingRef = useRef({
    alternating: pendingAlternating,
    fronts: pendingFronts,
    backs: pendingBacks,
  });
  pendingRef.current = {
    alternating: pendingAlternating,
    fronts: pendingFronts,
    backs: pendingBacks,
  };

  useEffect(() => {
    return () => {
      revokePendingFiles(pendingRef.current.alternating);
      revokePendingFiles(pendingRef.current.fronts);
      revokePendingFiles(pendingRef.current.backs);
    };
  }, []);

  const clearPending = useCallback((target: BulkUploadMode) => {
    if (target === "alternating") {
      setPendingAlternating((prev) => {
        revokePendingFiles(prev);
        return [];
      });
    } else {
      setPendingFronts((prev) => {
        revokePendingFiles(prev);
        return [];
      });
      setPendingBacks((prev) => {
        revokePendingFiles(prev);
        return [];
      });
    }
  }, []);

  const switchMode = (next: BulkUploadMode) => {
    if (next === mode) return;
    clearPending(mode);
    setMode(next);
  };

  const applyPairs = useCallback(
    (pairs: [File, File][]) => {
      const newGroups = buildGroupsFromPairs(pairs);
      onApply(newGroups);
      toast.success(
        `${newGroups.length} group${newGroups.length !== 1 ? "s" : ""} added from ${pairs.length * 2} images`,
      );
      clearPending(mode);
    },
    [clearPending, mode, onApply],
  );

  const handleApplyAlternating = () => {
    const result = pairAlternatingInOrder(pendingToFiles(pendingAlternating));
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    applyPairs(result.pairs);
  };

  const handleApplyDual = () => {
    const result = pairDualInOrder(
      pendingToFiles(pendingFronts),
      pendingToFiles(pendingBacks),
    );
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    applyPairs(result.pairs);
  };

  const removeAlternating = (index: number) => {
    setPendingAlternating((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeFront = (index: number) => {
    setPendingFronts((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeBack = (index: number) => {
    setPendingBacks((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const onAlternatingDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    // Drag order ≈ folder list order; still may be A–Z — stabilize pairs by name.
    setPendingAlternating((prev) =>
      mergePending(prev, acceptedFiles, "alternating", false),
    );
  }, []);

  const onDualFrontDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingFronts((prev) =>
      mergePending(prev, acceptedFiles, "dual", false),
    );
  }, []);

  const onDualBackDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingBacks((prev) =>
      mergePending(prev, acceptedFiles, "dual", false),
    );
  }, []);

  const browseAndAppend = useCallback(
    async (target: "alternating" | "fronts" | "backs") => {
      const picked = await pickImageFilesPreferSelectionOrder();
      if (!picked?.files.length) return;
      const { files, selectionOrderReliable } = picked;
      if (target === "alternating") {
        setPendingAlternating((prev) =>
          mergePending(prev, files, "alternating", selectionOrderReliable),
        );
      } else if (target === "fronts") {
        setPendingFronts((prev) =>
          mergePending(prev, files, "dual", selectionOrderReliable),
        );
      } else {
        setPendingBacks((prev) =>
          mergePending(prev, files, "dual", selectionOrderReliable),
        );
      }
      if (selectionOrderReliable) {
        toast.success(
          `${files.length} image${files.length === 1 ? "" : "s"} added in selection order`,
        );
      }
    },
    [],
  );

  const alternatingDropzone = useDropzone({
    onDrop: onAlternatingDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
    noClick: true,
  });

  const dualFrontDropzone = useDropzone({
    onDrop: onDualFrontDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
    noClick: true,
  });

  const dualBackDropzone = useDropzone({
    onDrop: onDualBackDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
    noClick: true,
  });

  const alternatingReady =
    pendingAlternating.length > 0 && pendingAlternating.length % 2 === 0;
  const dualReady =
    pendingFronts.length > 0 &&
    pendingFronts.length === pendingBacks.length;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#A825C7]" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Bulk upload
          </h3>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => switchMode("alternating")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors
              ${mode === "alternating" ? "bg-white text-[#A825C7] shadow-sm" : "text-slate-600 hover:text-slate-900"}
            `}>
            Alternating
          </button>
          <button
            type="button"
            onClick={() => switchMode("dual")}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors
              ${mode === "dual" ? "bg-white text-[#A825C7] shadow-sm" : "text-slate-600 hover:text-slate-900"}
            `}>
            Fronts + Backs
          </button>
        </div>
      </div>

      {mode === "alternating" ? (
        <div className="space-y-4">
          <div
            {...alternatingDropzone.getRootProps()}
            onClick={() => void browseAndAppend("alternating")}
            className={`min-h-[100px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-5 text-center
              ${alternatingDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-purple-100 hover:border-purple-200 bg-[#fafafa]"}
            `}>
            <input {...alternatingDropzone.getInputProps()} />
            <Upload className="w-7 h-7 text-[#A825C7] mb-2" />
            <p className="text-slate-900 font-bold text-sm mb-1">
              Drop or click to browse
            </p>
            <p className="text-slate-500 text-xs max-w-md">
              Order: Front, Back, Front, Back… Browse uses selection order where
              the browser allows (Chrome/Edge). Drag to swap if needed.
            </p>
          </div>

          <BulkFilePreviewStrip
            items={pendingAlternating}
            getLabel={alternatingSlotLabel}
            onReorder={setPendingAlternating}
            onRemove={removeAlternating}
            emptyHint="No images yet — drop files above"
          />

          {pendingAlternating.length > 0 &&
            pendingAlternating.length % 2 !== 0 && (
              <p className="text-xs text-amber-600 font-medium text-center">
                Add one more image for an even count (Front + Back pairs)
              </p>
            )}

          {alternatingReady && (
            <button
              type="button"
              onClick={handleApplyAlternating}
              className="w-full py-2.5 rounded-xl bg-[#AD34DD] text-white text-sm font-bold hover:bg-[#9629BF] transition-colors">
              Apply {pendingAlternating.length / 2} group
              {pendingAlternating.length / 2 !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
            <div className="min-w-0 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
              <div
                {...dualFrontDropzone.getRootProps()}
                onClick={() => void browseAndAppend("fronts")}
                className={`min-h-[88px] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center
                  ${dualFrontDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-slate-200 bg-white hover:border-purple-200"}
                `}>
                <input {...dualFrontDropzone.getInputProps()} />
                <p className="text-slate-900 font-bold text-sm mb-0.5">
                  All Front images
                </p>
                <p className="text-slate-500 text-xs">
                  Drop or click to browse (selection order)
                </p>
              </div>
              <BulkFilePreviewStrip
                items={pendingFronts}
                getLabel={(i) => dualSlotLabel(i, "front")}
                onReorder={setPendingFronts}
                onRemove={removeFront}
                compact
              />
            </div>
            <div className="min-w-0 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
              <div
                {...dualBackDropzone.getRootProps()}
                onClick={() => void browseAndAppend("backs")}
                className={`min-h-[88px] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center
                  ${dualBackDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : pendingFronts.length > 0 ? "border-[#A825C7]/35 bg-white" : "border-slate-200 bg-white hover:border-purple-200"}
                `}>
                <input {...dualBackDropzone.getInputProps()} />
                <p className="text-slate-900 font-bold text-sm mb-0.5">
                  All Back images
                </p>
                <p className="text-slate-500 text-xs">
                  Same count · drop or click (selection order)
                </p>
              </div>
              <BulkFilePreviewStrip
                items={pendingBacks}
                getLabel={(i) => dualSlotLabel(i, "back")}
                onReorder={setPendingBacks}
                onRemove={removeBack}
                compact
              />
            </div>
          </div>

          {pendingFronts.length > 0 &&
            pendingBacks.length > 0 &&
            pendingFronts.length !== pendingBacks.length && (
              <p className="text-xs text-amber-600 font-medium text-center">
                Front ({pendingFronts.length}) and Back ({pendingBacks.length})
                counts must match — drag to reorder or remove extras
              </p>
            )}

          {dualReady && (
            <button
              type="button"
              onClick={handleApplyDual}
              className="w-full py-2.5 rounded-xl bg-[#AD34DD] text-white text-sm font-bold hover:bg-[#9629BF] transition-colors">
              Apply {pendingFronts.length} group
              {pendingFronts.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
