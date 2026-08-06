"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import type { PendingFile } from "./bulk-preview-utils";
import { swapPendingFiles } from "./bulk-preview-utils";

type BulkFilePreviewStripProps = {
  items: PendingFile[];
  getLabel: (index: number) => string;
  onReorder: (items: PendingFile[]) => void;
  onRemove?: (index: number) => void;
  emptyHint?: string;
  /** Narrow column (Fronts / Backs side-by-side) */
  compact?: boolean;
};

type DragGhost = {
  index: number;
  url: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Multi-row pointer drag: swap two thumbs; floating image follows the cursor.
 */
export function BulkFilePreviewStrip({
  items,
  getLabel,
  onReorder,
  onRemove,
  emptyHint,
  compact = false,
}: BulkFilePreviewStripProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);

  const clearDrag = useCallback(() => {
    dragFromRef.current = null;
    overRef.current = null;
    setDragFrom(null);
    setOverIndex(null);
    setGhost(null);
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
    const edge = 56;
    const maxStep = 16;
    let dy = 0;
    if (clientY < rect.top + edge) {
      dy = -maxStep * (1 - Math.max(0, clientY - rect.top) / edge);
    } else if (clientY > rect.bottom - edge) {
      dy = maxStep * (1 - Math.max(0, rect.bottom - clientY) / edge);
    }
    if (dy !== 0) list.scrollTop += dy;
  }, []);

  useEffect(() => {
    if (dragFrom == null) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      scrollIfNearEdge(e.clientY);
      setGhost((g) =>
        g ? { ...g, x: e.clientX, y: e.clientY } : g,
      );
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
        onReorder(swapPendingFiles(itemsRef.current, from, to));
      }
      clearDrag();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", clearDrag);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", clearDrag);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clearDrag, dragFrom, indexFromPoint, onReorder, scrollIfNearEdge]);

  if (items.length === 0) {
    if (!emptyHint) return null;
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-6 text-center text-xs text-slate-400">
        {emptyHint}
      </p>
    );
  }

  itemElsRef.current = itemElsRef.current.slice(0, items.length);

  const startDrag = (index: number, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();

    const el = itemElsRef.current[index];
    const rect = el?.getBoundingClientRect();
    const item = items[index];
    if (!item) return;

    dragFromRef.current = index;
    overRef.current = index;
    setDragFrom(index);
    setOverIndex(index);
    setGhost({
      index,
      url: item.previewUrl,
      label: getLabel(index),
      x: e.clientX,
      y: e.clientY,
      w: Math.min(rect?.width ?? 120, 140),
      h: Math.min(rect?.height ?? 160, 176),
    });
  };

  // Even column counts so Front+Back pairs stay on the same row (jira / jura).
  const gridClass = compact
    ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5"
    : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3";

  return (
    <div
      className="space-y-2.5"
      onDragEnter={(e) => e.stopPropagation()}
      onDragOver={(e) => e.stopPropagation()}
      onDrop={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">
          {items.length} image{items.length === 1 ? "" : "s"}
        </p>
        <p className="text-[11px] text-slate-400">
          Drag one onto another to swap
          {!compact ? " · pairs stay side by side" : ""}
        </p>
      </div>

      <div
        ref={listRef}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        onWheel={(e) => {
          // Keep wheel scrolling inside this list (Lenis otherwise steals scroll).
          e.stopPropagation();
        }}
        className={`grid w-full min-w-0 max-h-[min(520px,58vh)] overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1.5 select-none ${gridClass} ${
          dragFrom != null ? "touch-none" : ""
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}>
        {items.map((item, index) => {
          const isDragging = dragFrom === index;
          const isOver =
            overIndex === index && dragFrom !== null && dragFrom !== index;
          const label = getLabel(index);

          return (
            <div
              key={item.id}
              ref={(el) => {
                itemElsRef.current[index] = el;
              }}
              onPointerDown={(e) => startDrag(index, e)}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-[box-shadow,opacity,border-color,transform] select-none cursor-grab active:cursor-grabbing
                ${isDragging ? "border-[#A825C7] opacity-40 ring-2 ring-dashed ring-[#A825C7]/40" : ""}
                ${isOver ? "border-[#A825C7] ring-2 ring-[#A825C7]/50 shadow-md scale-[1.02]" : !isDragging ? "border-slate-200/90 hover:border-purple-200 hover:shadow-md" : ""}
              `}>
              {/* Large clear image — no heavy overlay on the photo */}
              <div className="relative aspect-[4/5] w-full bg-gradient-to-b from-slate-50 to-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={label}
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain p-1 pointer-events-none"
                />

                <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/95 px-1.5 text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                  {index + 1}
                </span>

                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Label row under image so photo stays readable */}
              <div className="flex items-center gap-1 border-t border-slate-100 bg-white px-2 py-1.5">
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700 sm:text-xs">
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {ghost ? (
        <div
          className="pointer-events-none fixed z-[9999] overflow-hidden rounded-2xl border-2 border-[#A825C7] bg-white shadow-2xl shadow-purple-900/30"
          style={{
            width: ghost.w,
            height: ghost.h,
            left: ghost.x,
            top: ghost.y,
            transform: "translate(-50%, -55%) rotate(-2deg)",
            opacity: 0.96,
          }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ghost.url}
            alt=""
            className="h-[78%] w-full object-contain bg-slate-50 p-1"
          />
          <div className="flex h-[22%] items-center justify-center border-t border-slate-100 bg-white px-2 text-center text-[11px] font-bold text-slate-800">
            {ghost.label}
          </div>
        </div>
      ) : null}
    </div>
  );
}
