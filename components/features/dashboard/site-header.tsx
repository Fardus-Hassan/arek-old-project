"use client";

import { SidebarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import DashboardLogo from "./DashboardLogo";
import DashboardUserBox from "./DashboardUserBox";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      className="sticky top-0 z-50 flex w-full items-center"
      style={{
        background:
          "linear-gradient(270.09deg, #E5BEEE -48.78%, #EEF6FF 132.36%)",
      }}>
      <div className="flex h-(--header-height) w-full items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}>
            <SidebarIcon />
          </Button>

          <Separator orientation="vertical" className="mr-2 h-8! bg-black/20" />

          {/* Logo */}
          <DashboardLogo />
        </div>

        <DashboardUserBox />
      </div>
    </header>
  );
}
