"use client";

import React, { useState } from "react";
import Image from "next/image";
import { GripVertical, X } from "lucide-react";
import type { ProductImage } from "@/lib/map-document-to-product-listing";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "./ImageLightbox";

type ImageOutputOrderStripProps = {
  images: ProductImage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onReorder: (nextImages: ProductImage[]) => void;
  /** Remove image from listing/CSV (edit mode). */
  onRemove?: (index: number) => void;
  /** Allow drag-reorder + delete (edit mode only). */
  canReorder?: boolean;
  /** Compact denser strip for single-screen editor */
  dense?: boolean;
  /** Stretch cards across a full-width grid */
  fillRow?: boolean;
  /** Open large preview on click (default true) */
  enableLightbox?: boolean;
};

export function ImageOutputOrderStrip({
  images,
  selectedIndex,
  onSelect,
  onReorder,
  onRemove,
  canReorder = true,
  dense = false,
  fillRow = false,
  enableLightbox = true,
}: ImageOutputOrderStripProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dragEnabled = canReorder;

  if (images.length === 0) return null;

  const move = (from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= images.length ||
      to >= images.length
    ) {
      return;
    }
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  };

  const lightboxImage =
    lightboxIndex != null ? (images[lightboxIndex] ?? null) : null;

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-white",
          dense || fillRow ? "px-3 py-3" : "mb-4 px-3 py-3 shadow-sm",
        )}>
        {!dense && !fillRow && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Image order for CSV
              </p>
              <p className="text-[11px] text-slate-500">
                {dragEnabled
                  ? "Drag handle to reorder · Click image to enlarge"
                  : "Click image to enlarge"}
              </p>
            </div>
            <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
              {images.length} image{images.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div
          className={cn(
            // Always reserve a 6-slot row so 2–3 images stay compact (not huge).
            fillRow
              ? "grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
              : "flex gap-3 overflow-x-auto pb-0.5",
            dense && !fillRow && "justify-start",
          )}>
          {images.map((image, index) => {
            const isDragging = dragFrom === index;
            const isOver =
              overIndex === index && dragFrom !== null && dragFrom !== index;
            return (
              <div
                key={`${image.url}-${index}`}
                onDragOver={
                  dragEnabled
                    ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (overIndex !== index) setOverIndex(index);
                      }
                    : undefined
                }
                onDrop={
                  dragEnabled
                    ? (e) => {
                        e.preventDefault();
                        const fromRaw = e.dataTransfer.getData("text/plain");
                        const from = Number.parseInt(fromRaw, 10);
                        setDragFrom(null);
                        setOverIndex(null);
                        if (Number.isFinite(from)) move(from, index);
                      }
                    : undefined
                }
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-white transition-all",
                  fillRow ? "min-w-0 w-full" : "shrink-0",
                  !fillRow && (dense ? "w-[8.5rem]" : "w-[7.5rem]"),
                  selectedIndex === index
                    ? "border-[#A825C7] shadow-sm"
                    : "border-slate-200 hover:border-purple-200",
                  isDragging && "opacity-50",
                  isOver && "border-purple-300 ring-2 ring-purple-300",
                )}>
                {dragEnabled ? (
                  <button
                    type="button"
                    draggable
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDragFrom(index);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragEnd={() => {
                      setDragFrom(null);
                      setOverIndex(null);
                    }}
                    className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 cursor-grab items-center justify-center rounded bg-black/50 text-white hover:bg-black/70 active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/35 text-white/70">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                )}

                <div className="absolute right-1.5 top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#A825C7] px-1.5 text-[10px] font-bold text-white">
                  #{index + 1}
                </div>

                <div className="relative w-full bg-slate-100">
                  <button
                    type="button"
                    className="relative block w-full cursor-zoom-in text-left"
                    onClick={() => {
                      onSelect(index);
                      if (enableLightbox) setLightboxIndex(index);
                    }}>
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={image.url}
                        alt={image.label}
                        fill
                        className="object-cover"
                        sizes={
                          fillRow ? "(max-width: 1024px) 33vw, 16vw" : "140px"
                        }
                        unoptimized={
                          image.url.includes("amazonaws.com") ||
                          image.url.startsWith("http://")
                        }
                      />
                    </div>
                  </button>

                  {dragEnabled && onRemove ? (
                    <button
                      type="button"
                      title="Remove from listing / CSV"
                      aria-label="Remove image"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      className="absolute bottom-1.5 right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600">
                      <X className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 px-1.5 py-1.5 text-center">
                  <p className="truncate text-[11px] font-medium text-slate-700 sm:text-xs">
                    {image.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ImageLightbox
        open={lightboxIndex != null}
        image={lightboxImage}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
