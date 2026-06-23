import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_USER_ROLE_KEY,
  COOKIE_MAX_AGE_SECONDS,
} from "./auth-constants";

function readCookie(raw: string, name: string): string | null {
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
  const m = raw.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setBrowserCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteBrowserCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Token for API headers: sessionStorage first, then cookie (e.g. new tab). */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromSession = sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  if (fromSession) return fromSession;
  return readCookie(document.cookie, AUTH_ACCESS_TOKEN_KEY);
}

export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  const fromSession = sessionStorage.getItem(AUTH_USER_ROLE_KEY);
  if (fromSession) return fromSession;
  return readCookie(document.cookie, AUTH_USER_ROLE_KEY);
}

export function persistAuthSession(token: string, role: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_USER_ROLE_KEY, role);
  setBrowserCookie(AUTH_ACCESS_TOKEN_KEY, token, COOKIE_MAX_AGE_SECONDS);
  setBrowserCookie(AUTH_USER_ROLE_KEY, role, COOKIE_MAX_AGE_SECONDS);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_ROLE_KEY);
  deleteBrowserCookie(AUTH_ACCESS_TOKEN_KEY);
  deleteBrowserCookie(AUTH_USER_ROLE_KEY);
}
