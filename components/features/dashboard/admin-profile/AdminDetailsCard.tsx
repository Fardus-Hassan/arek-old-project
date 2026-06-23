"use client";

import { useSearchParams } from "next/navigation";
import { useGetSingleAdminQuery } from "@/lib/api/adminApi";
import { DEFAULT_PROFILE_AVATAR, getProfileImageUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  valueColor = "#A825C7",
}) => {
  return (
    <div
      className="flex items-center justify-between w-full p-4 sm:p-6 rounded-xl gap-3 sm:gap-4"
      style={{
        boxShadow: "6px 6px 54px 0px #0000000D",
      }}>
      <h1 className="font-medium text-sm sm:text-base whitespace-nowrap">
        {label}
      </h1>
      <div className="h-[40px] sm:h-[50px] w-px bg-[#B5B5B5] flex-shrink-0"></div>
      <h1
        className="font-medium text-lg sm:text-2xl text-right"
        style={{ color: valueColor }}>
        {value}
      </h1>
    </div>
  );
};

export default function AdminDetailsCard() {
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id");
  const { data, isLoading } = useGetSingleAdminQuery(adminId ?? "", {
    skip: !adminId,
  });
  const admin = data?.data;
  const avatarSrc =
    getProfileImageUrl(admin?.image) ?? DEFAULT_PROFILE_AVATAR;

  const stats = [
    {
      label: "Since",
      value: admin?.createdAt
        ? new Date(admin.createdAt).toLocaleDateString()
        : "N/A",
    },
    { label: "Created Products", value: `${admin?.totalCreatedProducts ?? 0}` },
    { label: "Generated Images", value: `${admin?.totalGeneratedProducts ?? 0}` },
    { label: "Role", value: "ADMIN" },
  ];

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
          <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 rounded-full" />
          <div className="flex-1 w-full space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16">
        {/* Profile Image */}
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc}
            alt="Profile"
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-[240px] lg:h-[240px] rounded-full object-cover bg-gray-100"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src !== DEFAULT_PROFILE_AVATAR) {
                el.src = DEFAULT_PROFILE_AVATAR;
              }
            }}
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left sm:pt-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">
            {`${admin?.firstName ?? ""} ${admin?.lastName ?? ""}`.trim() || "Admin"}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-1 sm:mb-2 break-all">
            {admin?.email ?? "N/A"}
          </p>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-1 sm:mb-2">
            {admin?.phone ?? "N/A"}
          </p>
          <p className="text-base sm:text-lg md:text-xl text-gray-600">
            {admin?.location ?? "N/A"}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>
    </div>
  );
}
