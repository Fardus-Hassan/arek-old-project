"use client";

import { useMemo } from "react";
import { GENDER_OPTIONS, displayFieldValue } from "@/lib/shopify-field-options";
import { displayGenderLabel } from "@/lib/feature-catalog";
import { cn } from "@/lib/utils";

function foldGender(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeGenderKey(value: string): string {
  const t = foldGender(displayFieldValue(value));
  if (!t) return "";
  if (
    t === "women" ||
    t === "woman" ||
    t === "female" ||
    t === "kobiety" ||
    t === "kobieta"
  ) {
    return "female";
  }
  if (
    t === "men" ||
    t === "man" ||
    t === "male" ||
    t === "mezczyzni" ||
    t === "mezczyzna"
  ) {
    return "male";
  }
  if (t === "unisex") return "unisex";
  return t;
}

export function genderValuesMatch(a: string, b: string): boolean {
  const aNorm = normalizeGenderKey(a);
  const bNorm = normalizeGenderKey(b);
  if (!aNorm || !bNorm) return false;
  if (aNorm === bNorm) return true;
  return foldGender(a) === foldGender(b);
}

type GenderRadioOption = {
  value: string;
  label: string;
  isAi?: boolean;
};

function buildGenderRadioOptions(
  options: readonly string[],
  currentValue: string,
): GenderRadioOption[] {
  const result: GenderRadioOption[] = [];
  const seen = new Set<string>();

  const add = (value: string, label: string, isAi = false) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = normalizeGenderKey(trimmed) || foldGender(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ value: trimmed, label, isAi });
  };

  const catalog =
    options.length > 0 ? options : (GENDER_OPTIONS as readonly string[]);
  const committed = displayFieldValue(currentValue);
  const catalogHasMatch =
    committed.length > 0 &&
    catalog.some((opt) => genderValuesMatch(opt, committed));

  if (committed && !catalogHasMatch) {
    add(committed, `${committed} (AI)`, true);
  }

  for (const opt of catalog) {
    add(opt, opt);
  }

  return result;
}

export type GenderRadioFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  /** Admin catalog options for the active option language. */
  options?: readonly string[];
  disabled?: boolean;
  name?: string;
  className?: string;
};

export function GenderRadioField({
  value,
  onChange,
  options = GENDER_OPTIONS,
  disabled = false,
  name = "gender",
  className,
}: GenderRadioFieldProps) {
  const radioOptions = useMemo(
    () => buildGenderRadioOptions(options, value),
    [options, value],
  );

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {radioOptions.map((option) => (
        <label
          key={`${option.value}-${option.isAi ? "ai" : "opt"}`}
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-sm text-gray-900",
            disabled ? "cursor-default opacity-80" : "cursor-pointer",
          )}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={genderValuesMatch(option.value, value)}
            disabled={disabled}
            onChange={() => onChange?.(option.value)}
            className="h-4 w-4 accent-[#A825C7] border-gray-300"
          />
          <span className={option.isAi ? "" : "capitalize"}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function GenderDisplayValue({ value }: { value: string }) {
  const display = displayGenderLabel(value);
  return (
    <p className="text-xs sm:text-sm text-gray-900 capitalize">
      {display || "—"}
    </p>
  );
}
