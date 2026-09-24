export type ApiGender = "MALE" | "FEMALE";
export type ApiGarmentType = "TOP" | "BOTTOM" | "FULL_BODY" | "HEAD" | "SHOES";
export type ApiUserRole = "USER" | "ADMIN" | "SUPERADMIN";

export type PermissionFlagKey =
  | "is_dimensions"
  | "is_ai_virtual"
  | "is_mannequin"
  | "is_background_removal"
  | "is_model"
  | "is_image_diagram";

export type UserPermissionFields = {
  role?: string | null;
  gender?: string | null;
  type?: string | null;
  is_dimensions?: boolean | null;
  is_ai_virtual?: boolean | null;
  is_mannequin?: boolean | null;
  is_background_removal?: boolean | null;
  is_model?: boolean | null;
  is_image_diagram?: boolean | null;
  is_full_access?: boolean | null;
};

/** Editable permission payload sent to add-admin / update-user. */
export type UserPermissionsPayload = {
  gender: ApiGender;
  type: ApiGarmentType;
  is_dimensions: boolean;
  is_ai_virtual: boolean;
  is_mannequin: boolean;
  is_background_removal: boolean;
  is_model: boolean;
  is_image_diagram: boolean;
  is_full_access: boolean;
};

/** Home feature option id ↔ API permission flag. */
export const PERMISSION_FLAGS: {
  key: PermissionFlagKey;
  featureId: string;
  label: string;
}[] = [
  { key: "is_dimensions", featureId: "dimensions", label: "Physical Dimensions" },
  { key: "is_ai_virtual", featureId: "try-on", label: "AI virtual try-on" },
  { key: "is_mannequin", featureId: "mannequin", label: "Mannequin" },
  { key: "is_background_removal", featureId: "removal", label: "Background removal" },
  { key: "is_model", featureId: "model", label: "Model" },
  { key: "is_image_diagram", featureId: "diagram", label: "Image diagram" },
];

export const API_GENDER_OPTIONS: { value: ApiGender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export const API_TYPE_OPTIONS: { value: ApiGarmentType; label: string }[] = [
  { value: "TOP", label: "Top" },
  { value: "BOTTOM", label: "Bottom" },
  { value: "FULL_BODY", label: "Full-Body" },
  { value: "HEAD", label: "Head" },
  { value: "SHOES", label: "Shoes" },
];

export function isAdminRole(role: string | null | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUPERADMIN";
}

/** USER without full access can only use the features they were granted. */
export function canSelectAnyFeature(user: UserPermissionFields | null | undefined): boolean {
  if (!user) return true;
  return isAdminRole(user.role) || Boolean(user.is_full_access);
}

export function grantedFeatureIds(user: UserPermissionFields | null | undefined): string[] {
  if (!user) return [];
  return PERMISSION_FLAGS.filter((f) => Boolean(user[f.key])).map((f) => f.featureId);
}

export function toGroupGender(
  gender: string | null | undefined,
): "male" | "female" | null {
  const g = String(gender ?? "").toUpperCase();
  if (g === "MALE") return "male";
  if (g === "FEMALE") return "female";
  return null;
}

export function toGroupType(
  type: string | null | undefined,
): "top" | "bottom" | "full-body" | "head" | "shoes" | null {
  switch (String(type ?? "").toUpperCase()) {
    case "TOP":
      return "top";
    case "BOTTOM":
      return "bottom";
    case "FULL_BODY":
      return "full-body";
    case "HEAD":
      return "head";
    case "SHOES":
      return "shoes";
    default:
      return null;
  }
}

function normalizeApiGender(gender: string | null | undefined): ApiGender {
  return String(gender ?? "").toUpperCase() === "MALE" ? "MALE" : "FEMALE";
}

function normalizeApiType(type: string | null | undefined): ApiGarmentType {
  const t = String(type ?? "").toUpperCase();
  return (API_TYPE_OPTIONS.find((o) => o.value === t)?.value ?? "TOP") as ApiGarmentType;
}

export function permissionsFromUser(
  user: UserPermissionFields | null | undefined,
): UserPermissionsPayload {
  return {
    gender: normalizeApiGender(user?.gender),
    type: normalizeApiType(user?.type),
    is_dimensions: Boolean(user?.is_dimensions),
    is_ai_virtual: Boolean(user?.is_ai_virtual),
    is_mannequin: Boolean(user?.is_mannequin),
    is_background_removal: Boolean(user?.is_background_removal),
    is_model: Boolean(user?.is_model),
    is_image_diagram: Boolean(user?.is_image_diagram),
    is_full_access: Boolean(user?.is_full_access),
  };
}

export const EMPTY_PERMISSIONS: UserPermissionsPayload = permissionsFromUser(null);
