import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Generic user silhouette when `image` is null/empty or fails to load. */
export const DEFAULT_PROFILE_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23e5e7eb'/><circle cx='40' cy='30' r='14' fill='%239ca3af'/><rect x='18' y='50' width='44' height='22' rx='11' fill='%239ca3af'/></svg>";

/** Resolve relative profile image paths from the API host. */
export function getProfileImageUrl(
  image: string | null | undefined,
): string | undefined {
  if (image == null) return undefined;
  const trimmed = typeof image === "string" ? image.trim() : String(image).trim();
  if (!trimmed || trimmed === "null") return undefined;
  if (trimmed.startsWith("http")) return trimmed;
  const base =
    process.env.NEXT_PUBLIC_API_URL ?? "http://187.124.176.94:5555/api/v1";
  try {
    const origin = new URL(base).origin;
    return trimmed.startsWith("/")
      ? `${origin}${trimmed}`
      : `${origin}/${trimmed}`;
  } catch {
    return trimmed;
  }
}
