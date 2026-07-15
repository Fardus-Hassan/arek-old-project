import { DEFAULT_GROUP_FEATURE_IDS } from "./feature-options";

export type GroupSlot = "front" | "back";

export const GROUP_GENDERS = ["male", "female"] as const;
export type GroupGender = (typeof GROUP_GENDERS)[number];

export const GROUP_TYPES = [
  "top",
  "bottom",
  "full-body",
  "head",
  "shoes",
] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const DEFAULT_GROUP_GENDER: GroupGender = "female";
export const DEFAULT_GROUP_TYPE: GroupType = "top";

export type ImageGroup = {
  id: string;
  front: File | null;
  back: File | null;
  frontPreview: string | null;
  backPreview: string | null;
  selectedOptions: string[];
  gender: GroupGender;
  type: GroupType;
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
    gender: DEFAULT_GROUP_GENDER,
    type: DEFAULT_GROUP_TYPE,
  };
}

export const IMAGE_ACCEPT = {
  "image/*": [".jpeg", ".png", ".jpg", ".webp"],
} as const;

export const IMAGE_ACCEPT_STRING =
  "image/jpeg,image/png,image/jpg,image/webp";
