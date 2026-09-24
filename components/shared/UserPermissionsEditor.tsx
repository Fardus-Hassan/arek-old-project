"use client";

import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  API_GENDER_OPTIONS,
  API_TYPE_OPTIONS,
  PERMISSION_FLAGS,
  type UserPermissionsPayload,
} from "@/lib/user-permissions";

type UserPermissionsEditorProps = {
  value: UserPermissionsPayload;
  onChange: (next: UserPermissionsPayload) => void;
  disabled?: boolean;
  className?: string;
};

function SegmentGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-700 font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-[#A825C7] bg-[#F9F1FB] text-[#A825C7]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-purple-200",
                disabled && "cursor-not-allowed opacity-60",
              )}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function UserPermissionsEditor({
  value,
  onChange,
  disabled,
  className,
}: UserPermissionsEditorProps) {
  const set = <K extends keyof UserPermissionsPayload>(
    key: K,
    v: UserPermissionsPayload[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SegmentGroup
          label="Default gender"
          options={API_GENDER_OPTIONS}
          value={value.gender}
          onChange={(v) => set("gender", v)}
          disabled={disabled}
        />
        <SegmentGroup
          label="Default type"
          options={API_TYPE_OPTIONS}
          value={value.type}
          onChange={(v) => set("type", v)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">Feature permissions</Label>
        <p className="text-xs text-gray-500">
          Granted features are pre-selected on the Home page.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERMISSION_FLAGS.map((flag) => {
            const on = value[flag.key];
            return (
              <button
                key={flag.key}
                type="button"
                disabled={disabled}
                onClick={() => set(flag.key, !on)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  on
                    ? "border-[#A825C7] bg-[#F9F1FB] text-gray-900"
                    : "border-gray-200 bg-white text-gray-500 hover:border-purple-200",
                  disabled && "cursor-not-allowed opacity-60",
                )}>
                <span className="font-medium">{flag.label}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    on ? "border-[#A825C7] bg-[#A825C7] text-white" : "border-gray-300",
                  )}>
                  {on ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => set("is_full_access", !value.is_full_access)}
        className={cn(
          "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
          value.is_full_access
            ? "border-[#A825C7] bg-[#F9F1FB]"
            : "border-gray-200 bg-white hover:border-purple-200",
          disabled && "cursor-not-allowed opacity-60",
        )}>
        <span>
          <span className="block text-sm font-semibold text-gray-900">
            Full access
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Can also select features outside the granted list. Admins always
            can.
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
            value.is_full_access
              ? "border-[#A825C7] bg-[#A825C7] text-white"
              : "border-gray-300",
          )}>
          {value.is_full_access ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </button>
    </div>
  );
}
