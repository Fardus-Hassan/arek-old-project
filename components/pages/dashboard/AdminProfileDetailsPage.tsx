"use client";

import AdminDetailsCard from "@/components/features/dashboard/admin-profile/AdminDetailsCard";
import RecentActivity from "@/components/features/dashboard/admin-profile/RecentActivity";

export default function AdminProfileDetailsPage() {
  return (
    <div className="w-full">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4">
        Admin Profile
      </h1>

      <AdminDetailsCard />

      <RecentActivity />
    </div>
  );
}
