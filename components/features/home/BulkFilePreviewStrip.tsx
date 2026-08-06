"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import type { PendingFile } from "./bulk-preview-utils";
import { reorderPendingFiles } from "./bulk-preview-utils";

type BulkFilePreviewStripProps = {
  items: PendingFile[];
  getLabel: (index: number) => string;
  onReorder: (items: PendingFile[]) => void;
  onRemove?: (index: number) => void;
  emptyHint?: string;
};

/**
 * Pointer-based reorder (not HTML5 DnD) so multi-row grids + scroll
 * still work with 20–30+ thumbnails.
 */
export function BulkFilePreviewStrip({
  items,
  getLabel,
  onReorder,
  onRemove,
  emptyHint,
}: BulkFilePreviewStripProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const autoScrollRaf = useRef<number | null>(null);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const clearDrag = useCallback(() => {
    dragFromRef.current = null;
    overRef.current = null;
    setDragFrom(null);
    setOverIndex(null);
    if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  }, []);

  const indexFromPoint = useCallback((clientX: number, clientY: number) => {
    const els = itemElsRef.current;
    for (let i = 0; i < els.length; i += 1) {
      const el = els[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return i;
      }
    }
    return null;
  }, []);

  const scrollIfNearEdge = useCallback((clientY: number) => {
    const list = listRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const edge = 48;
    const maxStep = 14;

    let dy = 0;
    if (clientY < rect.top + edge) {
      dy = -maxStep * (1 - Math.max(0, clientY - rect.top) / edge);
    } else if (clientY > rect.bottom - edge) {
      dy = maxStep * (1 - Math.max(0, rect.bottom - clientY) / edge);
    }

    if (dy !== 0) {
      list.scrollTop += dy;
    }
  }, []);

  useEffect(() => {
    if (dragFrom == null) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      scrollIfNearEdge(e.clientY);
      const hit = indexFromPoint(e.clientX, e.clientY);
      if (hit != null && hit !== overRef.current) {
        overRef.current = hit;
        setOverIndex(hit);
      }
    };

    const onUp = (e: PointerEvent) => {
      const from = dragFromRef.current;
      const to = indexFromPoint(e.clientX, e.clientY) ?? overRef.current;
      if (from != null && to != null && from !== to) {
        onReorder(reorderPendingFiles(items, from, to));
      }
      clearDrag();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clearDrag);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", clearDrag);
    };
  }, [
    clearDrag,
    dragFrom,
    indexFromPoint,
    items,
    onReorder,
    scrollIfNearEdge,
  ]);

  if (items.length === 0) {
    if (!emptyHint) return null;
    return (
      <p className="text-xs text-slate-400 text-center py-2">{emptyHint}</p>
    );
  }

  itemElsRef.current = itemElsRef.current.slice(0, items.length);

  const startDrag = (index: number, e: React.PointerEvent) => {
    // Don't start drag from remove button
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    dragFromRef.current = index;
    overRef.current = index;
    setDragFrom(index);
    setOverIndex(index);
  };

  return (
    <div
      className="space-y-2"
      onDragEnter={(e) => e.stopPropagation()}
      onDragOver={(e) => e.stopPropagation()}
      onDrop={(e) => e.stopPropagation()}>
      <p className="text-xs font-medium text-slate-500">
        Drag thumbnails to reorder (works across all rows)
      </p>
      <div
        ref={listRef}
        className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 w-full min-w-0 max-h-[min(420px,50vh)] overflow-y-auto overflow-x-hidden overscroll-contain pr-1 select-none ${
          dragFrom != null ? "touch-none" : ""
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}>
        {items.map((item, index) => {
          const isDragging = dragFrom === index;
          const isOver = overIndex === index && dragFrom !== null && dragFrom !== index;

          return (
            <div
              key={item.id}
              ref={(el) => {
                itemElsRef.current[index] = el;
              }}
              onPointerDown={(e) => startDrag(index, e)}
              className={`relative aspect-[3/4] min-h-0 w-full rounded-xl border-2 overflow-hidden bg-white transition-[box-shadow,opacity,transform] select-none cursor-grab active:cursor-grabbing
                ${isDragging ? "border-[#A825C7] opacity-50 scale-95 z-10" : ""}
                ${isOver ? "border-[#A825C7] ring-2 ring-[#A825C7]/50 scale-[1.03]" : "border-slate-200 hover:border-purple-200"}
              `}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={getLabel(index)}
                draggable={false}
                className="h-full w-full object-cover pointer-events-none"
              />
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-0.5 bg-black/55 px-1 py-0.5">
                <GripVertical className="w-3 h-3 text-white/80 shrink-0 pointer-events-none" />
                <span className="text-[9px] sm:text-[10px] font-bold text-white truncate pointer-events-none">
                  {getLabel(index)}
                </span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="shrink-0 text-white/90 hover:text-white cursor-pointer p-0.5"
                    aria-label="Remove">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="absolute bottom-0.5 right-1 text-[9px] font-semibold text-white drop-shadow-sm pointer-events-none">
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
