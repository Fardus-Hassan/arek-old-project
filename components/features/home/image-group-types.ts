import { DEFAULT_GROUP_FEATURE_IDS } from "./feature-options";

export type GroupSlot = "front" | "back";

export type ImageGroup = {
  id: string;
  front: File | null;
  back: File | null;
  frontPreview: string | null;
  backPreview: string | null;
  selectedOptions: string[];
};

export const newGroupId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function createEmptyGroup(): ImageGroup {
  return {
    id: newGroupId(),
    front: null,
    back: null,
    frontPreview: null,
    backPreview: null,
    selectedOptions: [...DEFAULT_GROUP_FEATURE_IDS],
  };
}

export const IMAGE_ACCEPT = {
  "image/*": [".jpeg", ".png", ".jpg", ".webp"],
} as const;

export const IMAGE_ACCEPT_STRING =
  "image/jpeg,image/png,image/jpg,image/webp";
