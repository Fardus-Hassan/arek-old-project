"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Shirt, Trash2, Upload, X } from "lucide-react";
import type { GroupSlot, ImageGroup } from "./image-group-types";
import { IMAGE_ACCEPT } from "./image-group-types";

type DragPayload = { groupId: string; slot: GroupSlot };

const INTERNAL_DRAG = "application/x-group-slot";

function isInternalDrag(dt: DataTransfer): boolean {
  const types = Array.from(dt.types);
  return (
    types.includes(INTERNAL_DRAG) ||
    (types.includes("application/json") && !types.includes("Files"))
  );
}

async function filesFromExternalDrop(dt: DataTransfer): Promise<File[]> {
  if (dt.files?.length) {
    return Array.from(dt.files).filter((f) => f.type.startsWith("image/"));
  }

  for (const item of Array.from(dt.items)) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f?.type.startsWith("image/")) return [f];
    }
  }

  const uri =
    dt
      .getData("text/uri-list")
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s && !s.startsWith("#") && /^https?:\/\//i.test(s)) ??
    (() => {
      const plain = dt.getData("text/plain").trim();
      return /^https?:\/\/.+/i.test(plain) ? plain : "";
    })();

  if (!uri) return [];

  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return [];
    const ext = blob.type.split("/")[1] || "jpg";
    const name =
      uri.split("/").pop()?.split("?")[0] || `dropped-image.${ext}`;
    return [new File([blob], name, { type: blob.type })];
  } catch {
    return [];
  }
}

type ImageGroupCardProps = {
  group: ImageGroup;
  index: number;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSlotFile: (slot: GroupSlot, file: File) => void;
  onSlotFiles: (slot: GroupSlot, files: File[]) => void;
  onClearSlot: (slot: GroupSlot) => void;
  onSwapSlots: () => void;
};

function SlotDropzone({
  slot,
  label,
  groupId,
  file,
  previewUrl,
  onFile,
  onFiles,
  onClear,
  onSwap,
}: {
  slot: GroupSlot;
  label: string;
  groupId: string;
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File) => void;
  onFiles: (files: File[]) => void;
  onClear: () => void;
  onSwap: () => void;
}) {
  const onDropFiles = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      if (acceptedFiles.length === 1) {
        onFile(acceptedFiles[0]!);
        return;
      }
      onFiles(acceptedFiles);
    },
    [onFile, onFiles],
  );

  const tryInternalSwap = useCallback(
    (event: DragEvent | React.DragEvent | Event) => {
      const dt = "dataTransfer" in event ? event.dataTransfer : null;
      if (!dt) return false;
      const raw =
        dt.getData(INTERNAL_DRAG) || dt.getData("application/json");
      if (!raw) return false;
      try {
        const payload = JSON.parse(raw) as DragPayload;
        if (payload.groupId !== groupId) return false;
        if (payload.slot === slot) return false;
        onSwap();
        return true;
      } catch {
        return false;
      }
    },
    [groupId, onSwap, slot],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles, _rejections, event) => {
      void (async () => {
        if (event && "dataTransfer" in event && tryInternalSwap(event)) return;

        if (acceptedFiles.length > 0) {
          onDropFiles(acceptedFiles);
          return;
        }

        if (event && "dataTransfer" in event && event.dataTransfer) {
          const external = await filesFromExternalDrop(event.dataTransfer);
          if (external.length > 0) onDropFiles(external);
        }
      })();
    },
    accept: IMAGE_ACCEPT,
    multiple: true,
    noClick: Boolean(previewUrl),
    noKeyboard: true,
  });

  const { onDragOver, onDrop, ...rootProps } = getRootProps();

  const handleDragStart = (e: React.DragEvent) => {
    if (!previewUrl) return;
    e.stopPropagation();
    const payload: DragPayload = { groupId, slot };
    const encoded = JSON.stringify(payload);
    e.dataTransfer.setData(INTERNAL_DRAG, encoded);
    e.dataTransfer.setData("application/json", encoded);
    e.dataTransfer.setData("text/plain", encoded);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver?.(e as React.DragEvent<HTMLElement>);
    if (isInternalDrag(e.dataTransfer)) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (tryInternalSwap(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onDrop?.(e as React.DragEvent<HTMLElement>);
  };

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/jpg,image/webp";
    input.multiple = true;
    input.onchange = (e) => {
      const list = (e.target as HTMLInputElement).files;
      if (!list?.length) return;
      const files = Array.from(list);
      if (files.length === 1) onFile(files[0]!);
      else onFiles(files);
    };
    input.click();
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <Shirt className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-[#A825C7] bg-[#F9F1FB] px-2 py-0.5 rounded-full">
          Required
        </span>
      </div>

      <div
        {...rootProps}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative min-h-[160px] sm:min-h-[180px] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
          ${isDragActive ? "border-[#E5BEEE] bg-[#F9F1FB]" : "border-purple-100 bg-white hover:border-purple-200"}
          ${previewUrl ? "" : "cursor-pointer"}
        `}>
        <input {...getInputProps()} />

        {previewUrl ? (
          <div
            className="absolute inset-0 group cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={handleDragStart}
            onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`${label} preview`}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/60 text-white p-1 hover:bg-black/80"
              aria-label={`Remove ${label} image`}>
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="absolute bottom-2 left-2 z-10 rounded-lg bg-white/90 text-xs font-semibold text-slate-700 px-2 py-1 shadow hover:bg-white">
              Replace
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[160px] sm:min-h-[180px] p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#F9F1FB] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-[#A825C7]" />
            </div>
            <p className="text-slate-900 font-bold text-xs sm:text-sm mb-1">
              Drop image here or click to{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
                className="text-[#A825C7] underline underline-offset-2">
                browse
              </button>
            </p>
            <p className="text-slate-400 font-medium text-[10px] sm:text-xs">
              JPG, PNG or WebP
            </p>
            {file && !previewUrl && (
              <p className="text-slate-500 text-xs mt-2 truncate max-w-full">
                {file.name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageGroupCard({
  group,
  index,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  onSlotFile,
  onSlotFiles,
  onClearSlot,
  onSwapSlots,
}: ImageGroupCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-2xl border-2 bg-white p-4 sm:p-5 transition-all cursor-pointer
        ${isActive ? "border-[#A825C7] ring-2 ring-[#A825C7]/20 shadow-md" : "border-slate-200 hover:border-purple-200"}
      `}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900">
          Group {index + 1}
        </h3>
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
            aria-label={`Delete group ${index + 1}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <SlotDropzone
          slot="front"
          label="Front"
          groupId={group.id}
          file={group.front}
          previewUrl={group.frontPreview}
          onFile={(file) => onSlotFile("front", file)}
          onFiles={(files) => onSlotFiles("front", files)}
          onClear={() => onClearSlot("front")}
          onSwap={onSwapSlots}
        />
        <SlotDropzone
          slot="back"
          label="Back"
          groupId={group.id}
          file={group.back}
          previewUrl={group.backPreview}
          onFile={(file) => onSlotFile("back", file)}
          onFiles={(files) => onSlotFiles("back", files)}
          onClear={() => onClearSlot("back")}
          onSwap={onSwapSlots}
        />
      </div>

      {isActive && (
        <p className="mt-3 text-xs text-[#A825C7] font-medium">
          Selected — feature options below apply to this group
        </p>
      )}
    </div>
  );
}
