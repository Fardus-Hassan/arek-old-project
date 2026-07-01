"use client";

import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  User,
  FileText,
  Shield,
  LogOut,
  FolderOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/shared/Logo";
import { useAppDispatch } from "@/lib/hooks";
import { authApi } from "@/lib/api/authApi";
import { userApi } from "@/lib/api/userApi";
import { adminApi } from "@/lib/api/adminApi";
import { documentApi } from "@/lib/api/documentApi";
import { fileSaveApi } from "@/lib/api/fileSaveApi";
import { featureApi } from "@/lib/api/featureApi";
import { LOGIN_PATH, ROLE_SUPERADMIN } from "@/lib/auth-constants";
import { clearAuthSession, getUserRole } from "@/lib/auth-session";

const allNavigationItems = [
  {
    label: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    superAdminOnly: true,
  },
  {
    label: "My Profile",
    href: "/dashboard/admin/profile",
    icon: User,
    superAdminOnly: false,
  },
  {
    label: "My Document",
    href: "/dashboard/admin/documents",
    icon: FileText,
    superAdminOnly: false,
  },
  {
    label: "My Saved Files",
    href: "/dashboard/admin/saved-files",
    icon: FolderOpen,
    superAdminOnly: false,
  },
  {
    label: "Admin Management",
    href: "/dashboard/admin/admin-management",
    icon: Shield,
    superAdminOnly: true,
  },
  {
    label: "Feature Settings",
    href: "/dashboard/admin/feature-settings",
    icon: Settings,
    superAdminOnly: true,
  },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRole(getUserRole());
  }, []);

  const isSuperAdmin = role === ROLE_SUPERADMIN;

  const navigationItems = React.useMemo(
    () =>
      allNavigationItems.filter(
        (item) => !item.superAdminOnly || isSuperAdmin,
      ),
    [isSuperAdmin],
  );

  const onLogout = () => {
    clearAuthSession();
    dispatch(authApi.util.resetApiState());
    dispatch(userApi.util.resetApiState());
    dispatch(adminApi.util.resetApiState());
    dispatch(documentApi.util.resetApiState());
    dispatch(fileSaveApi.util.resetApiState());
    dispatch(featureApi.util.resetApiState());
    router.push(LOGIN_PATH);
  };

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}>
      <SidebarContent>
        <SidebarHeader className="md:hidden ml-2">
          <Logo />
        </SidebarHeader>
        <SidebarMenu className="gap-3 px-2 py-4">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  size="lg"
                  asChild
                  isActive={isActive}
                  className="hover:bg-accent hover:text-accent-foreground transition-colors data-[active=true]:bg-[#A825C7] data-[active=true]:text-white font-medium  text-gray-700">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 p-4">
                    <item.icon
                      className={`h-6! w-6! text-[#61758A] ${isActive && "text-white"}`}
                    />
                    <span className="font-medium text-base">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-base font-medium bg-gray-100 hover:text-white bg-[rgba(255, 74, 74, 0.5)] hover:bg-[#FF4A4A] rounded-md transition-colors focus:outline-none text-[#FF4A4A]"
        >
          <LogOut className="h-6 w-6" />
          Logout
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
