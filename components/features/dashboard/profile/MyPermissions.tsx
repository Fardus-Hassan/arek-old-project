"use client";

import { UserPermissionsCard } from "@/components/shared/UserPermissionsCard";
import { useGetMeQuery } from "@/lib/api/userApi";
import { getAccessToken } from "@/lib/auth-session";
import { useIsClient } from "@/lib/hooks";
import { isAdminRole } from "@/lib/user-permissions";

/** Admins / superadmins manage their own Home defaults here. */
export default function MyPermissions() {
  const isClient = useIsClient();
  const hasToken = isClient && !!getAccessToken();
  const { data } = useGetMeQuery(undefined, { skip: !hasToken });
  const me = data?.data;

  if (!me?.id || !isAdminRole(me.role)) return null;

  return <UserPermissionsCard userId={me.id} user={me} isSelf />;
}
