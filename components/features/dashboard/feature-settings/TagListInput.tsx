"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TagListInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function TagListInput({
  label,
  values,
  onChange,
  placeholder = "Type and press Enter",
  disabled = false,
  className,
}: TagListInputProps) {
  const [draft, setDraft] = useState("");

  const addValue = (raw: string) => {
    const next = raw.trim();
    if (!next) return;
    const exists = values.some((v) => v.toLowerCase() === next.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue(draft);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-900 border border-purple-100">
            {value}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="text-purple-400 hover:text-purple-700"
                aria-label={`Remove ${value}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="bg-white"
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !draft.trim()}
          onClick={() => addValue(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}
