"use client";

import React from "react";
import { CheckCircle2, ExternalLink, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShopifyProductDisplay } from "@/lib/shopify-upload-display";
import {
  statusLabel,
  type ShopifyUserStatus,
} from "@/lib/shopify-upload-display";

export function ShopifyStatusPill({
  status,
  onClick,
  className,
  size = "md",
}: {
  status: ShopifyUserStatus;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const clickable = Boolean(onClick);
  const label = statusLabel(status);

  const styles =
    status === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80 hover:ring-emerald-300"
      : status === "failed"
        ? "bg-rose-50 text-rose-700 ring-rose-200/80 hover:ring-rose-300"
        : status === "partial"
          ? "bg-amber-50 text-amber-800 ring-amber-200/80 hover:ring-amber-300"
          : "bg-slate-100 text-slate-600 ring-slate-200/80";

  const Icon =
    status === "success"
      ? CheckCircle2
      : status === "failed"
        ? XCircle
        : status === "partial"
          ? AlertTriangle
          : null;

  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";

  const cls = cn(
    "inline-flex items-center gap-1 rounded-full font-semibold ring-1 transition-colors",
    pad,
    styles,
    clickable && "cursor-pointer",
    !clickable && status === "none" && "cursor-default",
    className,
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={cls} title={label}>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        {label}
      </button>
    );
  }

  return (
    <span className={cls} title={label}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      {label}
    </span>
  );
}

/** Plain-language product upload outcome card */
export function ShopifyProductFriendlyCard({
  product,
  when,
  className,
}: {
  product: ShopifyProductDisplay;
  when?: string;
  className?: string;
}) {
  const failedFields = product.metafieldRows.filter((r) => !r.ok);
  const okFieldsPreview = product.metafieldRows.filter((r) => r.ok).slice(0, 4);

  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        product.status === "success"
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-rose-200 bg-rose-50/30",
        className,
      )}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <ShopifyStatusPill
            status={product.status === "success" ? "success" : "failed"}
            size="sm"
          />
          <h3 className="text-base font-semibold text-slate-900">
            {product.title}
          </h3>
          {when ? (
            <p className="text-xs text-slate-500">Uploaded {when}</p>
          ) : null}
        </div>
        {product.adminUrl ? (
          <a
            href={product.adminUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#A825C7] ring-1 ring-slate-200 hover:bg-purple-50">
            Open in Shopify
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        {product.shopifyProductId ? (
          <Row label="Shopify product" value={`#${product.shopifyProductId}`} />
        ) : null}
        {product.handle ? (
          <Row label="Product handle" value={product.handle} />
        ) : null}

        {product.errorMessage ? (
          <div className="rounded-lg border border-rose-200 bg-white/80 px-3 py-2">
            <p className="text-xs font-semibold text-rose-700">What went wrong</p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {product.errorMessage}
            </p>
          </div>
        ) : null}

        {product.publishOk !== undefined ? (
          <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-xs font-semibold text-slate-600">Store visibility</p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                product.publishOk ? "text-emerald-700" : "text-rose-700",
              )}>
              {product.publishOk
                ? "Product is published / visible on the store"
                : "Product was not published"}
            </p>
            {product.publishMessage ? (
              <p className="mt-1 text-xs text-slate-600">{product.publishMessage}</p>
            ) : null}
          </div>
        ) : null}

        {(product.metafieldOk > 0 || product.metafieldFail > 0) && (
          <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-xs font-semibold text-slate-600">
              Extra product details
            </p>
            <p className="mt-1 text-sm text-slate-800">
              {product.metafieldFail === 0 ? (
                <>
                  All {product.metafieldOk} detail
                  {product.metafieldOk === 1 ? "" : "s"} saved correctly.
                </>
              ) : (
                <>
                  {product.metafieldOk} saved ·{" "}
                  <span className="font-semibold text-rose-700">
                    {product.metafieldFail} need attention
                  </span>
                </>
              )}
            </p>

            {failedFields.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {failedFields.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex gap-2 text-xs text-rose-800">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      <span className="font-semibold">{f.name}</span>
                      {f.detail ? (
                        <span className="text-rose-700"> — {f.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {failedFields.length === 0 && okFieldsPreview.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Including:{" "}
                {okFieldsPreview.map((f) => f.name).join(", ")}
                {product.metafieldOk > okFieldsPreview.length
                  ? ` and ${product.metafieldOk - okFieldsPreview.length} more`
                  : ""}
              </p>
            ) : null}
          </div>
        )}

        {product.skippedCount > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
            <p className="text-xs font-semibold text-amber-900">
              Skipped details ({product.skippedCount})
            </p>
            <p className="mt-1 text-xs text-amber-900/90">
              {product.skippedLabels.slice(0, 8).join(" · ")}
              {product.skippedLabels.length > 8
                ? ` · +${product.skippedLabels.length - 8} more`
                : ""}
            </p>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 break-all">{value}</dd>
    </div>
  );
}
