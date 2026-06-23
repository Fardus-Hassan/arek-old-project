"use client";

import { GENDER_OPTIONS, displayFieldValue } from "@/lib/shopify-field-options";
import { cn } from "@/lib/utils";

function foldGender(value: string): string {
  return value.trim().toLowerCase();
}

function genderOptionForValue(value: string): string {
  const t = foldGender(displayFieldValue(value));
  if (!t) return "";
  for (const opt of GENDER_OPTIONS) {
    if (foldGender(opt) === t) return opt;
  }
  if (t === "women" || t === "woman" || t === "female") return "female";
  if (t === "men" || t === "man" || t === "male") return "male";
  return t;
}

export type GenderRadioFieldProps = {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
};

export function GenderRadioField({
  value,
  onChange,
  disabled = false,
  name = "gender",
  className,
}: GenderRadioFieldProps) {
  const selected = genderOptionForValue(value);

  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {GENDER_OPTIONS.map((option) => (
        <label
          key={option}
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-sm text-gray-900",
            disabled ? "cursor-default opacity-80" : "cursor-pointer",
          )}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={selected === option}
            disabled={disabled}
            onChange={() => onChange?.(option)}
            className="h-4 w-4 accent-[#A825C7] border-gray-300"
          />
          <span className="capitalize">{option}</span>
        </label>
      ))}
    </div>
  );
}

export function GenderDisplayValue({ value }: { value: string }) {
  const display = genderOptionForValue(value);
  return (
    <p className="text-xs sm:text-sm text-gray-900 capitalize">
      {display || "—"}
    </p>
  );
}
