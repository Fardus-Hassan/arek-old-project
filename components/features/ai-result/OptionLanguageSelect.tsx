"use client";

import type { OutputLanguage } from "@/lib/feature-catalog";
import { cn } from "@/lib/utils";

type OptionLanguageSelectProps = {
  value: OutputLanguage;
  onChange: (value: OutputLanguage) => void;
  className?: string;
};

export function OptionLanguageSelect({
  value,
  onChange,
  className,
}: OptionLanguageSelectProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label
        htmlFor="option-language"
        className="text-xs text-gray-500 whitespace-nowrap">
        Option language
      </label>
      <select
        id="option-language"
        value={value}
        onChange={(e) => onChange(e.target.value as OutputLanguage)}
        className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
        <option value="English">English</option>
        <option value="Polish">Polish</option>
      </select>
    </div>
  );
}
