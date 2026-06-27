"use client";

import React, { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import type { PendingFile } from "./bulk-preview-utils";
import { swapPendingFiles } from "./bulk-preview-utils";

const DRAG_TYPE = "application/x-bulk-preview-index";

type BulkFilePreviewStripProps = {
  items: PendingFile[];
  getLabel: (index: number) => string;
  onReorder: (items: PendingFile[]) => void;
  onRemove?: (index: number) => void;
  emptyHint?: string;
};

export function BulkFilePreviewStrip({
  items,
  getLabel,
  onReorder,
  onRemove,
  emptyHint,
}: BulkFilePreviewStripProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  if (items.length === 0) {
    if (!emptyHint) return null;
    return (
      <p className="text-xs text-slate-400 text-center py-2">{emptyHint}</p>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(DRAG_TYPE, String(index));
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      dragIndexRef.current = null;
      return;
    }
    onReorder(swapPendingFiles(items, fromIndex, toIndex));
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">
        Drag a thumbnail onto another to swap positions
      </p>
      <div className="flex flex-wrap gap-2 w-full min-w-0 max-h-[280px] overflow-y-auto overflow-x-hidden pr-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative w-[4.5rem] sm:w-24 shrink-0 rounded-xl border-2 overflow-hidden bg-white transition-all select-none
              ${dragIndex === index ? "border-[#A825C7] opacity-60 scale-95" : ""}
              ${overIndex === index ? "border-[#A825C7] ring-2 ring-[#A825C7]/40 scale-105" : "border-slate-200 hover:border-purple-200"}
            `}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.previewUrl}
              alt={getLabel(index)}
              draggable={false}
              className="w-full h-16 sm:h-20 object-cover pointer-events-none"
            />
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-0.5 bg-black/55 px-1 py-0.5 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3 text-white/80 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-bold text-white truncate">
                {getLabel(index)}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  className="shrink-0 text-white/90 hover:text-white cursor-pointer"
                  aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
