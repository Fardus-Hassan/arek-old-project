"use client";

import React from "react";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";

type Variant = "body" | "title";

type EditableTextBlockProps = {
  label: string;
  editing: boolean;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  variant?: Variant;
  placeholder?: string;
  rows?: number;
  dense?: boolean;
};

export function EditableTextBlock({
  label,
  editing,
  value,
  onChange,
  multiline,
  variant = "body",
  placeholder,
  rows = 4,
  dense = false,
}: EditableTextBlockProps) {
  const readClass =
    variant === "title"
      ? "text-xs sm:text-sm font-semibold text-gray-900"
      : "text-xs sm:text-sm text-gray-700 leading-relaxed";

  const controlClass = dense
    ? cn(
        "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-200",
        multiline
          ? cn(
              "resize-y py-2",
              rows >= 7 ? "min-h-[11rem]" : "min-h-[5.5rem]",
            )
          : "h-9",
      )
    : inputClassName;

  return (
    <div>
      <label
        className={cn(
          "block font-medium text-slate-500",
          dense ? "mb-1 text-xs" : "mb-2 text-xs",
        )}>
        {label}
      </label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className={controlClass}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={controlClass}
          />
        )
      ) : (
        <p className={cn(readClass, multiline && "whitespace-pre-wrap")}>
          {value}
        </p>
      )}
    </div>
  );
}

type EditableInlineProps = {
  label: string;
  editing: boolean;
  value: string;
  onChange: (next: string) => void;
};

/** Matches Product Details / Metafields smaller label style. */
export function EditableInlineField({
  label,
  editing,
  value,
  onChange,
}: EditableInlineProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
      ) : (
        <p className="text-xs sm:text-sm text-gray-900">{value}</p>
      )}
    </div>
  );
}
