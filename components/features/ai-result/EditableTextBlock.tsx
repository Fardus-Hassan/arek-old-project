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
}: EditableTextBlockProps) {
  const readClass =
    variant === "title"
      ? "text-xs sm:text-sm font-semibold text-gray-900"
      : "text-xs sm:text-sm text-gray-700 leading-relaxed";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        {label}
      </label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className={inputClassName}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClassName}
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
