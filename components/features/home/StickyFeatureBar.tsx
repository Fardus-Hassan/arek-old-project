"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FEATURE_OPTIONS } from "./feature-options";

type StickyFeatureBarProps = {
  groupCount: number;
  activeGroupIndex: number;
  onActiveGroupChange: (index: number) => void;
  selectedOptions: string[];
  onToggleOption: (id: string) => void;
  language: "English" | "Polish";
  onLanguageChange: (lang: "English" | "Polish") => void;
};

export function StickyFeatureBar({
  groupCount,
  activeGroupIndex,
  onActiveGroupChange,
  selectedOptions,
  onToggleOption,
  language,
  onLanguageChange,
}: StickyFeatureBarProps) {
  const canGoPrev = activeGroupIndex > 0;
  const canGoNext = activeGroupIndex < groupCount - 1;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-1">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => onActiveGroupChange(activeGroupIndex - 1)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous group">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-900 min-w-[7rem] text-center">
              Group {activeGroupIndex + 1} of {groupCount}
            </span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => onActiveGroupChange(activeGroupIndex + 1)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next group">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Output language
            </span>
            <select
              value={language}
              onChange={(e) =>
                onLanguageChange(e.target.value as "English" | "Polish")
              }
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300">
              <option value="English">English</option>
              <option value="Polish">Polish</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {FEATURE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedOptions.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggleOption(option.id)}
                className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border-2 transition-all bg-white min-h-[56px] sm:min-h-[64px]
                  ${isSelected ? "border-[#A825C7] bg-[#F9F1FB]" : "border-[#E5BEEE] hover:border-purple-200"}
                `}>
                <Icon
                  size={16}
                  className={`mb-1 ${isSelected ? "text-[#A825C7]" : "text-slate-400"}`}
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-bold text-center leading-tight line-clamp-2
                    ${isSelected ? "text-slate-900" : "text-slate-400"}
                  `}>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
