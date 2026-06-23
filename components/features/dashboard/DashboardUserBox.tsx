"use client";

import { useGetMeQuery } from "@/lib/api/userApi";
import {
  DEFAULT_PROFILE_AVATAR,
  getProfileImageUrl,
} from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth-session";

export default function DashboardUserBox() {
  const isClient = useIsClient();
  const hasToken = isClient && !!getAccessToken();

  const { data, isLoading } = useGetMeQuery(undefined, { skip: !hasToken });

  const me = data?.data;
  const name = me
    ? `${me.firstName} ${me.lastName}`.trim() || "User"
    : "…";
  const role = me?.role ?? "…";
  const avatarSrc =
    getProfileImageUrl(me?.image) ?? DEFAULT_PROFILE_AVATAR;

  return (
    <div className="bg-white w-auto rounded">
      <div className="h-[58px] flex items-center justify-center px-2 sm:px-4">
        <div className="flex items-center justify-start gap-1.5 sm:gap-2">
          {isLoading ? (
            <Skeleton className="rounded-full w-9 h-9" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="rounded-full w-9 h-9 object-cover bg-gray-100"
              src={avatarSrc}
              alt=""
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src !== DEFAULT_PROFILE_AVATAR) {
                  el.src = DEFAULT_PROFILE_AVATAR;
                }
              }}
            />
          )}
          <div className="flex flex-col items-start min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <h1 className="text-sm sm:text-base text-primary2 truncate max-w-[120px] sm:max-w-none">
                  {name}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-subtle">{role}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
