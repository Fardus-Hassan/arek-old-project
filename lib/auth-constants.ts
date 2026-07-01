/** Cookie + sessionStorage keys (must match across client and middleware). */
export const AUTH_ACCESS_TOKEN_KEY = "accessToken";
export const AUTH_USER_ROLE_KEY = "userRole";

export const ROLE_SUPERADMIN = "SUPERADMIN";

export const LOGIN_PATH = "/login";

/** After login and when already signed-in users open `/login`. */
export const LANDING_PATH = "/";

/** ADMIN redirected here if they hit SUPERADMIN-only dashboard URLs. */
export const ADMIN_DASHBOARD_FALLBACK = "/dashboard/admin/profile";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export { COOKIE_MAX_AGE_SECONDS };

/** Overview + admin management + feature settings — SUPERADMIN only. */
export function isSuperAdminOnlyDashboardPath(pathname: string): boolean {
  if (pathname === "/dashboard/admin") return true;
  if (pathname.startsWith("/dashboard/admin/admin-management")) return true;
  if (pathname.startsWith("/dashboard/admin/feature-settings")) return true;
  return false;
}
