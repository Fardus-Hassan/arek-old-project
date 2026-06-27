"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Layers, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  buildGroupsFromPairs,
  sortFilesByName,
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
  type PendingFile,
} from "./bulk-preview-utils";

type BulkUploadSectionProps = {
  onApply: (groups: ImageGroup[]) => void;
};

function mergePending(existing: PendingFile[], incoming: File[]): PendingFile[] {
  return [...existing, ...filesToPending(sortFilesByName(incoming))];
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
    setPendingAlternating((prev) => mergePending(prev, acceptedFiles));
  }, []);

  const onDualFrontDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingFronts((prev) => mergePending(prev, acceptedFiles));
  }, []);

  const onDualBackDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setPendingBacks((prev) => mergePending(prev, acceptedFiles));
  }, []);

  const alternatingDropzone = useDropzone({
    onDrop: onAlternatingDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
  });

  const dualFrontDropzone = useDropzone({
    onDrop: onDualFrontDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
  });

  const dualBackDropzone = useDropzone({
    onDrop: onDualBackDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    noKeyboard: true,
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
            className={`min-h-[100px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-5 text-center
              ${alternatingDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-purple-100 hover:border-purple-200 bg-[#fafafa]"}
            `}>
            <input {...alternatingDropzone.getInputProps()} />
            <Upload className="w-7 h-7 text-[#A825C7] mb-2" />
            <p className="text-slate-900 font-bold text-sm mb-1">
              Drop all images at once
            </p>
            <p className="text-slate-500 text-xs max-w-md">
              Order: Front, Back, Front, Back… — preview below, drag to fix
              order
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
          <div className="flex flex-col sm:flex-row gap-3 min-w-0">
            <div className="flex-1 min-w-0 space-y-3">
              <div
                {...dualFrontDropzone.getRootProps()}
                className={`min-h-[90px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center
                  ${dualFrontDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-purple-100 hover:border-purple-200 bg-[#fafafa]"}
                `}>
                <input {...dualFrontDropzone.getInputProps()} />
                <p className="text-slate-900 font-bold text-sm mb-1">
                  All Front images
                </p>
                <p className="text-slate-500 text-xs">Drop or browse multiple</p>
              </div>
              <BulkFilePreviewStrip
                items={pendingFronts}
                getLabel={(i) => dualSlotLabel(i, "front")}
                onReorder={setPendingFronts}
                onRemove={removeFront}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div
                {...dualBackDropzone.getRootProps()}
                className={`min-h-[90px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center
                  ${dualBackDropzone.isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : pendingFronts.length > 0 ? "border-[#A825C7]/40 bg-[#F9F1FB]/40" : "border-purple-100 hover:border-purple-200 bg-[#fafafa]"}
                `}>
                <input {...dualBackDropzone.getInputProps()} />
                <p className="text-slate-900 font-bold text-sm mb-1">
                  All Back images
                </p>
                <p className="text-slate-500 text-xs">Same count as Fronts</p>
              </div>
              <BulkFilePreviewStrip
                items={pendingBacks}
                getLabel={(i) => dualSlotLabel(i, "back")}
                onReorder={setPendingBacks}
                onRemove={removeBack}
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
