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
  /** Optional clothing label / tag photos for this group */
  clothingTags: File[];
  clothingTagPreviews: string[];
  selectedOptions: string[];
  /** null until the user's defaults load from /users/me */
  gender: GroupGender | null;
  type: GroupType | null;
};

export const newGroupId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export type GroupDefaults = {
  selectedOptions: string[];
  gender: GroupGender | null;
  type: GroupType | null;
};

/** Per-user defaults (from /users/me); set by the Home page once loaded. */
let groupDefaults: GroupDefaults = {
  selectedOptions: [],
  gender: null,
  type: null,
};

export function setGroupDefaults(next: GroupDefaults) {
  groupDefaults = { ...next, selectedOptions: [...next.selectedOptions] };
}

export function getGroupDefaults(): GroupDefaults {
  return { ...groupDefaults, selectedOptions: [...groupDefaults.selectedOptions] };
}

export function createEmptyGroup(): ImageGroup {
  return {
    id: newGroupId(),
    front: null,
    back: null,
    frontPreview: null,
    backPreview: null,
    clothingTags: [],
    clothingTagPreviews: [],
    selectedOptions: [...groupDefaults.selectedOptions],
    gender: groupDefaults.gender,
    type: groupDefaults.type,
  };
}

export function revokeGroupTagPreviews(group: ImageGroup) {
  for (const url of group.clothingTagPreviews) {
    if (url) URL.revokeObjectURL(url);
  }
}

export const IMAGE_ACCEPT = {
  "image/*": [".jpeg", ".png", ".jpg", ".webp"],
} as const;

export const IMAGE_ACCEPT_STRING =
  "image/jpeg,image/png,image/jpg,image/webp";
