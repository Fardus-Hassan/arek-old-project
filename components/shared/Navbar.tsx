"use client";

import Logo from "./Logo";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/authApi";
import { useGetMeQuery, userApi } from "@/lib/api/userApi";
import { adminApi } from "@/lib/api/adminApi";
import { documentApi } from "@/lib/api/documentApi";
import { DEFAULT_PROFILE_AVATAR, getProfileImageUrl } from "@/lib/utils";
import { useAppDispatch, useIsClient } from "@/lib/hooks";
import { LOGIN_PATH, ROLE_SUPERADMIN } from "@/lib/auth-constants";
import { clearAuthSession, getAccessToken, getUserRole } from "@/lib/auth-session";

export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isScrolled, setIsScrolled] = useState(false);
  const isClient = useIsClient();
  const hasToken = isClient && !!getAccessToken();
  const role = isClient ? getUserRole() : null;
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard/admin/profile", label: "Profile" },
    ...(role === ROLE_SUPERADMIN
      ? [{ href: "/dashboard/admin", label: "Dashboard" } as const]
      : []),
  ];
  const { data } = useGetMeQuery(undefined, { skip: !hasToken });
  const profileImage =
    getProfileImageUrl(data?.data?.image) ?? DEFAULT_PROFILE_AVATAR;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    dispatch(authApi.util.resetApiState());
    dispatch(userApi.util.resetApiState());
    dispatch(adminApi.util.resetApiState());
    dispatch(documentApi.util.resetApiState());
    router.push(LOGIN_PATH);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80 transition-shadow duration-200 ${
        isScrolled ? "shadow-sm" : ""
      }`}>
      <div className="mx-auto max-w-7xl">
        <div className="flex h-20 items-center justify-between px-5">
          {/* Logo */}
          <div className="shrink-0">
            <Logo />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="bg-[#EEEEEE] p-1.5 rounded-xl flex items-center gap-3 hover:bg-[#E5E5E5] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                aria-label="User menu">
                <div className="rounded-full border-2 border-[#FAFAFA] overflow-hidden w-10 h-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="rounded-full object-cover object-center"
                    src={profileImage}
                    width={40}
                    height={40}
                    alt="user-profile"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== DEFAULT_PROFILE_AVATAR) {
                        img.src = DEFAULT_PROFILE_AVATAR;
                      }
                    }}
                  />
                </div>
                <MenuIcon className="h-5 w-5 text-gray-800" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-56 mt-2"
              align="end"
              sideOffset={5}>
              <DropdownMenuLabel className="font-semibold">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                {navLinks.map((link, i) => (
                  <DropdownMenuItem key={i} asChild>
                    <Link href={link.href} className="cursor-pointer">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-purple-500 focus:text-purple-600 focus:bg-red-50 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
