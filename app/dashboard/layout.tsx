import DashboardLayout from "@/components/layouts/DashboardLayout";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
