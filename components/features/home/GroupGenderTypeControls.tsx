"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { GroupGender, GroupType } from "./image-group-types";
import { GROUP_GENDERS, GROUP_TYPES } from "./image-group-types";

type GroupGenderTypeControlsProps = {
  gender: GroupGender;
  type: GroupType;
  onGenderChange: (gender: GroupGender) => void;
  onTypeChange: (type: GroupType) => void;
  /** Compact chips for sticky bar; default for group card */
  size?: "sm" | "md";
  className?: string;
  genderAriaLabel?: string;
  typeAriaLabel?: string;
};

function chipClass(selected: boolean, size: "sm" | "md") {
  return cn(
    "rounded-lg border font-semibold capitalize transition-all whitespace-nowrap",
    size === "sm"
      ? "px-2 py-1 text-[10px] sm:text-[11px]"
      : "px-2.5 py-1.5 text-[11px] sm:text-xs",
    selected
      ? "border-[#A825C7] bg-[#F9F1FB] text-[#A825C7] shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-slate-900",
  );
}

function fieldLabelClass(size: "sm" | "md") {
  return cn(
    "font-bold uppercase tracking-wide text-slate-500 shrink-0",
    size === "sm" ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]",
  );
}

export function GroupGenderTypeControls({
  gender,
  type,
  onGenderChange,
  onTypeChange,
  size = "md",
  className,
  genderAriaLabel = "Gender",
  typeAriaLabel = "Type",
}: GroupGenderTypeControlsProps) {
  const uid = React.useId();
  const genderLabelId = `${uid}-gender`;
  const typeLabelId = `${uid}-type`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        className,
      )}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className={fieldLabelClass(size)} id={genderLabelId}>
          Gender
        </span>
        <div
          role="radiogroup"
          aria-labelledby={genderLabelId}
          aria-label={genderAriaLabel}
          className="flex items-center gap-1">
          {GROUP_GENDERS.map((g) => {
            const selected = gender === g;
            return (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onGenderChange(g)}
                className={chipClass(selected, size)}>
                {g}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="hidden h-5 w-px bg-slate-200 sm:block"
        aria-hidden
      />

      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className={fieldLabelClass(size)} id={typeLabelId}>
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby={typeLabelId}
          aria-label={typeAriaLabel}
          className="flex flex-wrap items-center gap-1">
          {GROUP_TYPES.map((t) => {
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onTypeChange(t)}
                className={chipClass(selected, size)}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
