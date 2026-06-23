import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_DASHBOARD_FALLBACK,
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_USER_ROLE_KEY,
  isSuperAdminOnlyDashboardPath,
  LANDING_PATH,
  LOGIN_PATH,
  ROLE_SUPERADMIN,
} from "@/lib/auth-constants";

function isStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/images/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_ACCESS_TOKEN_KEY)?.value;
  const role = request.cookies.get(AUTH_USER_ROLE_KEY)?.value ?? "";

  const isLoginRoute = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

  if (isLoginRoute) {
    if (token) {
      return NextResponse.redirect(new URL(LANDING_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (isSuperAdminOnlyDashboardPath(pathname) && role !== ROLE_SUPERADMIN) {
    return NextResponse.redirect(new URL(ADMIN_DASHBOARD_FALLBACK, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
