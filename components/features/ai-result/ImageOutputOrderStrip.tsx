"use client";

import React, { useState } from "react";
import Image from "next/image";
import { GripVertical } from "lucide-react";
import type { ProductImage } from "@/lib/map-document-to-product-listing";
import { cn } from "@/lib/utils";

type ImageOutputOrderStripProps = {
  images: ProductImage[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onReorder: (nextImages: ProductImage[]) => void;
};

export function ImageOutputOrderStrip({
  images,
  selectedIndex,
  onSelect,
  onReorder,
}: ImageOutputOrderStripProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

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

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Image order for CSV
          </p>
          <p className="text-[11px] text-slate-500">
            Drag to set Export position (#1 = first in CSV)
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
          {images.length} image{images.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => {
          const isDragging = dragFrom === index;
          const isOver =
            overIndex === index && dragFrom !== null && dragFrom !== index;
          return (
            <div
              key={`${image.url}-${index}`}
              draggable
              onDragStart={(e) => {
                setDragFrom(index);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(index));
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overIndex !== index) setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromRaw = e.dataTransfer.getData("text/plain");
                const from = Number.parseInt(fromRaw, 10);
                setDragFrom(null);
                setOverIndex(null);
                if (Number.isFinite(from)) move(from, index);
              }}
              onClick={() => onSelect(index)}
              className={cn(
                "group relative flex w-[7.5rem] shrink-0 cursor-grab flex-col overflow-hidden rounded-lg border bg-white transition-all active:cursor-grabbing",
                selectedIndex === index
                  ? "border-[#A825C7] ring-2 ring-[#A825C7]/25"
                  : "border-slate-200 hover:border-purple-200",
                isDragging && "opacity-50",
                isOver && "ring-2 ring-purple-300 border-purple-300",
              )}>
              <div className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-white">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="absolute right-1 top-1 z-10 rounded-md bg-[#A825C7] px-1.5 py-0.5 text-[10px] font-bold text-white">
                #{index + 1}
              </div>
              <div className="relative aspect-square w-full bg-slate-100">
                <Image
                  src={image.url}
                  alt={image.label}
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized={
                    image.url.includes("amazonaws.com") ||
                    image.url.startsWith("http://")
                  }
                />
              </div>
              <div className="px-1.5 py-1.5">
                <p className="truncate text-[10px] font-semibold text-slate-700">
                  {image.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
