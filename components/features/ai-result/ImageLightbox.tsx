"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductImage } from "@/lib/map-document-to-product-listing";

type ImageLightboxProps = {
  open: boolean;
  image: ProductImage | null;
  onClose: () => void;
};

export function ImageLightbox({ open, image, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-[min(42rem,94vw)] gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-xl"
        aria-describedby={undefined}>
        <DialogTitle className="sr-only">
          {image?.label ?? "Image preview"}
        </DialogTitle>
        {image?.url ? (
          <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(72vh,36rem)] bg-slate-100">
            <Image
              src={image.url}
              alt={image.label}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 94vw, 42rem"
              unoptimized={
                image.url.includes("amazonaws.com") ||
                image.url.startsWith("http://")
              }
              priority
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
          <p className="truncate text-sm font-medium text-slate-800">
            {image?.label || "Image"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
